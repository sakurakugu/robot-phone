import { useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import {
  ActionRow,
  InfoRow,
  InputRow,
  Section,
} from '../components/SettingsComponents';
import { RobotClient } from '../robotClient';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
  robotIp: string;
};

type ConfigField = {
  section: string;
  key: string;
  full_key: string;
  description: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'list';
  readonly: boolean;
  default: any;
  options?: string[] | null;
};

type ConfigSection = {
  section: string;
  title: string;
  keys: string[];
};

// ── 弹窗选择器 ──
type SelectModalProps = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
};
function SelectModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: SelectModalProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      sheet: { backgroundColor: palette.surface },
      title: { color: palette.text },
      itemBorder: { borderBottomColor: palette.border },
      itemSelected: { backgroundColor: palette.surfaceAlt },
      itemText: { color: palette.text },
      itemTextSelected: { color: palette.primary },
      check: { color: palette.primary },
      cancel: { backgroundColor: palette.surfaceAlt },
      cancelText: { color: palette.text },
    }),
    [palette],
  );
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, themedStyles.sheet]}>
          <Text style={[modalStyles.title, themedStyles.title]}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  modalStyles.item,
                  themedStyles.itemBorder,
                  item === selected && themedStyles.itemSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[
                    item === selected
                      ? themedStyles.itemTextSelected
                      : themedStyles.itemText,
                  ]}
                >
                  {item}
                </Text>
                {item === selected && <Text style={themedStyles.check}>✓</Text>}
              </Pressable>
            )}
          />
          <Pressable
            style={[modalStyles.cancel, themedStyles.cancel]}
            onPress={onClose}
          >
            <Text style={themedStyles.cancelText}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { margin: 16, padding: 12, borderRadius: 10, alignItems: 'center' },
});

