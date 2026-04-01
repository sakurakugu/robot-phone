import { useNavigation } from '@react-navigation/native';
import { Cloud, CloudOff } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useServerConnection } from '../../../app/providers/ServerConnectionContext';
import { usePalette } from '../../../app/theme/palette';
import { InfoCard } from '../../../shared/ui/InfoCard';
import { Screen } from '../../../shared/ui/Screen';
import { useAuth } from '../../auth/providers/AuthContext';

const menu = [
  { id: 'm1', title: '设置', desc: '语言、主题、通知偏好' },
  { id: 'm2', title: '反馈', desc: '提交问题、建议和使用体验' },
  { id: 'm3', title: '参数管理', desc: '速度、阈值、巡检间隔等 (占位，好看)' },
];

export function ProfileScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const { isConnected, reconnect } = useServerConnection();
  const { mode, user } = useAuth();

  return (
    <Screen palette={palette} title="我的" subtitle="账户与系统">
      <View
        style={[
          styles.profile,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { color: palette.primary }]}>
              {mode === 'authenticated' && user
                ? user.username.charAt(0).toUpperCase()
                : '客'}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.userInfo,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => {
              if (mode === 'authenticated') {
                navigation.navigate('个人中心');
              } else {
                navigation.navigate('账号登录');
              }
            }}
          >
            <Text style={[styles.name, { color: palette.text }]}>
              {mode === 'authenticated' && user ? user.username : '游客模式'}
            </Text>
            {mode === 'authenticated' && user ? (
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {`角色：${user.role === 'super_admin' ? '主管理员' : user.role === 'admin' ? '管理员' : '普通用户'}`}
              </Text>
            ) : (
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                临时访问，功能有限 (还没用户功能，没区别)
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={reconnect}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            accessibilityLabel={
              isConnected ? '服务器已连接，点击重连' : '服务器未连接，点击重连'
            }
          >
            {isConnected ? (
              <Cloud size={20} color={palette.success} fill={palette.success} />
            ) : (
              <CloudOff size={20} color={palette.textMuted} />
            )}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={menu}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InfoCard
            title={item.title}
            desc={item.desc}
            onPress={() => {
              if (item.id === 'm1') {
                navigation.navigate('设置');
                return;
              }
              if (item.id === 'm2') {
                navigation.navigate('反馈');
              }
            }}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(44, 105, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
});
