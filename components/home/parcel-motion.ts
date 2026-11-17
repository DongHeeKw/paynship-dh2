export const PARCEL_INTRO_MS = 4000;

/** A single arrival, with no recurring timer or animation after it settles. */
export function parcelMotion(elapsed: number, reduced: boolean) {
  const progress = Math.max(0, Math.min(1, elapsed / PARCEL_INTRO_MS));
  if (reduced || progress === 1) return { flight: 1, float: 0, eyes: 1 };
  const blink = Math.max(0, 1 - Math.abs(elapsed - 750) / 95, 1 - Math.abs(elapsed - 2100) / 95);
  return { flight: 1 - (1 - progress) ** 3, float: Math.sin(progress * Math.PI), eyes: 1 - blink * .9 };
}
