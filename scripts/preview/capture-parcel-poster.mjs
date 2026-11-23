import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Capture our own Three.js geometry, not either immutable approved reference PNG.
// Run after `npm start app`; no credentials or outside services are needed.
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 2400, height: 1800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:3002/');
  await page.locator('.parcel-world.is-ready').waitFor();
  await page.addStyleTag({ content: `
    body, .site-shell { background: transparent !important; }
    body * { visibility: hidden !important; }
    .parcel-world-canvas { position: fixed !important; inset: 0 auto auto 0 !important; width: 848px !important; height: 800px !important; opacity: 1 !important; transition: none !important; }
    .parcel-world-canvas, .parcel-world-canvas canvas { visibility: visible !important; }
  ` });
  await page.waitForFunction(() => document.querySelector('.parcel-world-canvas canvas')?.width === 848);
  const png = await page.locator('.parcel-world-canvas canvas').screenshot({ omitBackground: true });
  await mkdir('public/images', { recursive: true });
  const result = await sharp(png).webp({ quality: 88 }).toFile('public/images/parcel-studio-poster.webp');
  console.log(`Saved parcel-studio-poster.webp: ${result.width}×${result.height}, ${result.size} bytes`);
} finally { await browser.close(); }
