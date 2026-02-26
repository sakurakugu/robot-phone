import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';

type SectionProps = {
  title?: string;
  children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      sectionHeader: { color: palette.textMuted },
      sectionGroup: {
        borderColor: palette.border,
        backgroundColor: palette.surface,
      },
    }),
    [palette],
  );
  return (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionHeader, themedStyles.sectionHeader]}>
          {title}
        </Text>
      )}
      <View
        style={[styles.sectionGroup, themedStyles.sectionGroup]}
      >
        {children}
      </View>
    </View>
  );
}

type InputRowProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isLast?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  keyboardType?:
    | 'default'
    | 'number-pad'
    | 'decimal-pad'
    | 'numeric'
    | 'email-address'
    | 'phone-pad';
};

export function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
  isLast = false,
  autoCapitalize,
  secureTextEntry,
  keyboardType,
}: InputRowProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      rowLabel: { color: palette.text },
      rowInput: { color: palette.textMuted },
      divider: { backgroundColor: palette.border },
    }),
    [palette],
  );
  return (
    <>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, themedStyles.rowLabel]}>{label}</Text>
        <TextInput
          style={[styles.rowInput, themedStyles.rowInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          textAlign="right"
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
        />
      </View>
      {!isLast && (
        <View style={[styles.divider, themedStyles.divider]} />
      )}
    </>
  );
}

type ActionRowProps = {
  label: string;
  onPress: () => void;
  isLast?: boolean;
  danger?: boolean;
  loading?: boolean;
  value?: string;
  subtitle?: string;
};

export function ActionRow({
  label,
  onPress,
  isLast = false,
  danger = false,
  loading = false,
  value,
  subtitle,
}: ActionRowProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      rowPressed: { backgroundColor: palette.surfaceAlt },
      rowNormal: { backgroundColor: palette.surface },
      rowLabelPrimary: { color: palette.primary },
      rowLabelDanger: { color: palette.danger },
      rowSubtitle: { color: palette.textMuted },
      rowValue: { color: palette.textMuted },
      divider: { backgroundColor: palette.border },
    }),
    [palette],
  );
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed ? themedStyles.rowPressed : themedStyles.rowNormal,
        ]}
        onPress={loading ? undefined : onPress}
      >
        <View style={styles.rowValueWrap}>
          <Text
            style={[
              styles.rowLabel,
              danger ? themedStyles.rowLabelDanger : themedStyles.rowLabelPrimary,
            ]}
          >
            {label}
          </Text>
          {subtitle && (
            <Text style={[styles.rowSubtitle, themedStyles.rowSubtitle]}>
              {subtitle}
            </Text>
          )}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={palette.textMuted} />
        ) : (
          value && (
            <Text style={[styles.rowValue, themedStyles.rowValue]}>
              {value}
            </Text>
          )
        )}
      </Pressable>
      {!isLast && (
        <View style={[styles.divider, themedStyles.divider]} />
      )}
    </>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
  labelColor?: string;
};

export function InfoRow({
  label,
  value,
  isLast = false,
  labelColor,
}: InfoRowProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      rowLabel: { color: labelColor ?? palette.text },
      rowValue: { color: palette.textMuted },
      divider: { backgroundColor: palette.border },
    }),
    [labelColor, palette],
  );
  return (
    <>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, themedStyles.rowLabel]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, themedStyles.rowValue]}>
          {value}
        </Text>
      </View>
      {!isLast && (
        <View style={[styles.divider, themedStyles.divider]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 16,
  },
  sectionGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  rowValueWrap: {
    flex: 1,
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 15,
    marginLeft: 8,
  },
  rowInput: {
    flex: 2,
    fontSize: 15,
    padding: 0,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
