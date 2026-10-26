import { performance } from 'node:perf_hooks'

import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'

import type { RichMediaMimeType } from '#/types/rich-media'

export const MEDIA_LIMITS = {
  compressedBytes: 10 * 1024 * 1024,
  decodedBytes: 100 * 1024 * 1024,
  maxDimension: 10_000,
  maxPixels: 25_000_000,
  processingMilliseconds: 10_000,
  previewMaxDimension: 1_200,
} as const

export class UnsafeMediaError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'EMPTY_FILE'
      | 'FILE_TOO_LARGE'
      | 'UNSUPPORTED_FORMAT'
      | 'MALFORMED_IMAGE'
      | 'ANIMATED_IMAGE'
      | 'DIMENSIONS_EXCEEDED'
      | 'DECODED_SIZE_EXCEEDED'
      | 'PROCESSING_TIMEOUT'
      | 'MALWARE_DETECTED',
  ) {
    super(message)
    this.name = 'UnsafeMediaError'
  }
}

interface ImageMetadata {
  mimeType: RichMediaMimeType
  width: number
  height: number
}

function assertDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MEDIA_LIMITS.maxDimension ||
    height > MEDIA_LIMITS.maxDimension ||
    width * height > MEDIA_LIMITS.maxPixels
  ) {
    throw new UnsafeMediaError(
      `Images must be at most ${MEDIA_LIMITS.maxDimension.toLocaleString()} pixels on each side and ${MEDIA_LIMITS.maxPixels.toLocaleString()} pixels in total.`,
      'DIMENSIONS_EXCEEDED',
    )
  }

  if (width * height * 4 > MEDIA_LIMITS.decodedBytes) {
    throw new UnsafeMediaError(
      'The decoded image would exceed the safe memory limit.',
      'DECODED_SIZE_EXCEEDED',
    )
  }
}

function readPngMetadata(bytes: Uint8Array): ImageMetadata | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!signature.every((value, index) => bytes[index] === value)) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  let width = 0
  let height = 0
  let foundEnd = false

  while (offset + 12 <= bytes.byteLength) {
    const length = view.getUint32(offset)
    const chunkEnd = offset + 12 + length
    if (chunkEnd > bytes.byteLength) {
      throw new UnsafeMediaError('The PNG contains a truncated chunk.', 'MALFORMED_IMAGE')
    }
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) {
        throw new UnsafeMediaError('The PNG header is malformed.', 'MALFORMED_IMAGE')
      }
      width = view.getUint32(offset + 8)
      height = view.getUint32(offset + 12)
    }
    if (type === 'acTL') {
      throw new UnsafeMediaError('Animated PNG files are not supported.', 'ANIMATED_IMAGE')
    }
    offset = chunkEnd
    if (type === 'IEND') {
      foundEnd = true
      break
    }
  }

  if (!foundEnd || offset !== bytes.byteLength || width === 0 || height === 0) {
    throw new UnsafeMediaError(
      'The PNG is malformed or contains trailing content.',
      'MALFORMED_IMAGE',
    )
  }
  assertDimensions(width, height)
  return { mimeType: 'image/png', width, height }
}

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function readJpegMetadata(bytes: Uint8Array): ImageMetadata | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  if (bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw new UnsafeMediaError(
      'The JPEG is incomplete or contains trailing content.',
      'MALFORMED_IMAGE',
    )
  }

  let offset = 2
  let width = 0
  let height = 0
  while (offset < bytes.byteLength - 2) {
    if (bytes[offset] !== 0xff) {
      throw new UnsafeMediaError('The JPEG marker stream is malformed.', 'MALFORMED_IMAGE')
    }
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset++]
    if (marker === undefined) break
    if (marker === 0xd9) break
    if (marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > bytes.byteLength) break
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!
    if (length < 2 || offset + length > bytes.byteLength) {
      throw new UnsafeMediaError('The JPEG contains a truncated segment.', 'MALFORMED_IMAGE')
    }
    if (jpegStartOfFrameMarkers.has(marker)) {
      if (length < 7) throw new UnsafeMediaError('The JPEG frame is malformed.', 'MALFORMED_IMAGE')
      height = (bytes[offset + 3]! << 8) | bytes[offset + 4]!
      width = (bytes[offset + 5]! << 8) | bytes[offset + 6]!
      break
    }
    offset += length
  }

  if (width === 0 || height === 0) {
    throw new UnsafeMediaError('The JPEG has no supported image frame.', 'MALFORMED_IMAGE')
  }
  assertDimensions(width, height)
  return { mimeType: 'image/jpeg', width, height }
}

