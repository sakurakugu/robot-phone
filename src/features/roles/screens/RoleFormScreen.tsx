import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { createRole, updateRole } from '../api';
import type { Role, RoleForm } from '../types';

type RouteParams = {
  mode?: 'edit';
  role?: Role;
};

type MessageTone = 'info' | 'error';

export function RoleFormScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as RouteParams;
  const isEdit = params.mode === 'edit' && !!params.role;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [llmProvider, setLlmProvider] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [maxHistory, setMaxHistory] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');

  const messageColor =
    messageTone === 'error' ? palette.danger : palette.warning;

  const screenTitle = useMemo(
    () => (isEdit ? '编辑角色' : '新增角色'),
    [isEdit],
  );
  const screenSubtitle = useMemo(
    () => (isEdit ? '更新角色配置并保存' : '创建一个新的角色'),
    [isEdit],
  );
  const submitLabel = useMemo(
    () => (isEdit ? '保存修改' : '创建角色'),
    [isEdit],
  );
  const isFormValid = useMemo(() => Boolean(name.trim()), [name]);
  const themedStyles = useMemo(
    () => ({
      primaryBtn: { backgroundColor: palette.primary },
    }),
    [palette],
  );

  useEffect(() => {
    if (isEdit && params.role) {
      setName(params.role.name || '');
      setDescription(params.role.description || '');
      setLlmProvider(params.role.llm_provider || '');
      setLlmModel(params.role.llm_model || '');
      setTemperature(String(params.role.temperature ?? 0.7));
      setMaxHistory(String(params.role.max_history ?? 10));
      return;
    }

    setName('');
    setDescription('');
    setLlmProvider('');
    setLlmModel('');
    setTemperature('0.7');
    setMaxHistory('10');
  }, [isEdit, params.role]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || submitting) {
      setMessageTone('error');
      setMessage('请填写角色名称');
      return;
    }
    if (isEdit && !params.role) {
      setMessageTone('error');
      setMessage('缺少角色信息');
      return;
    }

    setSubmitting(true);
    setMessage('');
    const payload: RoleForm = {
      name: name.trim(),
      description: description.trim() || undefined,
      llm_provider: llmProvider.trim() || undefined,
      llm_model: llmModel.trim() || undefined,
      temperature: Number(temperature),
      max_history: Number(maxHistory),
    };

    try {
      if (isEdit && params.role) {
        await updateRole(params.role.uuid, payload);
      } else {
        await createRole(payload);
      }
      navigation.goBack();
    } catch (e: any) {
      setMessageTone('error');
      setMessage(e?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [
    description,
    isEdit,
    isFormValid,
    llmModel,
    llmProvider,
    maxHistory,
    name,
    navigation,
    params.role,
    submitting,
    temperature,
  ]);

  return (
    <Screen palette={palette} title={screenTitle} subtitle={screenSubtitle}>
      <ScrollView contentContainerStyle={styles.container}>
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="名称（必填）"
          placeholderTextColor={palette.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="描述"
          placeholderTextColor={palette.textMuted}
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="LLM 提供商"
          placeholderTextColor={palette.textMuted}
          value={llmProvider}
          onChangeText={setLlmProvider}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="LLM 模型"
          placeholderTextColor={palette.textMuted}
          value={llmModel}
          onChangeText={setLlmModel}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="temperature"
          placeholderTextColor={palette.textMuted}
          value={temperature}
          onChangeText={setTemperature}
          keyboardType="numeric"
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="max_history"
          placeholderTextColor={palette.textMuted}
          value={maxHistory}
          onChangeText={setMaxHistory}
          keyboardType="numeric"
        />

        {message ? (
          <Text style={[styles.message, { color: messageColor }]}>
            {message}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.primaryBtn,
            themedStyles.primaryBtn,
            !isFormValid || submitting ? styles.btnDisabled : styles.btnEnabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || submitting}
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? '提交中...' : submitLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  message: {
    fontSize: 12,
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnEnabled: {
    opacity: 1,
  },
});
