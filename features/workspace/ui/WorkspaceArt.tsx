import type { CSSProperties } from 'react';

export type WorkspaceIconName = 'home' | 'orders' | 'wallet' | 'delivery' | 'account' | 'arrow' | 'plus' | 'check' | 'chevron' | 'help' | 'logout' | 'refresh';

const paths: Record<WorkspaceIconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-8h6v8" /></>,
  orders: <><path d="m3 7 9-4 9 4v10l-9 4-9-4Z" /><path d="m3 7 9 4 9-4M12 11v10M7.5 5l9 4" /></>,
  wallet: <><path d="M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M20 11h-5v6h5" /><path d="M16.5 14h.01" /></>,
  delivery: <><path d="M2 5h12v13H2ZM14 10h4l4 4v4h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1 .8-1.7 1.2-1.7 3.2M12 17h.01" /></>,
  logout: <><path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.2 7a7 7 0 0 1 11.6-1L20 9M4 15l2.2 3A7 7 0 0 0 17.8 17" /></>,
};

export function WorkspaceIcon({ name, size = 20 }: { name: WorkspaceIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

export function ParcelMark() {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false"><path d="m8 15 16-7 16 7v19l-16 7-16-7Z" fill="#fff8ed" stroke="currentColor" strokeWidth="2" /><path d="m8 15 16 8 16-8M24 23v18M16 11.5l16 8v7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M15 26h.01M20 28h.01M15 31q2 4 5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

export function ProductArtwork({ name, compact = false }: { name: string; compact?: boolean }) {
  const kind = /shirt|tee|cotton|apparel/i.test(name) ? 'shirt' : /cup|mug|titanium|sierra/i.test(name) ? 'cup' : /book|journal|notebook/i.test(name) ? 'book' : 'bag';
  const backgrounds = { shirt: '#e7edf9', cup: '#fae7da', book: '#e8ede1', bag: '#eee4f5' };
  return <div className={`dw-product-art${compact ? ' dw-product-art-small' : ''}`} style={{ '--art-background': backgrounds[kind] } as CSSProperties}>
    <svg viewBox="0 0 160 140" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="119" rx="43" ry="6" fill="#24374a" opacity=".08" />
      {kind === 'shirt' ? <><path d="m58 29-25 15 13 23 13-8-3 56h49l-3-56 13 8 13-23-25-15-14 7H72Z" fill="#fffdf8" stroke="#23354d" strokeWidth="2.2" strokeLinejoin="round" /><path d="M67 31c2 17 24 17 27 0M69 86h23" stroke="#23354d" strokeWidth="2" /><path d="m75 65 6-6 6 6-6 6Z" fill="#f57661" /><path d="M61 107h39" stroke="#c7d2e1" strokeWidth="2" /></>
        : kind === 'cup' ? <><path d="M111 48c29-5 31 41 1 39" stroke="#23354d" strokeWidth="7" /><path d="M111 48c29-5 31 41 1 39" stroke="#a9b8c7" strokeWidth="3" /><path d="m43 48 6 54c2 14 56 14 59 0l5-54" fill="#c2cbd2" stroke="#23354d" strokeWidth="2.2" /><ellipse cx="78" cy="48" rx="35" ry="12" fill="#e9eef0" stroke="#23354d" strokeWidth="2.2" /><ellipse cx="78" cy="49" rx="27" ry="7" fill="#7d919f" /><path d="m56 66 4 31M102 66l-2 25" stroke="#f8fbfc" strokeWidth="3" strokeLinecap="round" /><path d="M69 83h19" stroke="#23354d" strokeWidth="2" /></>
          : kind === 'book' ? <><path d="m49 30 60 9v77l-60-9c-5 0-8-3-8-8V38c0-5 3-8 8-8Z" fill="#2366ed" stroke="#23354d" strokeWidth="2.2" /><path d="m49 30 1 77M50 101l59 9" stroke="#23354d" strokeWidth="2" /><path d="m65 52 28 4m-28 7 20 3" stroke="#fff8ed" strokeWidth="3" strokeLinecap="round" /><circle cx="80" cy="84" r="7" fill="#fac26f" /><path d="m109 43 7 3v70h-7" fill="#fff8ed" stroke="#23354d" strokeWidth="2" /></>
            : <><path d="m49 51-7 63h76l-7-63Z" fill="#fffdf8" stroke="#23354d" strokeWidth="2.2" strokeLinejoin="round" /><path d="M62 56V40a18 18 0 0 1 36 0v16" stroke="#23354d" strokeWidth="4" /><path d="M56 61h47M54 106h53" stroke="#e7d4b7" strokeWidth="2" /><path d="m72 79 8-5 8 5v13l-8 5-8-5Z" fill="#f57661" stroke="#23354d" strokeWidth="1.5" /><path d="m72 79 8 5 8-5M80 84v13" stroke="#23354d" strokeWidth="1.5" /></>}
    </svg>
  </div>;
}

export function JourneyArtwork() {
  return <svg viewBox="0 0 300 150" fill="none" className="dw-journey-art" aria-hidden="true" focusable="false"><path d="M8 125c30-15 45 15 75 0s45 15 75 0 45 15 75 0 45 15 59 0" stroke="#75a4f5" strokeWidth="2" /><path d="M30 101h224l-18 18H57Z" fill="#2366ed" stroke="#23354d" strokeWidth="2" /><path d="M46 73h53v28H46ZM99 73h54v28H99ZM153 73h54v28h-54Z" fill="#f5b774" stroke="#23354d" strokeWidth="2" /><path d="M90 48h54v25H90ZM144 48h54v25h-54Z" fill="#fa7964" stroke="#23354d" strokeWidth="2" /><path d="M214 59h23v42h-23ZM218 49h15v10" fill="#fff8ed" stroke="#23354d" strokeWidth="2" /><path d="M220 70h10M220 80h10M63 80v12M116 80v12M170 80v12" stroke="#23354d" strokeWidth="2" /><path d="M37 41c20-14 34-14 54-4M251 30l-6 7 11-1M262 35l-6 7 11-1" stroke="#23354d" strokeWidth="2" strokeLinecap="round" /><circle cx="53" cy="26" r="12" fill="#f8bd67" /><path d="M112 26c34-18 75-17 113 2" stroke="#2366ed" strokeWidth="1.5" strokeDasharray="4 5" /></svg>;
}
