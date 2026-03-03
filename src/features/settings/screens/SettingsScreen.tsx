import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { getActiveEnvironment } from '../../../shared/config/environment';
import { Toast } from '../../../shared/ui/Toast';
import { UpdateDialog } from '../components/UpdateDialog';
import {
  checkForUpdate,
  type ReleaseChannel,
  type UpdateCheckResult,
} from '../services/updateService';

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
      <View style={[styles.sectionGroup, themedStyles.group]}>{children}</View>
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

type SwitchRowProps = {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
};

function SwitchRow({
  label,
  value,
  onValueChange,
  isLast = false,
}: SwitchRowProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      row: { backgroundColor: palette.surface },
      label: { color: palette.text },
      divider: { backgroundColor: palette.border },
    }),
    [palette],
  );
  return (
    <>
      <View style={[styles.row, themedStyles.row]}>
        <Text style={[styles.rowLabel, themedStyles.label]}>{label}</Text>
        <Switch value={value} onValueChange={onValueChange} />
      </View>
      {!isLast && <View style={[styles.divider, themedStyles.divider]} />}
    </>
  );
}

const STORAGE_KEY_AUTO_UPDATE = '@robot:auto_update';
const STORAGE_KEY_BETA_CHANNEL = '@robot:beta_channel';

export function SettingsScreen() {
  const palette = usePalette();
  const { themeMode, homeOrientation } = useAppPreferences();
  const navigation = useNavigation<any>();
  const [activeEnvName, setActiveEnvName] = useState(
    getActiveEnvironment().name,
  );
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [betaChannel, setBetaChannel] = useState(false);
  const [updateDialogVisible, setUpdateDialogVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

  const themedStyles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: palette.background },
    }),
    [palette],
  );

  // 加载持久化偏好
  useEffect(() => {
    (async () => {
      const [rawAuto, rawBeta] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_AUTO_UPDATE),
        AsyncStorage.getItem(STORAGE_KEY_BETA_CHANNEL),
      ]);
      if (rawAuto === 'true') setAutoUpdate(true);
      if (rawBeta === 'true') setBetaChannel(true);
    })();
  }, []);

  const toggleAutoUpdate = useCallback((v: boolean) => {
    setAutoUpdate(v);
    AsyncStorage.setItem(STORAGE_KEY_AUTO_UPDATE, String(v)).catch(() => {});
  }, []);

  const toggleBetaChannel = useCallback((v: boolean) => {
    setBetaChannel(v);
    AsyncStorage.setItem(STORAGE_KEY_BETA_CHANNEL, String(v)).catch(() => {});
  }, []);

  const reload = useCallback(() => {
    setActiveEnvName(getActiveEnvironment().name);
  }, []);

  useFocusEffect(reload);

  // 自动检查更新（进入设置页时，如果开启了自动更新）
  useEffect(() => {
    if (autoUpdate) {
      doCheckUpdate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doCheckUpdate = useCallback(
    async (silent = false) => {
      if (checkingUpdate) return;
      setCheckingUpdate(true);
      try {
        const channel: ReleaseChannel = betaChannel ? 'beta' : 'stable';
        const result = await checkForUpdate(channel);
        if (result.hasUpdate) {
          setUpdateInfo(result);
          setUpdateDialogVisible(true);
        } else if (!silent) {
          Toast.show('已是最新版本', Toast.SHORT);
        }
      } catch (e: any) {
        if (!silent) {
          Toast.show(e.message || '检查更新失败', Toast.SHORT);
        }
      } finally {
        setCheckingUpdate(false);
      }
    },
    [checkingUpdate, betaChannel],
  );

  const handleCheckUpdate = useCallback(() => {
    doCheckUpdate(false);
  }, [doCheckUpdate]);

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

      <Section title="更新">
        <SwitchRow
          label="自动检查更新"
          value={autoUpdate}
          onValueChange={toggleAutoUpdate}
        />
        <SwitchRow
          label="接收测试版更新"
          value={betaChannel}
          onValueChange={toggleBetaChannel}
        />
        <SettingsRow
          label="版本历史"
          onPress={() => navigation.navigate('版本历史')}
          isLast
        />
      </Section>

      <Section title="关于">
        <SettingsRow
          label="应用名称"
          value={DeviceInfo.getApplicationName()}
          showChevron={false}
          isLast={false}
        />
        <SettingsRow
          label="版本"
          value={DeviceInfo.getVersion()}
          showChevron={false}
          loading={checkingUpdate}
          onPress={handleCheckUpdate}
          isLast
        />
      </Section>

      <UpdateDialog
        visible={updateDialogVisible}
        updateInfo={updateInfo}
        onClose={() => setUpdateDialogVisible(false)}
      />
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
