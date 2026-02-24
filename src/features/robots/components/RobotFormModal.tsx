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
import type { Robot, RobotForm } from '../types';

function splitTags(input: string): string[] {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function RobotFormModal({
  visible,
  mode,
  initialValue,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValue?: Robot | null;
  onClose: () => void;
  onSubmit: (payload: RobotForm) => Promise<void>;
}) {
  const palette = usePalette();
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [ip, setIp] = useState('');
  const [groupName, setGroupName] = useState('');
  const [sn, setSn] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const title = useMemo(() => (mode === 'create' ? '新增机器人' : '编辑机器人'), [mode]);

  useEffect(() => {
    if (mode === 'edit' && initialValue) {
      setName(initialValue.name || '');
      setModel(initialValue.model || '');
      setIp(initialValue.ip || '');
      setGroupName(initialValue.group_name || '');
      setSn(initialValue.sn || '');
      setTagsText(initialValue.tags.join(','));
      return;
    }

    setName('');
    setModel('');
    setIp('');
    setGroupName('');
    setSn('');
    setTagsText('');
  }, [mode, initialValue, visible]);

  async function submit() {
    try {
      setSubmitting(true);
      await onSubmit({
        name: name || undefined,
        model: model || undefined,
        ip: ip || undefined,
        group_name: groupName || undefined,
        sn: sn || undefined,
        tags: splitTags(tagsText),
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
              placeholder="名称"
              placeholderTextColor={placeholderTextColor}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={inputStyle}
              placeholder="型号"
              placeholderTextColor={placeholderTextColor}
              value={model}
              onChangeText={setModel}
            />
            <TextInput
              style={inputStyle}
              placeholder="IP"
              placeholderTextColor={placeholderTextColor}
              value={ip}
              onChangeText={setIp}
              autoCapitalize="none"
            />
            <TextInput
              style={inputStyle}
              placeholder="分组"
              placeholderTextColor={placeholderTextColor}
              value={groupName}
              onChangeText={setGroupName}
            />
            <TextInput
              style={inputStyle}
              placeholder="SN"
              placeholderTextColor={placeholderTextColor}
              value={sn}
              onChangeText={setSn}
            />
            <TextInput
              style={inputStyle}
              placeholder="标签（逗号分隔）"
              placeholderTextColor={placeholderTextColor}
              value={tagsText}
              onChangeText={setTagsText}
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
