import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => Number.parseInt(value, 16) / 255) || [];
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function token(scope: string, name: string): string {
  const match = scope.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match) throw new Error(`Missing color token ${name}`);
  return match[1];
}

describe('Mi Cuenta danger color', () => {
  it('meets WCAG AA against both account surfaces in light and dark themes', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    const lightScope = css.match(/:root\s*{([\s\S]*?)}/)?.[1] || '';
    const darkScope = css.match(/html\.dark\s*{([\s\S]*?)}/)?.[1] || '';
    const lightDanger = token(lightScope, '--nk-danger');
    const darkDanger = token(darkScope, '--nk-danger');

    expect(contrast(lightDanger, token(lightScope, '--nk-bg-card'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(lightDanger, token(lightScope, '--nk-bg-wrapper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkDanger, token(darkScope, '--nk-bg-card'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkDanger, token(darkScope, '--nk-bg-wrapper'))).toBeGreaterThanOrEqual(4.5);
  });
});
