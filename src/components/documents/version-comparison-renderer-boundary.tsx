import { Component } from 'react'

import { VersionComparisonBlock } from './version-comparison-block'

import type { VersionComparisonBlock as ComparisonBlock } from '#/types/document-versions'
import type { ErrorInfo, ReactNode } from 'react'

interface VersionComparisonRendererBoundaryProps {
  baseVersionNumber: number
  children: ReactNode
  fallbackBlock: ComparisonBlock
  targetVersionNumber: number
}

interface VersionComparisonRendererBoundaryState {
  failed: boolean
}

export class VersionComparisonRendererBoundary extends Component<
  VersionComparisonRendererBoundaryProps,
  VersionComparisonRendererBoundaryState
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // The application-owned structured block supplied below remains readable.
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <VersionComparisonBlock
        baseVersionNumber={this.props.baseVersionNumber}
        block={this.props.fallbackBlock}
        targetVersionNumber={this.props.targetVersionNumber}
      />
    )
  }
}
