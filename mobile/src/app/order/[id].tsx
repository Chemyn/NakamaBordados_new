import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppButton } from '@/components/AppButton';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { ProductRow } from '@/components/ProductRow';
import { ProgressBar } from '@/components/ProgressBar';
import { QualityReviewPanel } from '@/components/QualityReviewPanel';
import { StateMessage } from '@/components/StateMessage';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import type { ProdProduct, ProdReviewItemInput } from '@/lib/api';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const orderId = Number(params.id);

  const { detail, validate, take, finish, review, reassign } = useOrderDetail(orderId);
  const [viewing, setViewing] = useState<ProdProduct | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignReason, setReassignReason] = useState('');

  const order = detail.data;
  const inProduction = !!order && (order.status === 'processing' || order.status === 'fabricando');
  const canValidate = !!order && order.status === 'fabricando' && order.is_cycle_owner;
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

  const runReview = async (decision: 'approved' | 'rework', items: ProdReviewItemInput[]) => {
    setActionError(null);
    await review.mutateAsync({ decision, items });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const runReassign = () => {
    const reason = reassignReason.trim();
    if (!reason) {
      setActionError('Indica el motivo para liberar el pedido.');
      return;
    }
    setActionError(null);
    reassign.mutate(reason, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      },
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
              canValidate={canValidate}
              showValidation={inProduction}
              busy={validate.isPending && validate.variables?.itemId === product.item_id}
              onToggleValidated={toggleValidated}
              onOpenImage={setViewing}
              onOpenPdf={openPdf}
            />
          ))}
        </View>

        {order.cycles.length > 0 && (
          <View style={styles.history}>
            <View style={styles.historyHeading}>
              <Text style={styles.historyTitle}>Historial de produccion</Text>
              <Text style={styles.historyTotal}>Total {formatDuration(order.total_duration_seconds)}</Text>
            </View>
            {order.cycles.map((cycle) => (
              <View style={styles.historyRow} key={cycle.id}>
                <View style={styles.historyMain}>
                  <Text style={[styles.historyCycle, cycle.type === 'rework' && styles.historyRework]}>
                    Ciclo {cycle.number} · {cycle.type === 'rework' ? 'Retrabajo' : 'Inicial'}
                  </Text>
                  <Text style={styles.historyOperator}>{cycle.operator_name || 'Sin operador'}</Text>
                </View>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyValue}>{cycle.units_total} pzas</Text>
                  <Text style={styles.historyValue}>{cycle.status === 'active' ? 'En curso' : formatDuration(cycle.duration_seconds)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {order.status === 'pendiente-guia' && order.can_review && (
          <QualityReviewPanel
            key={`${order.id}:${order.cycle_number}`}
            order={order}
            busy={review.isPending}
            onReview={runReview}
          />
        )}

        {order.status === 'pendiente-guia' && !order.can_review && (
          <View style={styles.notice}>
            <MaterialIcons name="verified-user" size={20} color={colors.amber} />
            <Text style={styles.noticeText}>Pendiente de revision por un supervisor de calidad.</Text>
          </View>
        )}

        {order.status === 'fabricando' && !order.is_cycle_owner && (
          <View style={styles.notice}>
            <MaterialIcons name="person" size={20} color={colors.blue} />
            <Text style={styles.noticeText}>Este ciclo esta asignado a {order.taken_by || 'otro operador'}.</Text>
          </View>
        )}

        {order.status === 'fabricando' && order.can_review && order.active_cycle && (
          <View style={styles.reassignBox}>
            {!showReassign ? (
              <AppButton
                label="Liberar asignacion"
                icon="person-off"
                variant="ghost"
                onPress={() => setShowReassign(true)}
              />
            ) : (
              <>
                <Text style={styles.inputLabel}>Motivo de la liberacion</Text>
                <TextInput
                  multiline
                  numberOfLines={2}
                  editable={!reassign.isPending}
                  value={reassignReason}
                  onChangeText={setReassignReason}
                  placeholder="Describe el motivo"
                  placeholderTextColor={colors.muted}
                  style={styles.reasonInput}
                />
                <View style={styles.reassignActions}>
                  <AppButton
                    label="Cancelar"
                    variant="secondary"
                    disabled={reassign.isPending}
                    onPress={() => setShowReassign(false)}
                    style={styles.footerButton}
                  />
                  <AppButton
                    label="Liberar"
                    icon="person-off"
                    variant="danger"
                    loading={reassign.isPending}
                    disabled={!reassignReason.trim()}
                    onPress={runReassign}
                    style={styles.footerButton}
                  />
                </View>
              </>
            )}
          </View>
        )}

        {!!actionError && (
          <View style={styles.error} accessibilityLiveRegion="assertive">
            <MaterialIcons name="error-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        )}
      </ScrollView>

      {order.status === 'processing' && (
        <View style={styles.footer}>
          <AppButton
            label="Tomar pedido"
            icon="pan-tool-alt"
            onPress={runTake}
            loading={take.isPending}
            style={styles.footerButton}
          />
        </View>
      )}

      {order.status === 'fabricando' && order.is_cycle_owner && (
        <View style={styles.footer}>
          <AppButton
            label={complete ? 'Finalizar producción' : 'Valida todos los productos'}
            icon="check"
            onPress={runFinish}
            loading={finish.isPending}
            disabled={!complete}
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
  history: {
    borderTopColor: colors.ink,
    borderTopWidth: 3,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  historyHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  historyTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 22,
    textTransform: 'uppercase',
  },
  historyTotal: {
    color: colors.muted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  historyRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  historyMain: { flex: 1 },
  historyCycle: { color: colors.body, fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase' },
  historyRework: { color: colors.error },
  historyOperator: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 2 },
  historyMeta: { alignItems: 'flex-end' },
  historyValue: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.body,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  reassignBox: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inputLabel: {
    color: colors.body,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  reasonInput: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 14,
    minHeight: 72,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  reassignActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
