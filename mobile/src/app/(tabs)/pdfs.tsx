import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppButton } from '@/components/AppButton';
import { StateMessage } from '@/components/StateMessage';
import { usePdfs } from '@/hooks/usePdfs';
import type { ProdPdf } from '@/lib/api';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

interface PickedFile {
  uri: string;
  /** Nombre sin extensión: es lo que el operador ajusta para que sea el SKU. */
  baseName: string;
}

type Feedback = { tone: 'ok' | 'error'; text: string; suggestions?: string[] } | null;

/** "HOD-001 — Hoodie Negro" -> "HOD-001" */
function skuFromSuggestion(suggestion: string): string {
  return suggestion.split('—')[0].trim();
}

export default function PdfsScreen() {
  const { list, upload, remove } = usePdfs();
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    setFeedback(null);
    setPicked({ uri: asset.uri, baseName: asset.name.replace(/\.pdf$/i, '') });
  }

  function submit(baseName: string) {
    if (!picked) return;
    const clean = baseName.trim();
    if (!clean) {
      setFeedback({ tone: 'error', text: 'Escribe el SKU del producto.' });
      return;
    }

    setFeedback(null);
    upload.mutate(
      { uri: picked.uri, fileName: `${clean}.pdf` },
      {
        onSuccess: (result) => {
          if (result.success) {
            setPicked(null);
            setFeedback({
              tone: 'ok',
              text: `Patrón guardado para ${result.product_name ?? clean}.`,
            });
            return;
          }
          setFeedback({
            tone: 'error',
            text: result.message ?? 'No se reconoció el SKU.',
            suggestions: result.suggestions,
          });
        },
        onError: (error) => setFeedback({ tone: 'error', text: error.message }),
      },
    );
  }

  function confirmDelete(pdf: ProdPdf) {
    Alert.alert(
      'Eliminar patrón',
      `Se eliminará el PDF de ${pdf.product_name}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(pdf.id) },
      ],
      { cancelable: true },
    );
  }

  const uploader = (
    <View style={styles.uploader}>
      <Text style={styles.uploaderTitle}>Subir patrón</Text>
      <Text style={styles.uploaderHint}>
        El archivo se guarda con el SKU del producto padre, por ejemplo HOD-001.
      </Text>

      {picked ? (
        <View style={styles.pickedBox}>
          <View style={styles.nameRow}>
            <TextInput
              value={picked.baseName}
              onChangeText={(baseName) => setPicked({ ...picked, baseName })}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="SKU"
              placeholderTextColor={colors.muted}
              style={styles.nameInput}
              editable={!upload.isPending}
            />
            <Text style={styles.extension}>.pdf</Text>
          </View>

          <View style={styles.pickedActions}>
            <AppButton
              label="Cancelar"
              variant="secondary"
              style={styles.flex}
              onPress={() => {
                setPicked(null);
                setFeedback(null);
              }}
              disabled={upload.isPending}
            />
            <AppButton
              label="Subir"
              icon="cloud-upload"
              style={styles.flex}
              onPress={() => submit(picked.baseName)}
              loading={upload.isPending}
            />
          </View>
        </View>
      ) : (
        <AppButton label="Elegir PDF" icon="attach-file" variant="secondary" onPress={() => void pickFile()} />
      )}

      {!!feedback && (
        <View
          style={[styles.feedback, feedback.tone === 'ok' ? styles.feedbackOk : styles.feedbackError]}
          accessibilityLiveRegion="polite"
        >
          <MaterialIcons
            name={feedback.tone === 'ok' ? 'check-circle' : 'error-outline'}
            size={18}
            color={feedback.tone === 'ok' ? colors.green : colors.error}
          />
          <View style={styles.flex}>
            <Text
              style={[
                styles.feedbackText,
                { color: feedback.tone === 'ok' ? colors.green : colors.error },
              ]}
            >
              {feedback.text}
            </Text>

            {!!feedback.suggestions?.length && (
              <>
                <Text style={styles.suggestionsTitle}>¿Quisiste decir?</Text>
                <View style={styles.suggestions}>
                  {feedback.suggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      accessibilityLabel={`Usar SKU ${skuFromSuggestion(suggestion)}`}
                      onPress={() => {
                        const sku = skuFromSuggestion(suggestion);
                        setPicked((current) => (current ? { ...current, baseName: sku } : current));
                        submit(sku);
                      }}
                      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );

  if (list.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={list.data ?? []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={uploader}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching}
          onRefresh={() => void list.refetch()}
          colors={[colors.red]}
          tintColor={colors.red}
        />
      }
      ListEmptyComponent={
        list.isError ? (
          <StateMessage
            icon="wifi-off"
            tone="error"
            title="No se pudieron cargar los patrones"
            actionLabel="Reintentar"
            onAction={() => void list.refetch()}
          />
        ) : (
          <StateMessage
            icon="picture-as-pdf"
            title="Sin patrones"
            description="Sube el primer PDF para que aparezca en los pedidos."
          />
        )
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.product_name}
            </Text>
            {!!item.sku && <Text style={styles.cardSku}>SKU {item.sku}</Text>}
            <Text style={styles.cardDate}>{item.uploaded_at}</Text>
          </View>

          <View style={styles.cardActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver patrón de ${item.product_name}`}
              onPress={() => void WebBrowser.openBrowserAsync(item.pdf_url)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="visibility" size={22} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Eliminar patrón de ${item.product_name}`}
              onPress={() => confirmDelete(item)}
              style={({ pressed }) => [styles.iconButton, styles.iconDanger, pressed && styles.pressed]}
            >
              <MaterialIcons name="delete-outline" size={22} color={colors.error} />
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  uploader: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  uploaderTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploaderHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.body,
  },
  pickedBox: {
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingRight: spacing.lg,
  },
  nameInput: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  extension: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
  },
  pickedActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  feedbackOk: {
    backgroundColor: colors.greenSoft,
  },
  feedbackError: {
    backgroundColor: colors.errorSoft,
  },
  feedbackText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionsTitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.body,
  },
  suggestions: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  suggestion: {
    minHeight: TOUCH_TARGET - 8,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  separator: {
    height: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  cardSku: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.red,
  },
  cardDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  iconDanger: {
    backgroundColor: colors.errorSoft,
  },
  pressed: {
    opacity: 0.85,
  },
});
