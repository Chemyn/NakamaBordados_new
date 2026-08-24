const COLOR_TRANSLATIONS: Readonly<Record<string, string>> = {
  black: 'Negro',
  blk: 'Negro',
  white: 'Blanco',
  wht: 'Blanco',
  red: 'Rojo',
  blue: 'Azul',
  navy: 'Azul marino',
  green: 'Verde',
  yellow: 'Amarillo',
  pink: 'Rosa',
  gray: 'Gris',
  grey: 'Gris',
  khaki: 'Kaki',
  feet: 'Kaki',
  bone: 'Hueso',
  'bottle green': 'Verde botella',
  purple: 'Morado',
  orange: 'Naranja',
  brown: 'Café',
  wine: 'Vino',
  burgundy: 'Vino',
  beige: 'Beige',
};

function normalizeColorLookup(color: string): string {
  return color.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

/** Returns a display-only Spanish label without changing the raw warehouse color. */
export function translateWarehouseColor(color: unknown): string {
  if (typeof color !== 'string') return '';
  return COLOR_TRANSLATIONS[normalizeColorLookup(color)] ?? color;
}
