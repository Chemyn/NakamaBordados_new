import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

export interface SegmentOption<K extends string> {
  key: K;
  /** Nombre completo, para el lector de pantalla. */
  label: string;
  /** Etiqueta corta, la que se ve en el botón. */
  short: string;
  color: string;
  onColor: string;
}

interface SegmentedTabsProps<K extends string> {
  options: readonly SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Conteo ya formateado por pestaña (undefined = aún cargando). */
  counts?: Partial<Record<K, string>>;
}

/**
 * Sustituye a las columnas lado a lado del panel web: en un teléfono se ve una
 * a la vez y se cambia con este selector.
 *
 * Las pestañas miden exactamente lo mismo (flex: 1) y el contador ocupa su
 * sitio desde el primer render, aunque aún no tenga número. Antes cada pestaña
 * se dimensionaba por su contenido, así que al ir resolviendo las consultas los
 * botones crecían de golpe y se movían bajo el dedo.
 */
export function SegmentedTabs<K extends string>({ options, value, onChange, counts }: SegmentedTabsProps<K>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((column) => {
        const active = column.key === value;
        const count = counts?.[column.key];

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
