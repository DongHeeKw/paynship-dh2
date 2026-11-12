'use client';

import { useEffect, useRef, useState } from 'react';
import HarborScene from './HarborScene';
import type { ParcelScene, ParcelSceneState } from './parcel-scene';
import './parcel-world.css';

export default function ParcelWorld(props: ParcelSceneState) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ParcelScene | null>(null);
  const state = useRef(props);
  const [ready, setReady] = useState(false);
  state.current = props;

  useEffect(() => {
    let cancelled = false;
    // Keep WebGL and Three.js out of the initial page bundle. The illustration
    // is already visible and the product form works while this loads.
    import('./parcel-scene').then(({ createParcelScene }) => {
      if (cancelled || !host.current) return;
      scene.current = createParcelScene(host.current, state.current,
        () => { if (!cancelled) setReady(false); },
        () => { if (!cancelled) setReady(true); });
    }).catch(() => { if (!cancelled) setReady(false); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => { scene.current?.update(state.current); }, [props.focused, props.packed, props.label]);

  return <div className={`parcel-world${ready ? ' is-ready' : ''}`}>
    <div className="parcel-world-stage" aria-hidden="true">
      <div className="parcel-world-halo" />
      <div className="parcel-world-fallback"><HarborScene {...props} /></div>
      <div className="parcel-world-canvas" ref={host} />
      <div className="parcel-world-origin"><span className="parcel-world-dot" />SEOUL, WITH LOVE<span>YOUR FIND STARTS HERE</span></div>
      <div className="parcel-world-label"><span>ONE LITTLE LINK</span><strong>A world closer.</strong><svg width="35" height="35" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.7" /></svg></div>
    </div>
    <div className="parcel-world-caption">
      <span>A little imagination. A long journey.<small>Illustration · not shipment tracking</small></span>
      {ready && <div className="parcel-world-controls" role="group" aria-label="Rotate the parcel illustration">
        <button type="button" onClick={() => scene.current?.rotate(-1)} aria-label="Turn parcel left">←</button>
        <button type="button" onClick={() => scene.current?.rotate(1)} aria-label="Turn parcel right">→</button>
      </div>}
    </div>
  </div>;
}
