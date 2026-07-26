import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppButton } from '@/components/AppButton';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { ProductRow } from '@/components/ProductRow';
import { ProgressBar } from '@/components/ProgressBar';
import { StateMessage } from '@/components/StateMessage';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { WORKABLE_STATUSES, type ProdProduct } from '@/lib/api';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const orderId = Number(params.id);

  const { detail, validate, take, finish } = useOrderDetail(orderId);
  const [viewing, setViewing] = useState<ProdProduct | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const order = detail.data;
  const inProduction = !!order && WORKABLE_STATUSES.includes(order.status);
  const complete = !!order && order.progress.pct >= 100;

  const openPdf = (url: string) => {
    void WebBrowser.openBrowserAsync(url);
  };

  const toggleValidated = (itemId: number, validated: boolean) => {
    setActionError(null);
    void Haptics.selectionAsync();
    validate.mutate(
      { itemId, validated },
      { onError: (error) => setActionError(error instanceof Error ? error.message : null) },
    );
  };

  const runTake = () => {
    setActionError(null);
    take.mutate(undefined, {
      onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      onError: (error) => setActionError(error instanceof Error ? error.message : null),
    });
  };

  const runFinish = () => {
    setActionError(null);
    finish.mutate(undefined, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      },
      // El servidor explica por qué no se puede ("Faltan N productos por validar").
      onError: (error) => setActionError(error instanceof Error ? error.message : null),
    });
  };

  if (detail.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  }

  if (detail.isError || !order) {
    return (
      <StateMessage
        icon="error-outline"
        tone="error"
        title="No se pudo cargar el pedido"
        description={detail.error instanceof Error ? detail.error.message : undefined}
        actionLabel="Reintentar"
        onAction={() => void detail.refetch()}
      />
    );
  }

  const title = order.is_quote
    ? `Cotización ${order.quote_folio || order.number}`
    : `Pedido #${order.number}`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {order.taken && !!order.taken_by && (
            <View style={styles.takenRow}>
              <MaterialIcons name="person" size={16} color={colors.white} />
              <Text style={styles.takenText}>Tomado por {order.taken_by}</Text>
            </View>
          )}
        </View>

        {order.is_quote && (
          <View style={styles.quoteBox}>
            <View style={styles.quoteHead}>
              <MaterialIcons name="request-quote" size={20} color={colors.onAmber} />
              <Text style={styles.quoteTitle}>Cotización</Text>
            </View>
            {order.quote_pdf_url ? (
              <AppButton
                label="Ver PDF de cotización"
                icon="picture-as-pdf"
                variant="secondary"
                onPress={() => openPdf(order.quote_pdf_url as string)}
              />
            ) : (
              <Text style={styles.quoteNote}>PDF no disponible (cotización anterior).</Text>
            )}
          </View>
        )}

        {inProduction && (
          <View style={styles.progressBox}>
            <ProgressBar
              validated={order.progress.validated}
              total={order.progress.total}
              pct={order.progress.pct}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Productos</Text>

        <View style={styles.products}>
          {order.products.map((product) => (
            <ProductRow
              key={product.item_id}
              product={product}
              canValidate={inProduction}
              busy={validate.isPending && validate.variables?.itemId === product.item_id}
              onToggleValidated={toggleValidated}
              onOpenImage={setViewing}
              onOpenPdf={openPdf}
            />
          ))}
        </View>

        {!!actionError && (
          <View style={styles.error} accessibilityLiveRegion="assertive">
            <MaterialIcons name="error-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        )}
      </ScrollView>

      {inProduction && (
        <View style={styles.footer}>
          <AppButton
            label={order.taken ? 'Re-tomar pedido' : 'Tomar pedido'}
            icon="pan-tool-alt"
            variant="secondary"
            onPress={runTake}
            loading={take.isPending}
            disabled={finish.isPending}
            style={styles.footerButton}
          />
          <AppButton
            label={complete ? 'Finalizar producción' : 'Valida todos los productos'}
            icon="check"
            onPress={runFinish}
            loading={finish.isPending}
            disabled={!complete || take.isPending}
            style={styles.footerButton}
          />
        </View>
      )}

      <ImageViewerModal product={viewing} onClose={() => setViewing(null)} onOpenPdf={openPdf} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    backgroundColor: colors.red,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 38,
    color: colors.white,
    letterSpacing: 0.5,
  },
  takenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  takenText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.white,
  },
  quoteBox: {
    backgroundColor: '#FEF6E7',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber,
    padding: spacing.lg,
    gap: spacing.md,
  },
  quoteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onAmber,
    textTransform: 'uppercase',
  },
  quoteNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.body,
  },
  progressBox: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  products: {
    gap: spacing.md,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  footerButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
