import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ProdColumn } from '@/lib/api';
import { COLUMNS } from '@/lib/columns';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

interface SegmentedTabsProps {
  value: ProdColumn;
  onChange: (column: ProdColumn) => void;
  /** Conteo ya formateado por columna (undefined = aún cargando). */
  counts: Partial<Record<ProdColumn, string>>;
}

/**
 * Sustituye a las tres columnas lado a lado del panel web: en un teléfono se
 * ve una etapa a la vez y se cambia con este selector.
 */
export function SegmentedTabs({ value, onChange, counts }: SegmentedTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {COLUMNS.map((column) => {
        const active = column.key === value;
        const count = counts[column.key];

        return (
          <Pressable
            key={column.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={column.label}
            onPress={() => onChange(column.key)}
            style={({ pressed }) => [
              styles.tab,
              active && { backgroundColor: column.color, borderColor: column.color },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && { color: column.onColor }]} numberOfLines={1}>
              {column.short}
            </Text>
            {count !== undefined && (
              <View style={[styles.badge, active && { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
                <Text style={[styles.badgeText, active && { color: column.onColor }]}>{count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tab: {
    minHeight: TOUCH_TARGET - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.body,
  },
  badge: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.body,
  },
});
