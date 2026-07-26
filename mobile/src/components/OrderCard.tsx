import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import type { ProdCard } from '@/lib/api';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

import { ProgressBar } from './ProgressBar';

interface OrderCardProps {
  order: ProdCard;
  /** Color de la columna: la franja lateral identifica la etapa de un vistazo. */
  accent: string;
  onPress: (id: number) => void;
  showProgress?: boolean;
}

function OrderCardComponent({ order, accent, onPress, showProgress = true }: OrderCardProps) {
  const title = order.is_quote ? `Cotización ${order.number}` : `Pedido #${order.number}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${order.item_count} piezas`}
      onPress={() => onPress(order.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.number} numberOfLines={1}>
            {order.is_quote ? order.number : `#${order.number}`}
          </Text>
          <View style={styles.headerRight}>
            {order.is_quote && (
              <View style={styles.quoteBadge}>
                <Text style={styles.quoteBadgeText}>COTIZACIÓN</Text>
              </View>
            )}
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{order.item_count} pzas</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>hace {order.age}</Text>
        </View>

        {order.products.length > 0 && (
          <Text style={styles.products} numberOfLines={2}>
            {order.products.join(' · ')}
          </Text>
        )}

        {order.taken && !!order.taken_by && (
          <View style={styles.takenRow}>
            <MaterialIcons name="person" size={15} color={colors.blue} />
            <Text style={styles.taken} numberOfLines={1}>
              {order.taken_by}
              {order.taken_age ? ` · hace ${order.taken_age}` : ''}
            </Text>
          </View>
        )}

        {showProgress && order.progress.total > 0 && (
          <ProgressBar
            compact
            validated={order.progress.validated}
            total={order.progress.total}
            pct={order.progress.pct}
          />
        )}
      </View>
    </Pressable>
  );
}

export const OrderCard = memo(OrderCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  accent: {
    width: 6,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  number: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  quoteBadge: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  quoteBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.onAmber,
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
    color: colors.muted,
  },
  products: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  takenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  taken: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.blue,
  },
});
