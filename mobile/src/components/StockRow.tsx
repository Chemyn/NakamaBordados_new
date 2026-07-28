import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { RowSaveState } from '@/hooks/useWarehouse';
import type { WhItem, WhStatus } from '@/lib/warehouse-api';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

/** Color y texto del estado. Nunca solo color: en el taller se lee de reojo. */
const STATUS: Record<WhStatus, { color: string; label: string }> = {
  ok: { color: colors.green, label: 'Con existencia' },
  low: { color: colors.amber, label: 'Por agotarse' },
  out: { color: colors.error, label: 'Agotado' },
};

interface StockRowProps {
  item: WhItem;
  /** Valores pendientes de guardar; si no hay, se muestran los del servidor. */
  draftStock?: number;
  draftMin?: number;
  expanded: boolean;
  saveState?: RowSaveState;
  onToggle: (id: number) => void;
  onChangeStock: (id: number, value: number) => void;
  onChangeMin: (id: number, value: number) => void;
}

function Stepper({
  label,
  value,
  onChange,
  accessibilityLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar uno a ${accessibilityLabel}`}
        // El stock no baja de cero: un negativo solo confunde al contar.
        onPress={() => onChange(Math.max(0, value - 1))}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <MaterialIcons name="remove" size={20} color={colors.body} />
      </Pressable>

      <View style={styles.stepValue}>
        <Text style={styles.stepNumber} accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Añadir uno a ${accessibilityLabel}`}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <MaterialIcons name="add" size={20} color={colors.body} />
      </Pressable>
    </View>
  );
}

function StockRowBase({
  item,
  draftStock,
  draftMin,
  expanded,
  saveState,
  onToggle,
  onChangeStock,
  onChangeMin,
}: StockRowProps) {
  const stock = draftStock ?? item.stock;
  const min = draftMin ?? item.min_stock;
  const dirty = draftStock !== undefined || draftMin !== undefined;
  const status = STATUS[item.status];

  return (
    <View style={[styles.row, dirty && styles.rowDirty]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.prenda} ${item.color}, talla ${item.talla}. ${status.label}.`}
        accessibilityHint="Toca para ajustar el mínimo"
        onPress={() => onToggle(item.id)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {item.prenda} {item.color}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {status.label}
            {min > 0 ? ` · mín. ${min}` : ''}
          </Text>
        </View>

        <View style={styles.sizeChip}>
          <Text style={styles.sizeText}>{item.talla}</Text>
        </View>

        {saveState === 'saving' && <MaterialIcons name="sync" size={18} color={colors.muted} />}
        {saveState === 'saved' && <MaterialIcons name="check-circle" size={18} color={colors.green} />}
        {saveState === 'error' && <MaterialIcons name="error-outline" size={18} color={colors.error} />}
      </Pressable>

      <Stepper
        label="En existencia"
        value={stock}
        onChange={(value) => onChangeStock(item.id, value)}
        accessibilityLabel={`existencia de ${item.label}`}
      />

      {expanded && (
        <Stepper
          label="Mínimo antes de avisar"
          value={min}
          onChange={(value) => onChangeMin(item.id, value)}
          accessibilityLabel={`mínimo de ${item.label}`}
        />
      )}
    </View>
  );
}

export const StockRow = memo(StockRowBase);

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  rowDirty: {
    borderColor: colors.amber,
    backgroundColor: '#FFFCF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  sizeChip: {
    minWidth: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  sizeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.body,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepButton: {
    width: TOUCH_TARGET + 8,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
  },
  stepLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.muted,
    textTransform: 'uppercase',
  },
});
