import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { useAuth } from '../../auth/providers/AuthContext';

export function PersonalProfileScreen() {
  const palette = usePalette();
  const { user } = useAuth();

  const roleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '超级管理员';
      case 'admin':
        return '管理员';
      case 'user':
        return '普通用户';
      default:
        return role;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  if (!user) {
    return (
      <Screen palette={palette} >
        <View style={styles.empty}>
          <Text style={{ color: palette.textMuted }}>无用户信息</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen palette={palette} >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: palette.primary }]}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.username, { color: palette.text }]}>{user.username}</Text>
            <View style={[styles.tag, { backgroundColor: palette.primary + '20' }]}>
              <Text style={[styles.tagText, { color: palette.primary }]}>
                {roleName(user.role)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>基本信息</Text>
          <InfoRow label="用户ID" value={user.id} palette={palette} />
          <InfoRow label="用户名" value={user.username} palette={palette} />
          <InfoRow label="注册时间" value={formatDate(user.createdAt)} palette={palette} />
          <InfoRow label="最近登录" value={formatDate(user.lastLoginAt ?? '')} palette={palette} isLast />
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  palette,
  isLast,
}: {
  label: string;
  value: string;
  palette: any;
  isLast?: boolean;
}) {
  return (
    <>
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: palette.text }]}>{value}</Text>
      </View>
      {!isLast && (
        <View
          style={[
            styles.divider,
            { backgroundColor: palette.border },
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(44, 105, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
});
