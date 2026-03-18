import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import {
  addEnvironment,
  setActiveEnvironment,
  updateEnvironment,
} from '../../../shared/config/environment';
import { Screen } from '../../../shared/ui/Screen';

type RouteParams = {
  mode?: 'edit';
  envId?: string;
  name?: string;
  baseUrl?: string;
};

export function AddEnvironmentScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params: RouteParams = route.params ?? {};
  const isEdit = params.mode === 'edit' && !!params.envId;
  const [name, setName] = useState(params.name ?? '');
  const [baseUrl, setBaseUrl] = useState(params.baseUrl ?? '');
  const [error, setError] = useState('');
  const screenTitle = useMemo(
    () => (isEdit ? '编辑配置环境' : '添加配置环境'),
    [isEdit],
  );
  const screenSubtitle = useMemo(
    () => (isEdit ? '更新并保存 API 环境' : '新增并切换 API 环境'),
    [isEdit],
  );
  const saveLabel = useMemo(
    () => (isEdit ? '保存修改' : '保存并启用'),
    [isEdit],
  );

  function save() {
    const trimmedName = name.trim();
    const trimmedUrl = baseUrl.trim();

    if (!trimmedName || !trimmedUrl) {
      setError('名称和地址不能为空');
      return;
    }

    // 使用 new RegExp 避免被误识别为注释
    if (!new RegExp('^https?://', 'i').test(trimmedUrl)) {
      setError('地址必须以 http:// 或 https:// 开头');
      return;
    }

    if (isEdit && params.envId) {
      const updated = updateEnvironment(params.envId, trimmedName, trimmedUrl);
      if (!updated) {
        setError('环境不存在');
        return;
      }
    } else {
      const env = addEnvironment(trimmedName, trimmedUrl);
      setActiveEnvironment(env.id);
    }
    navigation.goBack();
  }

  return (
    <Screen
      palette={palette}
      title={screenTitle}
      subtitle={screenSubtitle}
    >
      <View style={styles.container}>
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="环境名称，例如：测试环境"
          placeholderTextColor={palette.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="基础地址，例如：http://192.168.1.8:9000"
          placeholderTextColor={palette.textMuted}
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
        />
        {error ? (
          <Text style={[styles.error, { color: palette.danger }]}>{error}</Text>
        ) : null}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: palette.primary }]}
          onPress={save}
        >
          <Text style={styles.saveText}>{saveLabel}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: {
    fontSize: 12,
  },
  saveBtn: {
    marginTop: 4,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
