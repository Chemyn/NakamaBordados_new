import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useApkVersion } from '@/hooks/useApkVersion';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';
import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

/**
 * Aviso de actualización en el tablero.
 *
 * Dos vías, y el APK manda: una versión nueva del APK trae cambios que las
 * actualizaciones por aire no pueden entregar, así que ese aviso tiene
 * prioridad. Descargar abre el navegador (Android se encarga de instalar): así
 * la app no necesita el permiso de instalar paquetes, que es de los que hacen
 * saltar al antivirus del teléfono.
 */
export function UpdateBanner() {
  const apk = useApkVersion();
  const ota = useOtaUpdate();

  if (apk.available) {
    return (
      <Banner
        icon="system-update"
        title={`Nueva versión ${apk.version} disponible`}
        description={apk.notes}
        action="Descargar"
        onPress={() => {
          if (apk.apkUrl) void Linking.openURL(apk.apkUrl);
        }}
      />
    );
  }

  if (ota.status === 'ready') {
    return (
      <Banner
        icon="refresh"
        title="Actualización lista"
        description="Reinicia la app para aplicarla."
        action="Reiniciar"
        onPress={ota.apply}
      />
    );
  }

  return null;
}

interface BannerProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  action: string;
  onPress: () => void;
}

function Banner({ icon, title, description, action, onPress }: BannerProps) {
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <MaterialIcons name={icon} size={20} color={colors.red} />

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={onPress}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionLabel}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.redSoft,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.ink,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.body,
  },
  action: {
    minHeight: TOUCH_TARGET - 12,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.red,
  },
  pressed: {
    opacity: 0.85,
  },
  actionLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.white,
  },
});
