import { describe, expect, it } from 'vitest';
import { parcelMotion } from '../parcel-motion';

describe('parcel arrival motion', () => {
  it('arrives once, then holds a stable final pose', () => {
    expect(parcelMotion(0, false).flight).toBe(0);
    expect(parcelMotion(2000, false).flight).toBeGreaterThan(0);
    expect(parcelMotion(2000, false).flight).toBeLessThan(1);
    const arrived = parcelMotion(4000, false);
    expect(arrived).toEqual({ flight: 1, float: 0, eyes: 1 });
    expect(parcelMotion(60_000, false)).toEqual(arrived);
  });
  it('shows the final pose immediately for reduced motion', () => {
    for (const elapsed of [0, 700, 2000, 3900]) {
      expect(parcelMotion(elapsed, true)).toEqual(parcelMotion(4000, false));
    }
  });
  it('keeps the flight and blink bounded even when the clock starts early', () => {
    for (const elapsed of [-100, 0, 750, 2100, 3999, 9000]) {
      const pose = parcelMotion(elapsed, false);
      expect(pose.flight).toBeGreaterThanOrEqual(0);
      expect(pose.flight).toBeLessThanOrEqual(1);
      expect(pose.eyes).toBeGreaterThan(0);
      expect(pose.eyes).toBeLessThanOrEqual(1);
    }
  });
});
