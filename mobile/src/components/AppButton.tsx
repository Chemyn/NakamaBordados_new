import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, fonts, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.red, fg: colors.white, border: colors.red },
  secondary: { bg: colors.white, fg: colors.ink, border: colors.border },
  danger: { bg: colors.errorSoft, fg: colors.error, border: colors.errorSoft },
  ghost: { bg: 'transparent', fg: colors.body, border: 'transparent' },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const palette = PALETTE[variant];
  const isBlocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      onPress={onPress}
      disabled={isBlocked}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        isBlocked && styles.blocked,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          icon && <MaterialIcons name={icon} size={20} color={palette.fg} />
        )}
        <Text style={[styles.label, { color: palette.fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET + 4,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 24,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  blocked: {
    opacity: 0.45,
  },
});
