import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { colors, fonts, spacing } from '@/lib/theme';

import { AppButton } from './AppButton';

interface StateMessageProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  tone?: 'neutral' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado vacío o de error, siempre con texto (no solo un icono o un color). */
export function StateMessage({
  icon,
  title,
  description,
  tone = 'neutral',
  actionLabel,
  onAction,
}: StateMessageProps) {
  const accent = tone === 'error' ? colors.error : colors.muted;

  return (
    <View style={styles.wrapper} accessibilityLiveRegion="polite">
      <View style={[styles.iconCircle, tone === 'error' && { backgroundColor: colors.errorSoft }]}>
        <MaterialIcons name={icon} size={26} color={accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!actionLabel && !!onAction && (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
});
