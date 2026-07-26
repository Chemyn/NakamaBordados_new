import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/lib/auth-context';
import type { SocialProvider } from '@/lib/auth';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET } from '@/lib/theme';

type Busy = 'none' | 'password' | SocialProvider;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithCredentials, signInWithProvider, sessionExpired } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<Busy>('none');
  const [error, setError] = useState<string | null>(null);

  async function run(task: Busy, action: () => Promise<void>) {
    setBusy(task);
    setError(null);
    try {
      await action();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.';
      // El usuario cerró la pestaña del navegador: no es un error que mostrar.
      if (message !== 'CANCELLED') setError(message);
    } finally {
      setBusy('none');
    }
  }

  const canSubmit = username.trim().length > 0 && password.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Nakama Bordados"
          />
          <Text style={styles.brandSubtitle}>Panel de Producción</Text>
        </View>

        <View style={styles.card}>
          {sessionExpired && (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <MaterialIcons name="schedule" size={18} color={colors.body} />
              <Text style={styles.noticeText}>Tu sesión expiró. Inicia sesión de nuevo.</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Usuario o correo</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              inputMode="email"
              placeholder="tu.usuario"
              placeholderTextColor={colors.muted}
              style={styles.input}
              editable={busy === 'none'}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.passwordInput]}
                editable={busy === 'none'}
                onSubmitEditing={() => {
                  if (canSubmit) void run('password', () => signInWithCredentials(username, password));
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => setShowPassword((visible) => !visible)}
                style={styles.eye}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={colors.muted}
                />
              </Pressable>
            </View>
          </View>

          {!!error && (
            <View style={styles.error} accessibilityLiveRegion="assertive">
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <AppButton
            label="Entrar"
            icon="login"
            onPress={() => run('password', () => signInWithCredentials(username, password))}
            loading={busy === 'password'}
            disabled={!canSubmit || busy !== 'none'}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continúa con</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <AppButton
              label="Google"
              variant="secondary"
              style={styles.flex}
              onPress={() => run('google', () => signInWithProvider('google'))}
              loading={busy === 'google'}
              disabled={busy !== 'none'}
            />
            <AppButton
              label="Facebook"
              variant="secondary"
              style={styles.flex}
              onPress={() => run('facebook', () => signInWithProvider('facebook'))}
              loading={busy === 'facebook'}
              disabled={busy !== 'none'}
            />
          </View>
        </View>

        <Text style={styles.footer}>
          Usa la misma cuenta de nakamabordados.com con permiso de producción.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.bg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.xs,
  },
  logo: {
    // 1024x463 en el original: mantiene la proporción del logotipo.
    width: 220,
    height: 100,
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadow.card,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: TOUCH_TARGET,
  },
  eye: {
    position: 'absolute',
    right: 0,
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.body,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
  },
});
