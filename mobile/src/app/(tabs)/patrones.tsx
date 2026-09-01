import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppButton } from '@/components/AppButton';
import { StateMessage } from '@/components/StateMessage';
import { useProductionPdfs } from '@/hooks/useProductionPdfs';
import { uploadProductionPdf } from '@/lib/api';
import {
  uploadProductionPdfBatch,
  type MobilePdfUploadFailure,
} from '@/lib/production-pdf-batch';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

interface UploadFeedback {
  tone: 'success' | 'error';
  title: string;
  failures: MobilePdfUploadFailure[];
}

export default function PatternsScreen() {
  const { list, remove, refresh } = useProductionPdfs();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);

  const uploading = progress !== null;

  const pickAndUpload = async () => {
    setFeedback(null);
    let picked: DocumentPicker.DocumentPickerResult;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: error instanceof Error ? error.message : 'No se pudo abrir el selector de archivos.',
        failures: [],
      });
      return;
    }
    if (picked.canceled) return;

    const files = picked.assets.filter((file) => file.name.toLowerCase().endsWith('.pdf'));
    const rejected = picked.assets.length - files.length;
    if (files.length === 0) {
      setFeedback({
        tone: 'error',
        title: 'Selecciona archivos PDF válidos.',
        failures: [],
      });
      return;
    }

    setProgress({ done: 0, total: files.length });
    const result = await uploadProductionPdfBatch(files, uploadProductionPdf, (done, total) => {
      setProgress({ done, total });
    });
    setProgress(null);

    if (result.uploaded > 0) {
      await refresh();
    }

    const failed = result.failures.length + rejected;
    if (failed === 0) {
      setFeedback({
        tone: 'success',
        title: `${result.uploaded} ${result.uploaded === 1 ? 'patrón subido' : 'patrones subidos'} correctamente.`,
        failures: [],
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setFeedback({
        tone: 'error',
        title: `${result.uploaded} de ${picked.assets.length} archivos se subieron. Revisa los que fallaron.`,
        failures: [
          ...result.failures,
          ...(rejected
            ? [{ fileName: `${rejected} archivo(s)`, message: 'No tenían extensión .pdf.' }]
            : []),
        ],
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const confirmDelete = (id: number, productName: string) => {
    Alert.alert('Eliminar patrón', `¿Eliminar el patrón de ${productName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setFeedback(null);
          remove.mutate(id, {
            onError: (error) =>
              setFeedback({
                tone: 'error',
                title: error instanceof Error ? error.message : 'No se pudo eliminar el patrón.',
                failures: [],
              }),
          });
        },
      },
    ]);
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={list.data ?? []}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching && !uploading}
          onRefresh={() => void list.refetch()}
          colors={[colors.red]}
          tintColor={colors.red}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.uploadCard}>
            <View style={styles.uploadHeading}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="upload-file" size={24} color={colors.red} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>Subir patrones</Text>
                <Text style={styles.help}>
                  Selecciona uno o varios PDF. Cada archivo debe llamarse como el SKU del producto,
                  por ejemplo HOD-001.pdf.
                </Text>
              </View>
            </View>

            <AppButton
              label={progress ? `Subiendo ${progress.done}/${progress.total}` : 'Seleccionar PDFs'}
              icon="drive-folder-upload"
              loading={uploading}
              disabled={remove.isPending}
              onPress={() => void pickAndUpload()}
            />

            {feedback && (
              <View
                style={[styles.feedback, feedback.tone === 'success' ? styles.success : styles.failure]}
                accessibilityLiveRegion="polite"
              >
                <MaterialIcons
                  name={feedback.tone === 'success' ? 'check-circle' : 'error-outline'}
                  size={20}
                  color={feedback.tone === 'success' ? colors.green : colors.error}
                />
                <View style={styles.flex}>
                  <Text
                    style={feedback.tone === 'success' ? styles.successText : styles.failureText}
                  >
                    {feedback.title}
                  </Text>
                  {feedback.failures.map((failure, index) => (
                    <Text style={styles.failureDetail} key={`${failure.fileName}:${index}`}>
                      {failure.fileName}: {failure.message}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Patrones disponibles</Text>
        </View>
      }
      renderItem={({ item }) => {
        const deleting = remove.isPending && remove.variables === item.id;
        return (
          <View style={styles.patternCard}>
            <View style={styles.patternHeading}>
              <MaterialIcons name="picture-as-pdf" size={24} color={colors.red} />
              <View style={styles.flex}>
                <Text style={styles.productName}>{item.product_name}</Text>
                <Text style={styles.sku}>{item.sku ? `SKU ${item.sku}` : 'Sin SKU'}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <AppButton
                label="Ver"
                icon="visibility"
                variant="secondary"
                style={styles.flex}
                disabled={remove.isPending}
                onPress={() => void WebBrowser.openBrowserAsync(item.pdf_url)}
              />
              <AppButton
                label="Eliminar"
                icon="delete-outline"
                variant="danger"
                style={styles.flex}
                loading={deleting}
                disabled={remove.isPending && !deleting}
                onPress={() => confirmDelete(item.id, item.product_name)}
              />
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        list.isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.red} size="large" />
        ) : list.isError ? (
          <StateMessage
            icon="wifi-off"
            tone="error"
            title="No se pudieron cargar los patrones"
            description={list.error instanceof Error ? list.error.message : undefined}
            actionLabel="Reintentar"
            onAction={() => void list.refetch()}
          />
        ) : (
          <StateMessage
            icon="picture-as-pdf"
            title="Aún no hay patrones"
            description="Selecciona varios PDF para agregarlos en un solo lote."
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerBlock: { gap: spacing.xl, marginBottom: spacing.md },
  uploadCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  uploadHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 31,
    textTransform: 'uppercase',
  },
  help: { color: colors.body, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  feedback: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  success: { backgroundColor: colors.greenSoft },
  failure: { backgroundColor: colors.errorSoft },
  successText: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
  failureText: { color: colors.error, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
  failureDetail: {
    color: colors.body,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  patternCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  patternHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  productName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  sku: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  separator: { height: spacing.md },
  loader: { marginVertical: spacing.xxl },
});
