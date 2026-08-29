import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function nextConfig(phase: string): NextConfig {
  return {
    // Keep production builds from deleting an active dev server's manifests.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-build',
  };
}
