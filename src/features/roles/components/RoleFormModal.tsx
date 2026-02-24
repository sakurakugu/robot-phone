import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import type { Role, RoleForm } from '../types';

export function RoleFormModal({
  visible,
  mode,
  initialValue,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValue?: Role | null;
  onClose: () => void;
  onSubmit: (payload: RoleForm) => Promise<void>;
}) {
  const palette = usePalette();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [llmProvider, setLlmProvider] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [maxHistory, setMaxHistory] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const title = useMemo(() => (mode === 'create' ? '新增角色' : '编辑角色'), [mode]);

  useEffect(() => {
    if (mode === 'edit' && initialValue) {
      setName(initialValue.name || '');
      setDescription(initialValue.description || '');
      setLlmProvider(initialValue.llm_provider || '');
      setLlmModel(initialValue.llm_model || '');
      setTemperature(String(initialValue.temperature ?? 0.7));
      setMaxHistory(String(initialValue.max_history ?? 10));
      return;
    }

    setName('');
    setDescription('');
    setLlmProvider('');
    setLlmModel('');
    setTemperature('0.7');
    setMaxHistory('10');
  }, [mode, initialValue, visible]);

  async function submit() {
    if (!name.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        description: description || undefined,
        llm_provider: llmProvider || undefined,
        llm_model: llmModel || undefined,
        temperature: Number(temperature),
        max_history: Number(maxHistory),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text }] as const;
  const placeholderTextColor = palette.textMuted;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <ScrollView contentContainerStyle={styles.form}>
            <TextInput
              style={inputStyle}
              placeholder="名称（必填）"
              placeholderTextColor={placeholderTextColor}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={inputStyle}
              placeholder="描述"
              placeholderTextColor={placeholderTextColor}
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={inputStyle}
              placeholder="LLM 提供商"
              placeholderTextColor={placeholderTextColor}
              value={llmProvider}
              onChangeText={setLlmProvider}
            />
            <TextInput
              style={inputStyle}
              placeholder="LLM 模型"
              placeholderTextColor={placeholderTextColor}
              value={llmModel}
              onChangeText={setLlmModel}
            />
            <TextInput
              style={inputStyle}
              placeholder="temperature"
              placeholderTextColor={placeholderTextColor}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="numeric"
            />
            <TextInput
              style={inputStyle}
              placeholder="max_history"
              placeholderTextColor={placeholderTextColor}
              value={maxHistory}
              onChangeText={setMaxHistory}
              keyboardType="numeric"
            />
          </ScrollView>
          <View style={styles.footer}>
            <Pressable onPress={onClose} style={[styles.btn, { borderColor: palette.border }]}>
              <Text style={{ color: palette.textMuted }}>取消</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={submitting}
              style={[styles.btn, { backgroundColor: palette.primary, borderColor: palette.primary }]}
            >
              <Text style={styles.primaryBtnText}>{submitting ? '提交中...' : '提交'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  form: {
    gap: 10,
    paddingBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
