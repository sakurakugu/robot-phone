import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { getActiveEnvironment } from '../../../shared/config/environment';

type SettingsRowProps = {
  label: string;
  value?: string;
  loading?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
};

function SettingsRow({
  label,
  value,
  loading = false,
  onPress,
  showChevron = true,
  isLast = false,
}: SettingsRowProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      rowNormal: { backgroundColor: palette.surface },
      rowPressed: { backgroundColor: palette.surfaceAlt },
      label: { color: palette.text },
      value: { color: palette.textMuted },
      chevron: { color: palette.textMuted },
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
        onPress={onPress}
        android_ripple={{ color: palette.surfaceAlt }}
      >
        <Text style={[styles.rowLabel, themedStyles.label]}>{label}</Text>
        <View style={styles.rowRight}>
          {loading ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : null}
          {value ? (
            <Text style={[styles.rowValue, themedStyles.value]}>{value}</Text>
          ) : null}
          {showChevron && (
            <Text style={[styles.chevron, themedStyles.chevron]}>›</Text>
          )}
        </View>
      </Pressable>
      {!isLast && <View style={[styles.divider, themedStyles.divider]} />}
    </>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      header: { color: palette.textMuted },
      group: { borderColor: palette.border },
    }),
    [palette],
  );
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionHeader, themedStyles.header]}>{title}</Text>
      <View style={[styles.sectionGroup, themedStyles.group]}>
        {children}
      </View>
    </View>
  );
}

const THEME_LABEL: Record<string, string> = {
  light: '浅色模式',
  dark: '深色模式',
  system: '跟随系统',
};

const ORIENTATION_LABEL: Record<string, string> = {
  portrait: '竖向',
  landscape: '横向',
};

export function SettingsScreen() {
  const palette = usePalette();
  const { themeMode, homeOrientation } = useAppPreferences();
  const navigation = useNavigation<any>();
  const [activeEnvName, setActiveEnvName] = useState(getActiveEnvironment().name);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const themedStyles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: palette.background },
    }),
    [palette],
  );

  const reload = useCallback(() => {
    setActiveEnvName(getActiveEnvironment().name);
  }, []);

  useFocusEffect(reload);

  const handleCheckUpdate = useCallback(() => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    if (Platform.OS === 'android') {
      ToastAndroid.show('正在检查更新（未实现）', ToastAndroid.SHORT);
    }
    setTimeout(() => {
      setCheckingUpdate(false);
    }, 1200);
  }, [checkingUpdate]);

  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={styles.content}
    >
      <Section title="外观">
        <SettingsRow
          label="主题模式"
          value={THEME_LABEL[themeMode] ?? themeMode}
          onPress={() => navigation.navigate('外观设置')}
        />
        <SettingsRow
          label="主页方向"
          value={ORIENTATION_LABEL[homeOrientation] ?? homeOrientation}
          onPress={() => navigation.navigate('外观设置')}
          isLast
        />
      </Section>

      <Section title="网络与服务端">
        <SettingsRow
          label="服务器环境"
          value={activeEnvName}
          onPress={() => navigation.navigate('服务器环境')}
          isLast
        />
      </Section>

      <Section title="关于">
        <SettingsRow
          label="应用名称"
          value="RobotPhone"
          showChevron={false}
          isLast={false}
        />
        <SettingsRow
          label="版本"
          value="0.1.0"
          showChevron={false}
          loading={checkingUpdate}
          onPress={handleCheckUpdate}
          isLast
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
    marginHorizontal: 20,
  },
  sectionGroup: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
    marginRight: -4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
