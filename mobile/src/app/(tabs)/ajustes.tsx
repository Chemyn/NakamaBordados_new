import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { usePush, resetPushState } from '@/hooks/usePush';
import { useAuth } from '@/lib/auth-context';
import { API_ORIGIN } from '@/lib/config';
import { disablePush } from '@/lib/push';
import { colors, fonts, radius, spacing } from '@/lib/theme';

interface PushSummary {
  icon: 'notifications-active' | 'notifications-off' | 'sync' | 'error-outline';
  color: string;
  title: string;
  detail: string;
}

function summarize(state: ReturnType<typeof usePush>['state']): PushSummary {
  if (!state) {
    return { icon: 'sync', color: colors.muted, title: 'Comprobando…', detail: '' };
  }
  switch (state.status) {
    case 'enabled':
      return {
        icon: 'notifications-active',
        color: colors.green,
        title: 'Activadas',
        detail: 'Recibirás un aviso cuando entre un pedido nuevo a producción.',
      };
    case 'denied':
      return {
        icon: 'notifications-off',
        color: colors.error,
        title: 'Sin permiso',
        detail: 'Actívalas en los ajustes del teléfono para enterarte de los pedidos nuevos.',
      };
    case 'unsupported':
      return { icon: 'notifications-off', color: colors.muted, title: 'No disponibles', detail: state.reason };
    default:
      return { icon: 'error-outline', color: colors.error, title: 'Con problemas', detail: state.message };
  }
}

export default function SettingsScreen() {
  const { userName, signOut } = useAuth();
  const { state, checking, refresh } = usePush();
  const push = summarize(state);

  function confirmSignOut() {
    Alert.alert(
      'Cerrar sesión',
      '¿Salir de la app? Tendrás que volver a iniciar sesión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              // Se da de baja el dispositivo antes de perder el token de la sesión.
              await disablePush();
              resetPushState();
              await signOut();
            })();
          },
        },
      ],
      { cancelable: true },
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.card, styles.userCard]}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={26} color={colors.white} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName || 'Operador'}</Text>
          <Text style={styles.userMeta}>{API_ORIGIN.replace('https://', '')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowHead}>
          <MaterialIcons name={push.icon} size={22} color={push.color} />
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>Notificaciones</Text>
            <Text style={[styles.rowStatus, { color: push.color }]}>{push.title}</Text>
          </View>
        </View>

        {!!push.detail && <Text style={styles.rowDetail}>{push.detail}</Text>}

        <View style={styles.rowActions}>
          <AppButton
            label="Reintentar"
            variant="secondary"
            style={styles.flex}
            onPress={() => void refresh()}
            loading={checking}
          />
          {state?.status === 'denied' && (
            <AppButton
              label="Abrir ajustes"
              variant="secondary"
              style={styles.flex}
              onPress={() => void Linking.openSettings()}
            />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(
              '¿No llegan los avisos?',
              'Algunos teléfonos (Xiaomi, Huawei, Samsung) apagan las apps en segundo plano para ahorrar batería. En Ajustes del teléfono › Batería, excluye "Nakama Producción" del ahorro de energía.',
            )
          }
          style={styles.helpRow}
        >
          <MaterialIcons name="help-outline" size={18} color={colors.muted} />
          <Text style={styles.helpText}>¿No llegan los avisos?</Text>
        </Pressable>
      </View>

      <AppButton label="Cerrar sesión" icon="logout" variant="danger" onPress={confirmSignOut} />

      <Text style={styles.version}>
        Nakama Producción {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    gap: 2,
  },
  userName: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
  },
  userMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  rowStatus: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  rowDetail: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.body,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  helpText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  version: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
});
