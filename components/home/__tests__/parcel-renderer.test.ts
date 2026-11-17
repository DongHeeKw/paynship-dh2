// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGLRenderer } from 'three';
import { createParcelRenderer } from '../parcel-renderer';

vi.mock('three', () => ({ WebGLRenderer: vi.fn(function () {}) }));
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('parcel renderer availability', () => {
  it('does not construct Three.js when the browser returns no WebGL2 context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(createParcelRenderer()).toBeNull();
    expect(WebGLRenderer).not.toHaveBeenCalled();
  });
  it('does not construct Three.js when the driver throws while binding a context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('BindToCurrentSequence failed'); });
    expect(createParcelRenderer()).toBeNull();
    expect(WebGLRenderer).not.toHaveBeenCalled();
  });
  it('passes the successfully acquired context and canvas to Three.js without probing twice', () => {
    const context = {} as WebGL2RenderingContext;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    expect(createParcelRenderer()).not.toBeNull();
    expect(getContext).toHaveBeenCalledExactlyOnceWith('webgl2', expect.objectContaining({ alpha: true, antialias: true }));
    expect(WebGLRenderer).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ canvas: expect.any(HTMLCanvasElement), context }));
  });
});
