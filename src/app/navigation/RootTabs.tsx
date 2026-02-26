import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DiscoverScreen } from '../../features/discover/screens/DiscoverScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { RobotManagementScreen } from '../../features/robots/screens/RobotManagementScreen';
import { RoleManagementScreen } from '../../features/roles/screens/RoleManagementScreen';
import { usePalette } from '../theme/palette';

type TabName = '机器人' | '角色' | '发现' | '我的';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      icon: {
        backgroundColor: focused ? palette.primary : palette.surfaceAlt,
        borderColor: focused ? palette.primary : palette.border,
      },
      text: {
        color: focused ? '#FFFFFF' : palette.textMuted,
      },
    }),
    [focused, palette],
  );

  return (
    <View style={[styles.icon, themedStyles.icon]}>
      <Text style={[styles.iconText, themedStyles.text]}>{label}</Text>
    </View>
  );
}

const symbolMap: Record<TabName, string> = {
  机器人: '机',
  角色: '角',
  发现: '发',
  我的: '我',
};

export function RootTabs() {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      tabBar: {
        backgroundColor: palette.surface,
        borderTopColor: palette.border,
      },
    }),
    [palette],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: [styles.tabBar, themedStyles.tabBar],
        tabBarLabelStyle: styles.tabBarLabel,

        tabBarIcon: ({ focused }) => (
          <TabIcon
            label={symbolMap[route.name as TabName] || '·'}
            focused={focused}
          />
        ),
      })}
    >
      <Tab.Screen name="机器人" component={RobotManagementScreen} />
      <Tab.Screen name="角色" component={RoleManagementScreen} />
      <Tab.Screen name="发现" component={DiscoverScreen} />
      <Tab.Screen name="我的" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
