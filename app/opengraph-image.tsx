import { ImageResponse } from 'next/og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', padding: 80, width: '100%', height: '100%', background: '#fff', color: '#111', fontFamily: 'sans-serif' }}><div style={{ fontSize: 30 }}>PayNShip</div><div style={{ fontSize: 88, marginTop: 100, letterSpacing: -5 }}>From Korea to your door.</div><div style={{ fontSize: 24, marginTop: 40 }}>Send a link. Review your quote. Follow your delivery.</div></div>, size);
}
