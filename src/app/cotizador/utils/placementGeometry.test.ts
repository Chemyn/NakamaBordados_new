import { describe, expect, it } from 'vitest';
import {
  GARMENT_PLACEMENT_POINTS,
  GARMENT_REFERENCE_MARKER_SIZE,
  getGarmentPlacementPoint,
} from './placementGeometry';

describe('garment placement geometry', () => {
  it('mirrors the customer chest and sleeve sides in the front-view illustration', () => {
    expect(GARMENT_PLACEMENT_POINTS['Pecho Izquierdo'].x).toBeGreaterThan(50);
    expect(GARMENT_PLACEMENT_POINTS['Pecho Derecho'].x).toBeLessThan(50);
    expect(GARMENT_PLACEMENT_POINTS['Manga Izquierda'].x).toBeGreaterThan(50);
    expect(GARMENT_PLACEMENT_POINTS['Manga Derecha'].x).toBeLessThan(50);
  });

  it('keeps the PDF reference marker centered on the visualizer chest zones', () => {
    expect(GARMENT_PLACEMENT_POINTS['Pecho Izquierdo']).toEqual({ x: 61.5, y: 32.5 });
    expect(GARMENT_PLACEMENT_POINTS['Pecho Derecho']).toEqual({ x: 38.5, y: 32.5 });
    expect(GARMENT_REFERENCE_MARKER_SIZE).toBe(11);
  });

  it('uses the center of the garment for an unknown legacy position', () => {
    expect(getGarmentPlacementPoint('Posición anterior')).toEqual({ x: 50, y: 50 });
  });
});
