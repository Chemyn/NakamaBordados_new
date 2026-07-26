import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { ProdColumn } from './api';
import { colors } from './theme';

export interface ColumnMeta {
  key: ProdColumn;
  /** Título completo, tal como se llama la columna en el panel web. */
  label: string;
  /** Etiqueta corta para el selector de la parte superior. */
  short: string;
  color: string;
  onColor: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  empty: string;
}

export const COLUMNS: ColumnMeta[] = [
  {
    key: 'processing',
    label: 'En espera de fabricación',
    short: 'En espera',
    color: colors.red,
    onColor: colors.white,
    icon: 'schedule',
    empty: 'No hay pedidos esperando fabricación.',
  },
  {
    key: 'tomados',
    label: 'Fabricando',
    short: 'Fabricando',
    color: colors.blue,
    onColor: colors.white,
    icon: 'content-cut',
    empty: 'Ningún pedido en fabricación ahora mismo.',
  },
  {
    key: 'pendiente-guia',
    label: 'Pendiente de guía',
    short: 'Pend. guía',
    color: colors.amber,
    onColor: colors.onAmber,
    icon: 'local-shipping',
    empty: 'No hay pedidos esperando guía.',
  },
];

export function columnMeta(key: ProdColumn): ColumnMeta {
  return COLUMNS.find((column) => column.key === key) ?? COLUMNS[0];
}
