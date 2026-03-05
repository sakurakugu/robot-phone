import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Terminal,
  Trash2,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import {
  SparkSsh,
  type SshExecuteResult,
} from '../../../shared/native/SparkSsh';
import { Screen } from '../../../shared/ui/Screen';
import { Toast } from '../../../shared/ui/Toast';

type SshConfig = {
  host: string;
  port: string;
  user: string;
  password: string;
};

type HistoryEntry = SshExecuteResult & { id: number };

// 输入模式：单条命令 / 批量命令
type InputMode = 'single' | 'batch';

export function SshTerminalScreen() {
  const palette = usePalette();

  const [configExpanded, setConfigExpanded] = useState(true);
  const [config, setConfig] = useState<SshConfig>({
    host: '',
    port: '22',
    user: '',
    password: '',
  });
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>('single');
  const [command, setCommand] = useState('');
  const [batchCommands, setBatchCommands] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const idRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardOffset(e.endCoordinates.height);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const appendEntry = useCallback((result: SshExecuteResult) => {
    setHistory(prev => [...prev, { ...result, id: ++idRef.current }]);
  }, []);

  const updateConfig = useCallback(
    (key: keyof SshConfig) => (val: string) => {
      setConfig(prev => ({ ...prev, [key]: val }));
    },
    [],
  );

  // ── 连接 ───────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!config.host.trim() || !config.user.trim()) {
      Toast.show('请填写主机地址和用户名');
      return;
    }
    const port = parseInt(config.port, 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      Toast.show('端口号无效');
      return;
    }

    setConnecting(true);
    try {
      await SparkSsh.connect(
        config.host.trim(),
        port,
        config.user.trim(),
        config.password,
      );
      setIsConnected(true);
      setConfigExpanded(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Toast.show(`连接失败：${msg}`);
    } finally {
      setConnecting(false);
    }
  }, [config]);

  // ── 断开 ───────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    try {
      await SparkSsh.disconnect();
    } catch {
      // 忽略断开时的错误
    }
    setIsConnected(false);
  }, []);

  // ── 执行单条命令 ────────────────────────────────────────────
  const handleExecute = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd) return;
    if (!isConnected) {
      Toast.show('请先建立 SSH 连接');
      return;
    }

    setLoading(true);
    setCommand('');
    try {
      const output = await SparkSsh.execute(cmd);
      appendEntry({ command: cmd, output, isError: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendEntry({ command: cmd, output: msg, isError: true });
      if ((err as { code?: string }).code === 'SSH_NOT_CONNECTED') {
        setIsConnected(false);
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [command, isConnected, appendEntry, scrollToBottom]);

  // ── 批量执行 ────────────────────────────────────────────────
  const handleBatchExecute = useCallback(async () => {
    const commands = batchCommands
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (commands.length === 0) {
      Toast.show('请输入至少一条命令');
      return;
    }
    if (!isConnected) {
      Toast.show('请先建立 SSH 连接');
      return;
    }

    setLoading(true);
    try {
      await SparkSsh.executeAll(commands, {
        onProgress: result => {
          appendEntry(result);
          scrollToBottom();
        },
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [batchCommands, isConnected, appendEntry, scrollToBottom]);

  const clearHistory = useCallback(() => setHistory([]), []);

  const statusColor = isConnected
    ? (palette.success ?? '#22c55e')
    : palette.textMuted;

  return (
    <Screen palette={palette} subtitle="通过 SSH 执行远程命令" unsafeTop={true}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset > 0 ? 90 : 0}
      >
        {/* ── 连接配置卡片 ───────────────────────── */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Pressable
            style={styles.cardHeader}
            onPress={() => setConfigExpanded(prev => !prev)}
          >
            <View style={styles.headerLeft}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {isConnected
                  ? `${config.user}@${config.host}:${config.port}`
                  : '连接配置'}
              </Text>
            </View>
            {configExpanded ? (
              <ChevronUp color={palette.textMuted} size={18} />
            ) : (
              <ChevronDown color={palette.textMuted} size={18} />
            )}
          </Pressable>

          {configExpanded && (
            <>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  主机
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.host}
                  onChangeText={updateConfig('host')}
                  placeholder="192.168.1.1"
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isConnected}
                />
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  端口
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.port}
                  onChangeText={updateConfig('port')}
                  placeholder="22"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="number-pad"
                  editable={!isConnected}
                />
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  用户名
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.user}
                  onChangeText={updateConfig('user')}
                  placeholder="root"
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isConnected}
                />
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  密码
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.password}
                  onChangeText={updateConfig('password')}
                  secureTextEntry={!passwordVisible}
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isConnected}
                />
                <Pressable
                  onPress={() => setPasswordVisible(v => !v)}
                  style={styles.eyeBtn}
                >
                  {passwordVisible ? (
                    <EyeOff color={palette.textMuted} size={16} />
                  ) : (
                    <Eye color={palette.textMuted} size={16} />
                  )}
                </Pressable>
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.actionRow}>
                {!isConnected ? (
                  <Pressable
                    style={[
                      styles.actionBtn,
                      { backgroundColor: palette.primary },
                    ]}
                    onPress={handleConnect}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnText}>连接</Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    style={[
                      styles.actionBtn,
                      { backgroundColor: palette.danger },
                    ]}
                    onPress={handleDisconnect}
                  >
                    <Text style={styles.actionBtnText}>断开连接</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        {/* ── 终端输出区 ─────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          style={[
            styles.terminal,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          contentContainerStyle={styles.terminalContent}
        >
          {history.length === 0 ? (
            <Text style={[styles.emptyTip, { color: palette.textMuted }]}>
              {isConnected ? '在下方输入命令并执行' : '建立连接后即可执行命令'}
            </Text>
          ) : (
            history.map(entry => (
              <View key={entry.id} style={styles.historyEntry}>
                <Text style={[styles.prompt, { color: palette.primary }]}>
                  {'$ ' + entry.command}
                </Text>
                {entry.output.length > 0 && (
                  <Text
                    style={[
                      styles.output,
                      { color: entry.isError ? palette.danger : palette.text },
                    ]}
                    selectable
                  >
                    {entry.output}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* ── 输入区 ────────────────────────────── */}
        <View
          style={[
            styles.inputSection,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {/* 模式切换 + 清空 */}
          <View style={styles.inputToolbar}>
            <View style={styles.modeToggle}>
              <Pressable
                style={[
                  styles.modeBtn,
                  inputMode === 'single' && {
                    backgroundColor: palette.primary,
                  },
                ]}
                onPress={() => setInputMode('single')}
              >
                <Terminal
                  size={14}
                  color={inputMode === 'single' ? '#fff' : palette.textMuted}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color:
                        inputMode === 'single' ? '#fff' : palette.textMuted,
                    },
                  ]}
                >
                  单条
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modeBtn,
                  inputMode === 'batch' && { backgroundColor: palette.primary },
                ]}
                onPress={() => setInputMode('batch')}
              >
                <Layers
                  size={14}
                  color={inputMode === 'batch' ? '#fff' : palette.textMuted}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color: inputMode === 'batch' ? '#fff' : palette.textMuted,
                    },
                  ]}
                >
                  批量
                </Text>
              </Pressable>
            </View>

            {history.length > 0 && (
              <Pressable style={styles.clearBtn} onPress={clearHistory}>
                <Trash2 size={15} color={palette.textMuted} />
              </Pressable>
            )}
          </View>

          {/* 单条命令输入 */}
          {inputMode === 'single' && (
            <View style={styles.singleInputRow}>
              <Text style={[styles.dollar, { color: palette.primary }]}>$</Text>
              <TextInput
                style={[styles.commandInput, { color: palette.text }]}
                value={command}
                onChangeText={setCommand}
                placeholder="输入命令..."
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleExecute}
                editable={!loading}
              />
              <Pressable
                style={[
                  styles.execBtn,
                  { backgroundColor: palette.primary },
                  loading && styles.execBtnDisabled,
                ]}
                onPress={handleExecute}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.execBtnText}>执行</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* 批量命令输入 */}
          {inputMode === 'batch' && (
            <View style={styles.batchInputArea}>
              <TextInput
                style={[
                  styles.batchInput,
                  { color: palette.text, borderColor: palette.border },
                ]}
                value={batchCommands}
                onChangeText={setBatchCommands}
                placeholder={
                  '每行一条命令，按顺序自动执行\n例如：\nls -la\npwd\nwhoami'
                }
                placeholderTextColor={palette.textMuted}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                textAlignVertical="top"
              />
              <Pressable
                style={[
                  styles.batchExecBtn,
                  { backgroundColor: palette.primary },
                  loading && styles.execBtnDisabled,
                ]}
                onPress={handleBatchExecute}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.execBtnText}>执行全部</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const MONO_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // ── 配置卡片 ───────────────────────────────────
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  configLabel: {
    fontSize: 13,
    width: 52,
  },
  configInput: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    paddingVertical: 6,
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  actionRow: {
    padding: 12,
  },
  actionBtn: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── 终端输出区 ─────────────────────────────────
  terminal: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  terminalContent: {
    padding: 12,
    gap: 10,
  },
  emptyTip: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  historyEntry: {
    gap: 3,
  },
  prompt: {
    fontFamily: MONO_FONT,
    fontSize: 13,
    fontWeight: '600',
  },
  output: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    lineHeight: 18,
  },

  // ── 输入区 ─────────────────────────────────────
  inputSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearBtn: {
    padding: 6,
  },

  // 单条命令
  singleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  dollar: {
    fontFamily: MONO_FONT,
    fontSize: 16,
    fontWeight: '700',
  },
  commandInput: {
    flex: 1,
    fontFamily: MONO_FONT,
    fontSize: 14,
    paddingVertical: 0,
  },
  execBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  execBtnDisabled: {
    opacity: 0.6,
  },
  execBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // 批量命令
  batchInputArea: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  batchInput: {
    fontFamily: MONO_FONT,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 100,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  batchExecBtn: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
