import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { ProdProduct } from '@/lib/api';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';
import { translateWarehouseColor } from '@/lib/warehouse-display';

interface ProductRowProps {
  product: ProdProduct;
  /** Solo se puede validar mientras el pedido está en fabricación. */
  canValidate: boolean;
  showValidation?: boolean;
  busy: boolean;
  onToggleValidated: (itemId: number, validated: boolean) => void;
  onOpenImage: (product: ProdProduct) => void;
  onOpenPdf: (url: string) => void;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function ProductRowComponent({
  product,
  canValidate,
  showValidation = true,
  busy,
  onToggleValidated,
  onOpenImage,
  onOpenPdf,
}: ProductRowProps) {
  const thumb = product.image_url || product.image_full;
  const displayColor = translateWarehouseColor(product.color);

  return (
    <View style={[styles.row, product.validated && styles.rowValidated]}>
      <View style={styles.top}>
        {showValidation && <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`Ampliar imagen de ${product.name}`}
          onPress={() => onOpenImage(product)}
          disabled={!thumb}
          style={styles.thumbWrapper}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" cachePolicy="disk" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <MaterialIcons name="image-not-supported" size={22} color={colors.muted} />
            </View>
          )}
        </Pressable>}

        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.chips}>
            {!!product.sku && <Chip label="SKU" value={product.sku} />}
            {!!product.talla && <Chip label="Talla" value={product.talla} />}
            {!!product.estilo && <Chip label="Estilo" value={product.estilo} />}
            {!!displayColor && <Chip label="Color" value={displayColor} />}
            <Chip label="Cant" value={String(product.qty)} />
          </View>
        </View>
      </View>

      {product.rework_quantity > 0 && (
        <View style={styles.reworkNote}>
          <View style={styles.reworkTitleRow}>
            <MaterialIcons name="build" size={17} color={colors.error} />
            <Text style={styles.reworkTitle}>
              Retrabajo: {product.rework_quantity} pieza{product.rework_quantity === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={styles.reworkComment}>{product.rework_comment}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {product.pdf_url ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver patrón de ${product.name}`}
            onPress={() => onOpenPdf(product.pdf_url)}
            style={({ pressed }) => [styles.pdfButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="picture-as-pdf" size={18} color={colors.red} />
            <Text style={styles.pdfLabel}>Ver patrón</Text>
          </Pressable>
        ) : (
          <View style={styles.noPdf}>
            <MaterialIcons name="info-outline" size={16} color={colors.muted} />
            <Text style={styles.noPdfLabel}>Sin patrón</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Validar ${product.name}`}
          accessibilityState={{ checked: product.validated, disabled: !canValidate || busy }}
          onPress={() => onToggleValidated(product.item_id, !product.validated)}
          disabled={!canValidate || busy}
          style={({ pressed }) => [
            styles.check,
            product.validated && styles.checkOn,
            (!canValidate || busy) && styles.checkDisabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={product.validated ? colors.white : colors.green} />
          ) : (
            <MaterialIcons
              name={product.validated ? 'check-circle' : 'radio-button-unchecked'}
              size={22}
              color={product.validated ? colors.white : colors.muted}
            />
          )}
          <Text style={[styles.checkLabel, product.validated && styles.checkLabelOn]}>
            {product.validated ? 'Validado' : 'Validar'}
          </Text>
        </Pressable>
      </View>

      {product.validated && !!product.validated_by && (
        <Text style={styles.validatedBy}>Validado por {product.validated_by}</Text>
      )}
    </View>
  );
}

export const ProductRow = memo(ProductRowComponent);

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowValidated: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.sm,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipLabel: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.muted,
  },
  chipValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reworkNote: {
    backgroundColor: colors.errorSoft,
    borderLeftColor: colors.error,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    gap: spacing.xs,
    padding: spacing.md,
  },
  reworkTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reworkTitle: {
    color: colors.error,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  reworkComment: {
    color: colors.body,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  pdfButton: {
    minHeight: TOUCH_TARGET - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pdfLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.red,
  },
  noPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noPdfLabel: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted,
  },
  check: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  checkOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkDisabled: {
    opacity: 0.45,
  },
  checkLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.body,
  },
  checkLabelOn: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
  validatedBy: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.green,
  },
});
