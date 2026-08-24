import assert from 'node:assert/strict';
import test from 'node:test';

import { translateWarehouseColor } from '../mobile/src/lib/warehouse-display.ts';
import { translateWarehouseColor as translateWebWarehouseColor } from '../src/lib/warehouse-display.ts';

const approvedCases = [
  ['  BLACK  ', 'Negro'],
  ['Blk', 'Negro'],
  ['White', 'Blanco'],
  ['Wht', 'Blanco'],
  ['Red', 'Rojo'],
  ['Blue', 'Azul'],
  ['Navy', 'Azul marino'],
  ['Green', 'Verde'],
  ['Yellow', 'Amarillo'],
  ['Pink', 'Rosa'],
  ['Gray', 'Gris'],
  ['Grey', 'Gris'],
  ['Khaki', 'Kaki'],
  ['Purple', 'Morado'],
  ['Orange', 'Naranja'],
  ['Brown', 'Café'],
  ['Wine', 'Vino'],
  ['Burgundy', 'Vino'],
  ['Beige', 'Beige'],
  ['Bone', 'Hueso'],
  ['Feet', 'Kaki'],
  ['Bottle Green', 'Verde botella'],
];

test('uses the approved Spanish color glossary in the mobile presentation', () => {
  for (const [raw, translated] of approvedCases) {
    assert.equal(translateWarehouseColor(raw), translated, raw);
  }
});

test('preserves unknown mobile warehouse colors', () => {
  assert.equal(translateWarehouseColor('  Navy Blue  '), '  Navy Blue  ');
});

test('renders an empty mobile color for malformed runtime data', () => {
  assert.equal(translateWarehouseColor(undefined), '');
});

test('keeps the mobile and web color glossaries in parity', () => {
  for (const [raw] of approvedCases) {
    assert.equal(translateWarehouseColor(raw), translateWebWarehouseColor(raw), raw);
  }
});
