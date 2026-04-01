import { useNavigation } from '@react-navigation/native';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Toast } from '../../../shared/ui/Toast';
import { useAuth } from '../providers/AuthContext';

export function AuthScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const {
    login,
    register,
    enterGuestMode,
    registerEnabled,
    registerApprovalRequired,
    refreshRegisterConfig,
  } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const themed = useMemo(
    () => ({
      bg: { backgroundColor: palette.background },
      card: { backgroundColor: palette.surface, borderColor: palette.border },
      title: { color: palette.text },
      input: {
        borderColor: palette.border,
        color: palette.text,
        backgroundColor: palette.surfaceAlt,
      },
      tabActive: { color: palette.primary },
      tabInactive: { color: palette.textMuted },
      btn: { backgroundColor: palette.primary },
      btnText: { color: '#fff' },
      guestText: { color: palette.textMuted },
      noticeText: { color: palette.textMuted },
    }),
    [palette],
  );

  useEffect(() => {
    refreshRegisterConfig().catch(() => {});
  }, [refreshRegisterConfig]);

  useEffect(() => {
    if (!registerEnabled && mode === 'register') {
      setMode('login');
    }
  }, [mode, registerEnabled]);

  const submit = async () => {
    if (!username.trim() || !password) {
      Toast.show('请输入用户名和密码', Toast.SHORT);
      return;
    }

    if (mode === 'register' && !registerEnabled) {
      Toast.show('当前已关闭新用户注册', Toast.SHORT);
      setMode('login');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        const result = await register(username.trim(), password);
        if (result.requiresApproval) {
          Toast.show(result.message || '注册申请已提交，请等待管理员审核', Toast.SHORT);
          setMode('login');
          setPassword('');
          return;
        }
      }
      Toast.show(mode === 'login' ? '登录成功' : '注册成功', Toast.SHORT);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('主页');
      }
    } catch (e: any) {
      Toast.show(e.message || '认证失败', Toast.SHORT);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.page, themed.bg]}>
      <View style={[styles.card, themed.card]}>
        <Text style={[styles.title, themed.title]}>账号登录 / 注册</Text>

        {/* Tab 切换 */}
        <View style={styles.tabs}>
          <Pressable
            style={[
              styles.tab,
              mode === 'login' && { borderBottomColor: palette.primary },
            ]}
            onPress={() => setMode('login')}
          >
            <Text
              style={[
                styles.tabText,
                mode === 'login'
                  ? [themed.tabActive, styles.tabTextActive]
                  : themed.tabInactive,
              ]}
            >
              登录
            </Text>
          </Pressable>
          {registerEnabled ? (
            <Pressable
              style={[
                styles.tab,
                mode === 'register' && { borderBottomColor: palette.primary },
              ]}
              onPress={() => setMode('register')}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === 'register'
                    ? [themed.tabActive, styles.tabTextActive]
                    : themed.tabInactive,
                ]}
              >
                注册
              </Text>
            </Pressable>
          ) : null}
        </View>

        {!registerEnabled ? (
          <Text style={[styles.noticeText, themed.noticeText]}>
            当前已关闭新用户注册，请联系管理员处理。
          </Text>
        ) : null}
        {registerEnabled && mode === 'register' && registerApprovalRequired ? (
          <Text style={[styles.noticeText, themed.noticeText]}>
            当前注册需要主管理员审核，通过后才能登录。
          </Text>
        ) : null}

        <TextInput
          placeholder="用户名"
          placeholderTextColor={palette.textMuted}
          style={[styles.input, themed.input]}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <View style={[styles.inputWrap, themed.input]}>
          <TextInput
            placeholder="密码（至少6位）"
            placeholderTextColor={palette.textMuted}
            style={[styles.inputField, { color: palette.text }]}
            secureTextEntry={passwordVisible}
            value={password}
            onChangeText={setPassword}
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

        <Pressable
          style={[styles.btn, themed.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          <Text style={[styles.btnText, themed.btnText]}>
            {loading
              ? '处理中...'
              : mode === 'login'
                ? '登录'
                : registerApprovalRequired
                  ? '提交注册'
                  : '注册并登录'}
          </Text>
        </Pressable>

        <View style={styles.divider}>
          <View
            style={[styles.dividerLine, { backgroundColor: palette.border }]}
          />
          <Text style={[styles.dividerText, { color: palette.textMuted }]}>
            或者
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: palette.border }]}
          />
        </View>

        <Pressable
          style={[styles.guestBtn, { borderColor: palette.border }]}
          onPress={async () => {
            await enterGuestMode();
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('主页');
            }
          }}
        >
          <Text style={[styles.guestBtnText, themed.guestText]}>
            游客模式继续使用
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
  },
  tabTextActive: {
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
  guestBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
