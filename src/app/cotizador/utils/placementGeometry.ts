export const GARMENT_PLACEMENT_POINTS = {
  // La prenda se observa de frente (vista espejo): el lado izquierdo de la
  // persona aparece a la derecha de la ilustración.
  'Pecho Derecho': { x: 38.5, y: 32.5 },
  'Pecho Izquierdo': { x: 61.5, y: 32.5 },
  'Pecho en Medio': { x: 50, y: 33.5 },
  Enfrente: { x: 50, y: 61 },
  Espalda: { x: 50, y: 53 },
  'Manga Derecha': { x: 21.75, y: 35.25 },
  'Manga Izquierda': { x: 78.25, y: 35.25 },
} as const;

export const GARMENT_REFERENCE_MARKER_SIZE = 11;

export type GarmentPlacementName = keyof typeof GARMENT_PLACEMENT_POINTS;

export function getGarmentPlacementPoint(position: string) {
  return GARMENT_PLACEMENT_POINTS[position as GarmentPlacementName] ?? { x: 50, y: 50 };
}
