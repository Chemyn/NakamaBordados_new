import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';

import type { ProdProduct } from '@/lib/api';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

interface ImageViewerModalProps {
  product: ProdProduct | null;
  onClose: () => void;
  onOpenPdf: (url: string) => void;
}

/** Visor a pantalla completa: en el taller se revisa el diseño en grande. */
export function ImageViewerModal({ product, onClose, onOpenPdf }: ImageViewerModalProps) {
  return (
    <Modal visible={!!product} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar imagen"
          onPress={onClose}
          style={styles.close}
        >
          <MaterialIcons name="close" size={26} color={colors.white} />
        </Pressable>

        {!!product && (
          <>
            <Image
              source={{ uri: product.image_full || product.image_url }}
              style={styles.image}
              contentFit="contain"
              cachePolicy="disk"
            />
            <Text style={styles.name}>{product.name}</Text>
            {!!product.pdf_url && (
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenPdf(product.pdf_url)}
                style={({ pressed }) => [styles.pdfButton, pressed && styles.pressed]}
              >
                <MaterialIcons name="picture-as-pdf" size={20} color={colors.ink} />
                <Text style={styles.pdfLabel}>Ver patrón (PDF)</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  close: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.lg,
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '65%',
  },
  name: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
  },
  pdfButton: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  pdfLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});
