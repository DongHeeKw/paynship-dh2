// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
const renderer = vi.hoisted(() => ({ create: vi.fn(), dispose: vi.fn() }));
vi.mock('../parcel-scene', () => ({ createParcelScene: renderer.create }));
import ParcelWorld from '../ParcelWorld';

const state = { focused: false, packed: false, label: 'YOUR NEXT FIND' };
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('includes the matching studio poster in initial HTML before WebGL can load', () => {
  const html = renderToString(<ParcelWorld {...state} />);
  expect(html).toContain('/images/parcel-studio-poster.webp');
  expect(html).not.toContain('loading="lazy"');
  expect(renderer.create).not.toHaveBeenCalled();
});

it('keeps the poster until the first rendered frame and restores it after context loss', async () => {
  let ready!: () => void; let unavailable!: () => void;
  renderer.create.mockImplementation((_host, _state, onUnavailable, onReady) => {
    ready = onReady; unavailable = onUnavailable;
    return { update: vi.fn(), dispose: renderer.dispose };
  });
  const view = render(<ParcelWorld {...state} />);
  await waitFor(() => expect(renderer.create).toHaveBeenCalledOnce());
  expect(view.container.querySelector('.parcel-world-fallback img')).not.toBeNull();
  expect(view.container.querySelector('.is-ready')).toBeNull();
  act(() => ready());
  expect(view.container.querySelector('.is-ready')).not.toBeNull();
  act(() => unavailable());
  expect(view.container.querySelector('.is-ready')).toBeNull();
  expect(view.container.querySelector('.parcel-world-fallback img')).not.toBeNull();
  view.unmount(); expect(renderer.dispose).toHaveBeenCalledOnce();
});
