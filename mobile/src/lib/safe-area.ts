/**
 * Altura mínima que debe quedar libre desde el borde físico en Android.
 * Cubre la barra clásica de tres botones aun cuando safe-area-context reporta 0.
 */
export const ANDROID_SYSTEM_NAV_CLEARANCE = 56;

export function bottomActionPadding(
  platform: string,
  reportedBottomInset: number,
  basePadding: number,
): number {
  const insetPadding = basePadding + Math.max(0, reportedBottomInset);
  return platform === 'android'
    ? Math.max(insetPadding, ANDROID_SYSTEM_NAV_CLEARANCE)
    : insetPadding;
}
