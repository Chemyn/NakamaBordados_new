import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/lib/theme';

interface ProgressBarProps {
  validated: number;
  total: number;
  pct: number;
  /** Versión compacta para las tarjetas del tablero (sin texto descriptivo). */
  compact?: boolean;
  /** Barra pegada al fondo del ticket, sin márgenes ni esquinas redondeadas. */
  fullBleed?: boolean;
}

/**
 * Progreso de validación. Pasa de rojo a verde al llegar al 100%: es la señal
 * de que el pedido ya se puede finalizar.
 */
export function ProgressBar({
  validated,
  total,
  pct,
  compact = false,
  fullBleed = false,
}: ProgressBarProps) {
  const complete = pct >= 100;
  const width = Math.max(0, Math.min(100, pct));

  const track = (
    <View
      style={[styles.track, compact && styles.trackCompact, fullBleed && styles.trackFullBleed]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: width }}
      accessibilityLabel={`${validated} de ${total} productos validados`}
    >
      <View
        style={[
          styles.fill,
          fullBleed && styles.fillFullBleed,
          { width: `${width}%`, backgroundColor: complete ? colors.green : colors.red },
        ]}
      />
    </View>
  );

  // El ticket ya muestra su propio texto encima de la barra.
  if (fullBleed) return track;

  return (
    <View style={compact ? undefined : styles.block}>
      {!compact && (
        <Text style={styles.caption}>
          {validated}/{total} productos validados ({pct}%)
        </Text>
      )}
      {track}
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
  trackFullBleed: {
    height: 6,
    borderRadius: 0,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  fillFullBleed: {
    borderRadius: 0,
  },
});
