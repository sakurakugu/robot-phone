import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import {
  addEnvironment,
  setActiveEnvironment,
} from '../../../shared/config/environment';
import { Screen } from '../../../shared/ui/Screen';

export function AddEnvironmentScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState('');

  function save() {
    const trimmedName = name.trim();
    const trimmedUrl = baseUrl.trim();

    if (!trimmedName || !trimmedUrl) {
      setError('名称和地址不能为空');
      return;
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setError('地址必须以 http:// 或 https:// 开头');
      return;
    }

    const env = addEnvironment(trimmedName, trimmedUrl);
    setActiveEnvironment(env.id);
    navigation.goBack();
  }

  return (
    <Screen
      palette={palette}
      title="添加配置环境"
      subtitle="新增并切换 API 环境"
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
          <Text style={styles.saveText}>保存并启用</Text>
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
