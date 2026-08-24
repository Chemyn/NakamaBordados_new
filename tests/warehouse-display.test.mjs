import assert from 'node:assert/strict';
import test from 'node:test';

import { translateWarehouseColor } from '../src/lib/warehouse-display.ts';

test('translates every approved warehouse color alias for web presentation', () => {
  const aliases = [
    ['Black', 'Negro'],
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

  for (const [raw, translated] of aliases) {
    assert.equal(translateWarehouseColor(raw), translated, raw);
  }
});

test('renders an empty color for malformed runtime data', () => {
  assert.equal(translateWarehouseColor(null), '');
});

test('matches known colors regardless of case and surrounding whitespace', () => {
  assert.equal(translateWarehouseColor('  nAvY  '), 'Azul marino');
});

test('preserves an unknown full color value byte-for-byte', () => {
  assert.equal(translateWarehouseColor('  Navy Blue  '), '  Navy Blue  ');
});

test('does not mutate the raw warehouse item', () => {
  const item = { color: 'Black', label: 'Hoodie / Black / M' };
  const before = structuredClone(item);

  translateWarehouseColor(item.color);

  assert.deepEqual(item, before);
});
