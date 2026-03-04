import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { InfoCard } from '../../../shared/ui/InfoCard';
import { Screen } from '../../../shared/ui/Screen';
import { useAuth } from '../../auth/AuthContext';

const menu = [
  { id: 'profile', title: '个人资料', desc: '查看账号详细信息' },
  { id: 'sessions', title: '登录设备', desc: '管理已登录的设备' },
];

export function PersonalCenterScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

  return (
    <Screen palette={palette}>
      <FlatList
        data={menu}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InfoCard
            title={item.title}
            desc={item.desc}
            onPress={() => {
              if (item.id === 'profile') {
                navigation.navigate('个人资料');
              }
              if (item.id === 'sessions') {
                navigation.navigate('登录设备');
              }
            }}
          />
        )}
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <InfoCard
          title="退出登录"
          desc="当前账号将切换到游客模式"
          onPress={async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: '主页' }],
            });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    marginTop: 10,
  },
});
