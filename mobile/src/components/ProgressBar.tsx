import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/lib/theme';

interface ProgressBarProps {
  validated: number;
  total: number;
  pct: number;
  /** Versión compacta para las tarjetas del tablero (sin texto descriptivo). */
  compact?: boolean;
}

/**
 * Progreso de validación. Pasa de rojo a verde al llegar al 100%: es la señal
 * de que el pedido ya se puede finalizar.
 */
export function ProgressBar({ validated, total, pct, compact = false }: ProgressBarProps) {
  const complete = pct >= 100;
  const width = Math.max(0, Math.min(100, pct));

  return (
    <View style={compact ? undefined : styles.block}>
      {!compact && (
        <Text style={styles.caption}>
          {validated}/{total} productos validados ({pct}%)
        </Text>
      )}
      <View
        style={[styles.track, compact && styles.trackCompact]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: width }}
        accessibilityLabel={`${validated} de ${total} productos validados`}
      >
        <View
          style={[
            styles.fill,
            { width: `${width}%`, backgroundColor: complete ? colors.green : colors.red },
          ]}
        />
      </View>
      {compact && (
        <Text style={styles.captionCompact}>
          {validated}/{total} validados
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.body,
  },
  captionCompact: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  trackCompact: {
    height: 6,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