export function inspectImage(bytes: Uint8Array): ImageMetadata {
  if (bytes.byteLength === 0) throw new UnsafeMediaError('Choose a non-empty image.', 'EMPTY_FILE')
  if (bytes.byteLength > MEDIA_LIMITS.compressedBytes) {
    throw new UnsafeMediaError('Images must be 10 MB or smaller.', 'FILE_TOO_LARGE')
  }

  const metadata = readPngMetadata(bytes) ?? readJpegMetadata(bytes)
  if (!metadata) {
    throw new UnsafeMediaError(
      'Only static PNG and JPEG images are supported. SVG, HTML, and executable graph formats are rejected.',
      'UNSUPPORTED_FORMAT',
    )
  }
  return metadata
}

function resizeRgba(input: Uint8Array, width: number, height: number) {
  const scale = Math.min(1, MEDIA_LIMITS.previewMaxDimension / Math.max(width, height))
  const previewWidth = Math.max(1, Math.round(width * scale))
  const previewHeight = Math.max(1, Math.round(height * scale))
  if (scale === 1) return { data: input, width, height }

  const output = new Uint8Array(previewWidth * previewHeight * 4)
  for (let y = 0; y < previewHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor(y / scale))
    for (let x = 0; x < previewWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor(x / scale))
      const sourceOffset = (sourceY * width + sourceX) * 4
      const outputOffset = (y * previewWidth + x) * 4
      output.set(input.subarray(sourceOffset, sourceOffset + 4), outputOffset)
    }
  }
  return { data: output, width: previewWidth, height: previewHeight }
}

export function sanitiseImage(bytes: Uint8Array) {
  const startedAt = performance.now()
  const metadata = inspectImage(bytes)
  let rgba: Uint8Array

  try {
    if (metadata.mimeType === 'image/png') {
      rgba = PNG.sync.read(Buffer.from(bytes), {
        checkCRC: true,
        skipRescale: false,
      }).data
    } else {
      rgba = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true }).data
    }
  } catch (error) {
    throw new UnsafeMediaError(
      `The image could not be decoded safely: ${error instanceof Error ? error.message : 'invalid image data'}`,
      'MALFORMED_IMAGE',
    )
  }

  if (rgba.byteLength > MEDIA_LIMITS.decodedBytes) {
    throw new UnsafeMediaError(
      'The decoded image exceeds the safe memory limit.',
      'DECODED_SIZE_EXCEEDED',
    )
  }

  const preview = resizeRgba(rgba, metadata.width, metadata.height)
  const encode = (data: Uint8Array, width: number, height: number) => {
    if (metadata.mimeType === 'image/jpeg') return jpeg.encode({ data, width, height }, 90).data
    const png = new PNG({ width, height })
    png.data = Buffer.from(data)
    return PNG.sync.write(png, { colorType: 6 })
  }
  const sanitisedBytes = encode(rgba, metadata.width, metadata.height)
  const previewBytes = encode(preview.data, preview.width, preview.height)

  if (performance.now() - startedAt > MEDIA_LIMITS.processingMilliseconds) {
    throw new UnsafeMediaError(
      'Image processing exceeded the safe time limit.',
      'PROCESSING_TIMEOUT',
    )
  }

  return {
    ...metadata,
    sanitisedBytes: new Uint8Array(sanitisedBytes),
    previewBytes: new Uint8Array(previewBytes),
    previewWidth: preview.width,
    previewHeight: preview.height,
  }
}
