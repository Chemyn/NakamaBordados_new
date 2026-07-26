import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { ProdCard } from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/lib/theme';

import { ProgressBar } from './ProgressBar';

interface OrderCardProps {
  order: ProdCard;
  /** Color de la columna: el filo superior identifica la etapa de un vistazo. */
  accent: string;
  onPress: (id: number) => void;
  showProgress?: boolean;
}

/**
 * Orden de trabajo, no tarjeta decorativa: el número manda, el resto es la
 * información mínima para decidir si tomarlo. Sin sombras — en Android la
 * elevación se recorta contra el borde y se ve sucia; el filo de color y el
 * borde de 1px separan lo suficiente sobre fondo blanco.
 */
function OrderCardComponent({ order, accent, onPress, showProgress = true }: OrderCardProps) {
  const title = order.is_quote ? `Cotización ${order.number}` : `Pedido #${order.number}`;
  const withProgress = showProgress && order.progress.total > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${order.item_count} piezas`}
      onPress={() => onPress(order.id)}
      style={({ pressed }) => [styles.ticket, { borderTopColor: accent }, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.number} numberOfLines={1}>
            {order.is_quote ? order.number : `#${order.number}`}
          </Text>
          {order.is_quote && (
            <View style={styles.quoteBadge}>
              <Text style={styles.quoteBadgeText}>COTIZACIÓN</Text>
            </View>
          )}
          <Text style={styles.age} numberOfLines={1}>
            hace {order.age}
          </Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{order.item_count} pzas</Text>
          {order.taken && !!order.taken_by && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <MaterialIcons name="person" size={14} color={colors.blue} />
              <Text style={[styles.meta, styles.takenBy]} numberOfLines={1}>
                {order.taken_by}
              </Text>
            </>
          )}
        </View>

        {order.products.length > 0 && (
          <Text style={styles.products} numberOfLines={2}>
            {order.products.join(' · ')}
          </Text>
        )}

        {withProgress && (
          <Text style={styles.progressCaption}>
            {order.progress.validated}/{order.progress.total} validados
          </Text>
        )}
      </View>

      {withProgress && (
        <ProgressBar
          fullBleed
          validated={order.progress.validated}
          total={order.progress.total}
          pct={order.progress.pct}
        />
      )}
    </Pressable>
  );
}

export const OrderCard = memo(OrderCardComponent);

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 5,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  number: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    // Teko tiene ascendentes altos: por debajo de ~1.3x Android recorta el número.
    lineHeight: 40,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  quoteBadge: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  quoteBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.onAmber,
  },
  age: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.body,
  },
  metaDot: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  takenBy: {
    flexShrink: 1,
    color: colors.blue,
  },
  products: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  progressCaption: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.body,
  },
});
