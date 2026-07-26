import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OrderCard } from '@/components/OrderCard';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StateMessage } from '@/components/StateMessage';
import { useOrders } from '@/hooks/useOrders';
import type { ProdColumn } from '@/lib/api';
import { columnMeta } from '@/lib/columns';
import { colors, fonts, spacing } from '@/lib/theme';

/** "5+" cuando el servidor avisa que quedan páginas por cargar. */
function badge(count: number, hasMore: boolean, ready: boolean): string | undefined {
  if (!ready) return undefined;
  return hasMore ? `${count}+` : String(count);
}

export default function BoardScreen() {
  const router = useRouter();
  const [column, setColumn] = useState<ProdColumn>('processing');
  const meta = columnMeta(column);

  // Las tres columnas se cargan a la vez: los conteos del selector son reales y
  // cambiar de etapa es instantáneo. Son 5 pedidos por columna, no pesa.
  const processing = useOrders('processing');
  const fabricando = useOrders('tomados');
  const pendienteGuia = useOrders('pendiente-guia');
  const byColumn = { processing, tomados: fabricando, 'pendiente-guia': pendienteGuia };
  const active = byColumn[column];

  // Un doble toque con guantes no debe apilar dos veces la misma pantalla.
  const lastOpen = useRef(0);
  const openOrder = useCallback(
    (id: number) => {
      const now = Date.now();
      if (now - lastOpen.current < 700) return;
      lastOpen.current = now;
      router.push(`/order/${id}`);
    },
    [router],
  );

  const renderBody = () => {
    if (active.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.red} size="large" />
        </View>
      );
    }

    if (active.isError) {
      return (
        <StateMessage
          icon="wifi-off"
          tone="error"
          title="No se pudieron cargar los pedidos"
          description={active.error instanceof Error ? active.error.message : undefined}
          actionLabel="Reintentar"
          onAction={() => void active.refetch()}
        />
      );
    }

    return (
      <FlatList
        data={active.orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            accent={meta.color}
            onPress={openOrder}
            // En "Pendiente de guía" el trabajo ya terminó: el progreso no aporta.
            showProgress={column !== 'pendiente-guia'}
          />
        )}
        contentContainerStyle={[styles.list, active.orders.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching && !active.isFetchingNextPage}
            onRefresh={() => void active.refetch()}
            colors={[colors.red]}
            tintColor={colors.red}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (active.hasMore && !active.isFetchingNextPage) void active.fetchNextPage();
        }}
        ListEmptyComponent={<StateMessage icon="inbox" title="Sin pedidos" description={meta.empty} />}
        ListFooterComponent={
          active.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footerLoader} color={colors.red} />
          ) : null
        }
      />
    );
  };

  return (
    <View style={styles.screen}>
      <SegmentedTabs
        value={column}
        onChange={setColumn}
        counts={{
          processing: badge(processing.count, processing.hasMore, !processing.isLoading),
          tomados: badge(fabricando.count, fabricando.hasMore, !fabricando.isLoading),
          'pendiente-guia': badge(
            pendienteGuia.count,
            pendienteGuia.hasMore,
            !pendienteGuia.isLoading,
          ),
        }}
      />

      <View style={styles.columnHeader}>
        <View style={[styles.columnDot, { backgroundColor: meta.color }]} />
        <Text style={styles.columnTitle}>{meta.label}</Text>
      </View>

      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  columnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  columnTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
});
