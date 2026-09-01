import { describe, expect, it } from 'vitest';

import { bottomActionPadding } from '../mobile/src/lib/safe-area';

describe('bottomActionPadding', () => {
  it('reserves space for classic Android navigation when the reported inset is zero', () => {
    expect(bottomActionPadding('android', 0, 16)).toBe(56);
  });

  it('keeps the Android fallback when an unreliable inset is too small', () => {
    expect(bottomActionPadding('android', 24, 16)).toBe(56);
  });

  it('uses a larger system inset when Android reports one', () => {
    expect(bottomActionPadding('android', 48, 16)).toBe(64);
  });

  it('uses the reported inset without the Android fallback on other platforms', () => {
    expect(bottomActionPadding('ios', 34, 16)).toBe(50);
  });
});
