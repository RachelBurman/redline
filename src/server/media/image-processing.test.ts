import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'

import { inspectImage, sanitiseImage, UnsafeMediaError } from './image-processing'
import { assertMalwareScanClean } from './malware-scanner'

function png(width = 2, height = 2) {
  const image = new PNG({ width, height })
  image.data.fill(255)
  return new Uint8Array(PNG.sync.write(image))
}

function jpegImage(width = 2, height = 2) {
  return new Uint8Array(
    jpeg.encode({ data: new Uint8Array(width * height * 4).fill(255), width, height }, 90).data,
  )
}

function insertBeforePngEnd(bytes: Uint8Array, chunk: Uint8Array) {
  let endOffset = -1
  for (let index = 8; index < bytes.length - 7; index += 1) {
    if (Buffer.from(bytes.subarray(index + 4, index + 8)).toString('ascii') === 'IEND') {
      endOffset = index
      break
    }
  }
  if (endOffset < 0) throw new Error('PNG end chunk was not found.')
  return new Uint8Array(
    Buffer.concat([bytes.subarray(0, endOffset), chunk, bytes.subarray(endOffset)]),
  )
}

describe('safe image processing', () => {
  it('recognises formats from decoded bytes rather than client metadata', () => {
    expect(inspectImage(png())).toMatchObject({ mimeType: 'image/png', width: 2, height: 2 })
    expect(inspectImage(jpegImage())).toMatchObject({ mimeType: 'image/jpeg', width: 2, height: 2 })
  })

  it('rejects SVG and trailing polyglot content precisely', () => {
    expect(() =>
      inspectImage(new TextEncoder().encode('<svg><script>alert(1)</script></svg>')),
    ).toThrow('Only static PNG and JPEG images are supported')
    const polyglot = new Uint8Array(
      Buffer.concat([png(), Buffer.from('<script>alert(1)</script>')]),
    )
    expect(() => inspectImage(polyglot)).toThrow('trailing content')
  })

  it('rejects animated PNG content before decoding', () => {
    const animationChunk = Buffer.from([0, 0, 0, 0, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 0])
    expect(() => inspectImage(insertBeforePngEnd(png(), animationChunk))).toThrow(
      'Animated PNG files are not supported',
    )
  })

  it('rejects decompression-bomb dimensions before allocating decoded pixels', () => {
    const oversized = png()
    new DataView(oversized.buffer, oversized.byteOffset, oversized.byteLength).setUint32(16, 10_001)
    expect(() => inspectImage(oversized)).toThrow('at most 10,000 pixels')
  })

  it('re-encodes JPEG pixels without embedded metadata', () => {
    const original = jpegImage()
    const secret = Buffer.from('private-exif-location')
    const appSegment = Buffer.concat([Buffer.from([0xff, 0xe1, 0, secret.length + 2]), secret])
    const withMetadata = new Uint8Array(
      Buffer.concat([original.subarray(0, 2), appSegment, original.subarray(2)]),
    )
    const processed = sanitiseImage(withMetadata)

    expect(Buffer.from(processed.sanitisedBytes).includes(secret)).toBe(false)
    expect(processed).toMatchObject({ mimeType: 'image/jpeg', width: 2, height: 2 })
  })

  it('quarantines the standard malware test signature', async () => {
    await expect(
      assertMalwareScanClean(new TextEncoder().encode('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')),
    ).rejects.toMatchObject<Partial<UnsafeMediaError>>({ code: 'MALWARE_DETECTED' })
  })
})
