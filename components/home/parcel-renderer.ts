import { WebGLRenderer } from 'three';

/** Acquire the actual context before Three.js attaches its noisy failure handlers. */
export function createParcelRenderer(): WebGLRenderer | null {
  const canvas = document.createElement('canvas');
  const options: WebGLContextAttributes = { alpha: true, antialias: true, powerPreference: 'low-power' };
  let context: WebGL2RenderingContext | null;
  try { context = canvas.getContext('webgl2', options); }
  catch { return null; }
  if (!context) return null;
  // Reuse this context: a second probe can fail on constrained/disabled GPUs.
  return new WebGLRenderer({ canvas, context, ...options });
}
