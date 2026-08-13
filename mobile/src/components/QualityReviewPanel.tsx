import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppButton } from '@/components/AppButton';
import type { ProdOrderDetail, ProdReviewItemInput } from '@/lib/api';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

type ReviewRows = Record<number, { rejected: boolean; quantity: number; comment: string }>;

export function QualityReviewPanel({
  order,
  busy,
  onReview,
}: {
  order: ProdOrderDetail;
  busy: boolean;
  onReview: (decision: 'approved' | 'rework', items: ProdReviewItemInput[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ReviewRows>(() => Object.fromEntries(
    order.products.map((product) => [product.item_id, { rejected: false, quantity: 1, comment: '' }]),
  ));
  const [error, setError] = useState<string | null>(null);

  const rejected = useMemo<ProdReviewItemInput[]>(() => order.products.flatMap((product) => {
    const row = rows[product.item_id];
    return row?.rejected ? [{
      item_id: product.item_id,
      quantity_rejected: row.quantity,
      comment: row.comment.trim(),
    }] : [];
  }), [order.products, rows]);

  const update = (itemId: number, patch: Partial<ReviewRows[number]>) => {
    setRows((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
    setError(null);
  };

  const submit = async (decision: 'approved' | 'rework') => {
    if (decision === 'approved' && rejected.length) {
      setError('Desmarca los articulos rechazados para aprobar.');
      return;
    }
    if (decision === 'rework' && !rejected.length) {
      setError('Selecciona al menos un articulo para devolver.');
      return;
    }
    if (decision === 'rework' && rejected.some((item) => !item.comment)) {
      setError('Cada articulo devuelto necesita un comentario.');
      return;
    }

    setError(null);
    try {
      await onReview(decision, decision === 'rework' ? rejected : []);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'No se pudo guardar la revision.');
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.kicker}>Control de calidad</Text>
          <Text style={styles.heading}>Revision del ciclo {order.cycle_number || 1}</Text>
        </View>
        <Text style={styles.pieceCount}>{order.products.reduce((sum, item) => sum + item.qty, 0)} pzas</Text>
      </View>

      {order.products.map((product) => {
        const row = rows[product.item_id] || { rejected: false, quantity: 1, comment: '' };
        return (
          <View key={product.item_id} style={[styles.item, row.rejected && styles.itemRejected]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: row.rejected, disabled: busy }}
              disabled={busy}
              onPress={() => update(product.item_id, { rejected: !row.rejected })}
              style={styles.choice}
            >
              <MaterialIcons
                name={row.rejected ? 'check-box' : 'check-box-outline-blank'}
                color={row.rejected ? colors.error : colors.muted}
                size={24}
              />
              <Text style={[styles.choiceText, row.rejected && styles.choiceRejected]}>
                {row.rejected ? 'Requiere retrabajo' : 'Correcto'}
              </Text>
            </Pressable>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productQty}>Cantidad del pedido: {product.qty}</Text>

            {row.rejected && (
              <View style={styles.fields}>
                <Text style={styles.label}>Piezas rechazadas</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Quitar una pieza"
                    disabled={busy || row.quantity <= 1}
                    onPress={() => update(product.item_id, { quantity: Math.max(1, row.quantity - 1) })}
                    style={styles.stepperButton}
                  >
                    <MaterialIcons name="remove" size={22} color={colors.ink} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{row.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Agregar una pieza"
                    disabled={busy || row.quantity >= product.qty}
                    onPress={() => update(product.item_id, { quantity: Math.min(product.qty, row.quantity + 1) })}
                    style={styles.stepperButton}
                  >
                    <MaterialIcons name="add" size={22} color={colors.ink} />
                  </Pressable>
                </View>
                <Text style={styles.label}>Que hace falta corregir</Text>
                <TextInput
                  multiline
                  numberOfLines={3}
                  editable={!busy}
                  placeholder="Describe el detalle"
                  placeholderTextColor={colors.muted}
                  value={row.comment}
                  onChangeText={(comment) => update(product.item_id, { comment })}
                  style={styles.comment}
                />
              </View>
            )}
          </View>
        );
      })}

      {order.has_shipping_guide && (
        <View style={styles.guideWarning}>
          <MaterialIcons name="local-shipping" color={colors.onAmber} size={20} />
          <Text style={styles.guideWarningText}>Ya existe una guia. Al aprobar, el pedido se completara.</Text>
        </View>
      )}

      {error && <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <AppButton
          label="Devolver"
          icon="undo"
          variant="danger"
          loading={busy}
          onPress={() => void submit('rework')}
          style={styles.action}
        />
        <AppButton
          label="Aprobar"
          icon="verified"
          disabled={busy || rejected.length > 0}
          onPress={() => void submit('approved')}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopColor: colors.ink, borderTopWidth: 3, gap: spacing.md, paddingTop: spacing.lg },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { color: colors.error, fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase' },
  heading: { color: colors.ink, fontFamily: fonts.display, fontSize: 25, lineHeight: 29, textTransform: 'uppercase' },
  pieceCount: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.body, fontFamily: fonts.bodyBold, fontSize: 11, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  item: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, padding: spacing.md },
  itemRejected: { backgroundColor: colors.errorSoft, borderColor: colors.error },
  choice: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: TOUCH_TARGET },
  choiceText: { color: colors.body, fontFamily: fonts.bodyBold, fontSize: 12, textTransform: 'uppercase' },
  choiceRejected: { color: colors.error },
  productName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15, marginLeft: spacing.xxl },
  productQty: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginLeft: spacing.xxl, marginTop: spacing.xs },
  fields: { gap: spacing.sm, marginTop: spacing.md },
  label: { color: colors.body, fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase' },
  stepper: { alignItems: 'center', alignSelf: 'flex-start', borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row' },
  stepperButton: { alignItems: 'center', height: TOUCH_TARGET, justifyContent: 'center', width: TOUCH_TARGET },
  stepperValue: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16, minWidth: 38, textAlign: 'center' },
  comment: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 14, minHeight: 84, padding: spacing.md, textAlignVertical: 'top' },
  error: { backgroundColor: colors.errorSoft, borderRadius: radius.sm, color: colors.error, fontFamily: fonts.bodyBold, fontSize: 12, padding: spacing.md },
  guideWarning: { alignItems: 'flex-start', backgroundColor: '#FEF6E7', borderColor: colors.amber, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  guideWarningText: { color: colors.onAmber, flex: 1, fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1, paddingHorizontal: spacing.sm },
});