export function RobotConfigScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const { robotIp } = (route.params || {}) as RouteParams;
  const themedStyles = useMemo(
    () => ({
      message: { color: palette.warning },
      boolLabel: { color: palette.text },
      selectValue: { color: palette.textMuted },
      selectArrow: { color: palette.textMuted, marginLeft: 4 },
    }),
    [palette],
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState<RobotClient | null>(null);

  // 通用配置表单状态
  const [configData, setConfigData] = useState<
    Record<string, Record<string, any>>
  >({});
  const [configFields, setConfigFields] = useState<ConfigField[]>([]);
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);
  // 弹窗选择器状态
  const [selectModal, setSelectModal] = useState<{
    fullKey: string;
    options: string[];
  } | null>(null);

  // SDK State
  const [sdkTargetIp, setSdkTargetIp] = useState('');
  const [sdkTargetPort, setSdkTargetPort] = useState('43988');

  // Motion State
  const [motionSdkClientIp, setMotionSdkClientIp] = useState('');

  useEffect(() => {
    if (robotIp) {
      const c = new RobotClient(robotIp);
      setClient(c);
      c.login().catch(() => {});
    }
  }, [robotIp]);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      setMessage('');
      await fn();
    } catch (e: any) {
      setMessage(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 通用配置 ──
  const handleLoadConfig = async () => {
    if (!client) return;
    await withLoading(async () => {
      const [configRes, fieldsRes, sectionsRes] = await Promise.all([
        client.getConfig(),
        client.getConfigFields(),
        client.getConfigSections(),
      ]);
      if (configRes.success && fieldsRes.success && sectionsRes.success) {
        setConfigData(configRes.config);
        setConfigFields(fieldsRes.fields || []);
        setConfigSections(sectionsRes.sections || []);
        setConfigLoaded(true);
        setMessage('配置加载成功');
      }
    });
  };

  const handleSaveConfig = async () => {
    if (!client) return;
    await withLoading(async () => {
      // 将表单数据转换为 { "section.key": typedValue } 格式
      const updates: Record<string, any> = {};
      const fieldsMap = Object.fromEntries(
        configFields.map(f => [f.full_key, f]),
      );
      for (const sec of configSections) {
        const sectionData = configData[sec.section] || {};
        for (const key of sec.keys) {
          const fullKey = `${sec.section}.${key}`;
          const field = fieldsMap[fullKey];
          if (!field || field.readonly) continue;
          const rawVal = sectionData[key];
          let val: any = rawVal;
          if (field.type === 'int') val = parseInt(String(rawVal), 10) || 0;
          else if (field.type === 'float')
            val = parseFloat(String(rawVal)) || 0;
          else if (field.type === 'bool') val = Boolean(rawVal);
          updates[fullKey] = val;
        }
      }
      const res = await client.updateConfig(updates);
      if (res.success) setMessage('配置已保存');
    });
  };

  const updateField = (section: string, key: string, value: any) => {
    setConfigData(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }));
  };

  // ── SDK 配置 ──
  const handleLoadSdkConfig = async () => {
    if (!client) return;
    await withLoading(async () => {
      const res = await client.getSdkConfig();
      if (res.success) {
        setSdkTargetIp(res.config.target_ip || '');
        setSdkTargetPort(String(res.config.target_port || '43988'));
        setMessage('SDK配置加载成功');
      }
    });
  };

  const handleUpdateSdkConfig = async () => {
    if (!client) return;
    await withLoading(async () => {
      const res = await client.updateSdkConfig(
        sdkTargetIp,
        parseInt(sdkTargetPort, 10),
      );
      if (res.success) setMessage('SDK配置已更新');
    });
  };

  // ── 运控配置 ──
  const handleLoadMotionConfig = async () => {
    if (!client) return;
    await withLoading(async () => {
      const res = await client.getMotionConfig();
      if (res.success) {
        setMotionSdkClientIp(res.config.sdk_client_ip || '');
        setMessage('运控配置加载成功');
      }
    });
  };

  const handleUpdateMotionConfig = async () => {
    if (!client) return;
    await withLoading(async () => {
      const res = await client.updateMotionConfig(motionSdkClientIp);
      if (res.success) setMessage('运控配置已更新');
    });
  };

  const handleRestartMotion = async () => {
    if (!client) return;
    Alert.alert(
      '重启运控服务',
      '⚠️ 警告：重启运控前请确保机器狗已经卧倒，否则会急停！\n确定要重启吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定重启',
          style: 'destructive',
          onPress: async () => {
            await withLoading(async () => {
              const res = await client.restartMotion();
              if (res.success) setMessage('运控服务正在重启...');
            });
          },
        },
      ],
    );
  };

  // ── 渲染配置字段 ──
  const renderConfigField = (field: ConfigField, isLast: boolean) => {
    const sectionData = configData[field.section] || {};
    const value = sectionData[field.key] ?? field.default;
    const options = field.options;

    if (field.readonly) {
      return (
        <InfoRow
          key={field.full_key}
          label={field.description}
          value={String(value ?? '')}
          isLast={isLast}
          labelColor={palette.textMuted}
        />
      );
    }

    if (field.type === 'bool') {
      return (
        <React.Fragment key={field.full_key}>
          <View style={cfgStyles.boolRow}>
            <Text style={[cfgStyles.boolLabel, themedStyles.boolLabel]}>
              {field.description}
            </Text>
            <Switch
              value={Boolean(value)}
              onValueChange={v => updateField(field.section, field.key, v)}
              trackColor={{ false: palette.surfaceAlt, true: palette.primary }}
            />
          </View>
          {!isLast && (
            <View
              style={[cfgStyles.divider, { backgroundColor: palette.border }]}
            />
          )}
        </React.Fragment>
      );
    }

    if (options && options.length) {
      return (
        <React.Fragment key={field.full_key}>
          <Pressable
            style={cfgStyles.selectRow}
            onPress={() => setSelectModal({ fullKey: field.full_key, options })}
          >
            <Text style={[cfgStyles.boolLabel, { color: palette.text }]}>
              {field.description}
            </Text>
            <View style={cfgStyles.selectValueRow}>
              <Text style={themedStyles.selectValue}>{String(value)}</Text>
              <Text style={themedStyles.selectArrow}>›</Text>
            </View>
          </Pressable>
          {!isLast && (
            <View
              style={[cfgStyles.divider, { backgroundColor: palette.border }]}
            />
          )}
        </React.Fragment>
      );
    }

    return (
      <InputRow
        key={field.full_key}
        label={field.description}
        value={String(value ?? '')}
        onChangeText={v => updateField(field.section, field.key, v)}
        placeholder={String(field.default ?? '')}
        keyboardType={
          field.type === 'int' || field.type === 'float' ? 'numeric' : 'default'
        }
        autoCapitalize="none"
        isLast={isLast}
      />
    );
  };

  // 找到当前弹窗对应的 field 和当前值
  const selectModalField = selectModal
    ? configFields.find(f => f.full_key === selectModal.fullKey)
    : null;
  const selectModalCurrent = selectModalField
    ? String(
        (configData[selectModalField.section] || {})[selectModalField.key] ??
          '',
      )
    : '';

  return (
    <Screen
      palette={palette}
      // title="高级配置"
      // subtitle={robotName || robotUuid}
      unsafeTop={true}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <Text style={[styles.message, themedStyles.message]}>{message}</Text>
        ) : null}

        <Section title="SDK 群控配置">
          <InputRow
            label="目标 IP (控制端)"
            value={sdkTargetIp}
            onChangeText={setSdkTargetIp}
            placeholder="例如: 192.168.1.100"
            keyboardType="numeric"
          />
          <InputRow
            label="目标端口"
            value={sdkTargetPort}
            onChangeText={setSdkTargetPort}
            placeholder="默认: 43988"
            keyboardType="numeric"
          />
          <ActionRow label="加载 SDK 配置" onPress={handleLoadSdkConfig} />
          <ActionRow
            label="保存 SDK 配置"
            onPress={handleUpdateSdkConfig}
            isLast
          />
        </Section>

        <Section title="运控配置">
          <InputRow
            label="本机 IP (机器狗)"
            value={motionSdkClientIp}
            onChangeText={setMotionSdkClientIp}
            placeholder="留空表示 AP/有线模式"
            keyboardType="numeric"
          />
          <ActionRow label="加载运控配置" onPress={handleLoadMotionConfig} />
          <ActionRow label="保存运控配置" onPress={handleUpdateMotionConfig} />
          <ActionRow
            label="重启运控服务 (慎用)"
            onPress={handleRestartMotion}
            danger
            isLast
          />
        </Section>

        {/* ── 通用配置 ── */}
        <Section>
          <ActionRow
            label="加载通用配置"
            onPress={handleLoadConfig}
            loading={loading && !configLoaded}
          />
          <ActionRow
            label="保存通用配置"
            onPress={handleSaveConfig}
            loading={loading && configLoaded}
            isLast={!configLoaded}
          />
        </Section>

        {configLoaded &&
          configSections.map(sec => {
            const sectionFields = sec.keys
              .map(k =>
                configFields.find(
                  f => f.section === sec.section && f.key === k,
                ),
              )
              .filter(Boolean) as ConfigField[];

            if (!sectionFields.length) return null;

            return (
              <Section
                key={sec.section}
                title={`${sec.title} [${sec.section}]`}
              >
                {sectionFields.map((field, idx) =>
                  renderConfigField(field, idx === sectionFields.length - 1),
                )}
              </Section>
            );
          })}
      </ScrollView>

      {/* 选项弹窗 */}
      {selectModal && (
        <SelectModal
          visible
          title={selectModalField?.description || '选择'}
          options={selectModal.options}
          selected={selectModalCurrent}
          onSelect={val => {
            if (selectModalField) {
              updateField(selectModalField.section, selectModalField.key, val);
            }
          }}
          onClose={() => setSelectModal(null)}
        />
      )}
    </Screen>
  );
}

const cfgStyles = StyleSheet.create({
  boolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
  },
  boolLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  selectValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  message: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
});
