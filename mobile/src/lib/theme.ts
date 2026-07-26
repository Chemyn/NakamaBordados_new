/**
 * Tokens de diseño de la app de producción.
 *
 * Dirección: "utilitario industrial moderno" — fondo blanco, rojo Nakama como
 * único acento fuerte y colores de estado heredados del panel web para que un
 * operador reconozca la misma semántica en ambos lados. Solo modo claro: la app
 * se usa bajo la luz del taller.
 */

export const colors = {
  red: '#E3000F',
  redDark: '#B8000C',
  redSoft: '#FDECED',

  ink: '#0A0A0A',
  body: '#3F444D',
  muted: '#767C86',

  bg: '#FFFFFF',
  surface: '#F5F6F7',
  border: '#E4E6E9',

  // Estados del tablero — mismos que el panel web.
  blue: '#2563EB',
  amber: '#F59E0B',
  green: '#1A7F37',
  greenSoft: '#EAF6EC',
  error: '#B32D2E',
  errorSoft: '#FDECED',

  white: '#FFFFFF',
  onAmber: '#1A1F2B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

/** Familias cargadas en el layout raíz (Teko para display, Archivo para texto). */
export const fonts = {
  display: 'Teko_600SemiBold',
  displayBold: 'Teko_700Bold',
  body: 'Archivo_400Regular',
  bodyMedium: 'Archivo_500Medium',
  bodyBold: 'Archivo_700Bold',
} as const;

/** Altura mínima de cualquier control tocable (guía de accesibilidad Android). */
export const TOUCH_TARGET = 48;

export const shadow = {
  card: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;
