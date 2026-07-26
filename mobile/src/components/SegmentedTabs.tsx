import { Pressable, StyleSheet, Text, View } from 'react-native';

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
 *
 * Las tres pestañas miden exactamente lo mismo (flex: 1) y el contador ocupa
 * su sitio desde el primer render, aunque aún no tenga número. Antes cada
 * pestaña se dimensionaba por su contenido, así que al ir resolviendo las tres
 * consultas los botones crecían de golpe y se movían bajo el dedo.
 */
export function SegmentedTabs({ value, onChange, counts }: SegmentedTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
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
            <Text
              style={[styles.label, active && { color: column.onColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {column.short}
            </Text>
            <View style={[styles.badge, active && styles.badgeActive]}>
              <Text
                style={[
                  styles.badgeText,
                  active && { color: column.onColor },
                  count === undefined && styles.badgeTextIdle,
                ]}
              >
                {count ?? '–'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.body,
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.body,
  },
  badgeTextIdle: {
    opacity: 0.35,
  },
});
