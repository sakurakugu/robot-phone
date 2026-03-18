import React, { useCallback, useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { Toast } from '../../../shared/ui/Toast';
import { submitFeedback } from '../services/feedbackService';

export function FeedbackScreen() {
  const palette = usePalette();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = content.trim().length > 0 && !submitting;

  const themedStyles = useMemo(
    () => ({
      input: { borderColor: palette.border, color: palette.text },
      button: { backgroundColor: palette.primary },
      hint: { color: palette.textMuted },
    }),
    [palette],
  );

  const handleSubmit = useCallback(async () => {
    const value = content.trim();
    if (!value || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback(value);
      setContent('');
      Toast.show('反馈提交成功', Toast.SHORT);
    } catch (error: any) {
      Toast.show(error?.message || '反馈提交失败', Toast.SHORT);
    } finally {
      setSubmitting(false);
    }
  }, [content, submitting]);

  return (
    <Screen palette={palette} title="反馈" subtitle="告诉我们你的想法">
      <ScrollView contentContainerStyle={styles.container}>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          style={[styles.input, themedStyles.input]}
          placeholder="请输入反馈内容"
          placeholderTextColor={palette.textMuted}
        />
        <Text style={[styles.hint, themedStyles.hint]}>
          {`${content.length}/1000`}
        </Text>
        <Pressable
          style={[
            styles.submitButton,
            themedStyles.button,
            canSubmit ? styles.enabled : styles.disabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>
            {submitting ? '提交中...' : '提交反馈'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    textAlign: 'right',
  },
  submitButton: {
    marginTop: 6,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  enabled: {
    opacity: 1,
  },
  disabled: {
    opacity: 0.6,
  },
});
