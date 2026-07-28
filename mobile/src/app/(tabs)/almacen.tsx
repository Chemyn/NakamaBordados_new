import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

import { AppButton } from '@/components/AppButton';
import { SegmentedTabs, type SegmentOption } from '@/components/SegmentedTabs';
import { StateMessage } from '@/components/StateMessage';
import { StockRow } from '@/components/StockRow';
import { useApplyWarehouse, useWarehouseAlerts, useWarehouseItems } from '@/hooks/useWarehouse';
import type { WhBulkChange, WhItem } from '@/lib/warehouse-api';
import { colors, fonts, radius, spacing } from '@/lib/theme';

type Tab = 'stock' | 'alerts';

const TABS: readonly SegmentOption<Tab>[] = [
  { key: 'stock', label: 'Almacén completo', short: 'Almacén', color: colors.red, onColor: colors.white },
  { key: 'alerts', label: 'Faltantes', short: 'Faltantes', color: colors.amber, onColor: colors.onAmber },
];

/** Cambios pendientes de guardar, por id de variante. */
type Edits = Record<number, { stock?: number; min_stock?: number }>;

export default function WarehouseScreen() {
  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [edits, setEdits] = useState<Edits>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // El servidor filtra la búsqueda; se espera a que el operador deje de teclear.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const items = useWarehouseItems(query);
  const alerts = useWarehouseAlerts();
  const { apply, applying, progress, rowState, reset } = useApplyWarehouse();

  const active = tab === 'stock' ? items : alerts;
  const rows: WhItem[] = active.data ?? [];

  const byId = useMemo(() => {
    const map = new Map<number, WhItem>();
    for (const row of [...(items.data ?? []), ...(alerts.data ?? [])]) map.set(row.id, row);
    return map;
  }, [items.data, alerts.data]);

  // Un valor que vuelve al del servidor deja de contar como cambio pendiente.
  const setField = useCallback(
    (id: number, field: 'stock' | 'min_stock', value: number) => {
      setResult(null);
      setEdits((prev) => {
        const server = byId.get(id);
        const next = { ...prev, [id]: { ...prev[id], [field]: value } };
        const entry = next[id];
        if (server && entry.stock === server.stock) delete entry.stock;
        if (server && entry.min_stock === server.min_stock) delete entry.min_stock;
        if (entry.stock === undefined && entry.min_stock === undefined) delete next[id];
        return next;
      });
    },
    [byId],
  );

  const onChangeStock = useCallback((id: number, value: number) => setField(id, 'stock', value), [setField]);
  const onChangeMin = useCallback((id: number, value: number) => setField(id, 'min_stock', value), [setField]);
  const onToggle = useCallback((id: number) => setExpanded((prev) => (prev === id ? null : id)), []);

  const dirtyIds = Object.keys(edits).map(Number);

  const discard = () => {
    setEdits({});
    reset();
    setResult(null);
  };

  const save = async () => {
    const changes: WhBulkChange[] = dirtyIds.map((id) => ({ id, ...edits[id] }));
    const { saved, failed } = await apply(changes, (ids) => {
      // Lo ya guardado sale de pendientes aunque otro lote falle después.
      setEdits((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
    });

    void Haptics.notificationAsync(
      failed === 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );
    setResult(
      failed === 0
        ? `${saved} ${saved === 1 ? 'cambio guardado' : 'cambios guardados'}.`
        : `Se guardaron ${saved} de ${saved + failed}. Revisa las filas marcadas.`,
    );
  };

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
          title="No se pudo cargar el almacén"
          description={active.error instanceof Error ? active.error.message : undefined}
          actionLabel="Reintentar"
          onAction={() => void active.refetch()}
        />
      );
    }

    return (
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <StockRow
            item={item}
            draftStock={edits[item.id]?.stock}
            draftMin={edits[item.id]?.min_stock}
            expanded={expanded === item.id}
            saveState={rowState[item.id]}
            onToggle={onToggle}
            onChangeStock={onChangeStock}
            onChangeMin={onChangeMin}
          />
        )}
        contentContainerStyle={[
          styles.list,
          rows.length === 0 && styles.listEmpty,
          dirtyIds.length > 0 && styles.listWithBar,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={() => void active.refetch()}
            colors={[colors.red]}
            tintColor={colors.red}
          />
        }
        ListEmptyComponent={
          tab === 'alerts' ? (
            <StateMessage icon="check-circle" title="Todo en orden" description="Ninguna variante está por agotarse." />
          ) : (
            <StateMessage
              icon="inventory-2"
              title={query ? 'Sin resultados' : 'Almacén vacío'}
              description={
                query
                  ? `Nada coincide con "${query}".`
                  : 'Genera las variantes desde el panel de almacén de la web.'
              }
            />
          )
        }
      />
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={20} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar prenda, color o talla"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Buscar en el almacén"
        />
      </View>

      <SegmentedTabs
        options={TABS}
        value={tab}
        onChange={setTab}
        counts={{
          stock: items.isLoading ? undefined : String(items.data?.length ?? 0),
          alerts: alerts.isLoading ? undefined : String(alerts.data?.length ?? 0),
        }}
      />

      {!!result && (
        <Text style={styles.result} accessibilityLiveRegion="polite">
          {result}
        </Text>
      )}

      {renderBody()}

      {dirtyIds.length > 0 && (
        <View style={styles.bar}>
          <Text style={styles.barText}>
            {applying
              ? `Guardando ${progress.done}/${progress.total}…`
              : `${dirtyIds.length} ${dirtyIds.length === 1 ? 'cambio' : 'cambios'} sin guardar`}
          </Text>
          <AppButton label="Descartar" variant="secondary" onPress={discard} disabled={applying} />
          <AppButton label="Guardar" onPress={() => void save()} loading={applying} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  result: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.body,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listWithBar: {
    // Deja ver la última fila por encima de la barra de guardado.
    paddingBottom: 96,
  },
  separator: {
    height: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  barText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
});
