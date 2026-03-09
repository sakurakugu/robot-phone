import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Bot, Compass, User, Users } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { DiscoverScreen } from '../../features/discover/screens/发现屏幕';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { RobotManagementScreen } from '../../features/robots/screens/机器人管理屏幕';
import { RoleManagementScreen } from '../../features/roles/screens/RoleManagementScreen';
import { usePalette } from '../theme/palette';

type TabName = '机器人' | '角色' | '发现' | '我的';

const Tab = createBottomTabNavigator();

type TabIconProps = {
  name: TabName;
  focused: boolean;
};

const iconMap: Record<
  TabName,
  React.ComponentType<{ color: string; size?: number }>
> = {
  机器人: Bot,
  角色: Users,
  发现: Compass,
  我的: User,
};

function TabIcon({ name, focused }: TabIconProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      iconColor: focused ? palette.primary : palette.textMuted,
    }),
    [focused, palette],
  );

  const Icon = iconMap[name];
  return (
    <View style={styles.icon}>
      <Icon color={themedStyles.iconColor} size={22} />
    </View>
  );
}

const tabBarIconMap: Record<
  TabName,
  ({ focused }: { focused: boolean }) => React.JSX.Element
> = {
  机器人: ({ focused }) => <TabIcon name="机器人" focused={focused} />,
  角色: ({ focused }) => <TabIcon name="角色" focused={focused} />,
  发现: ({ focused }) => <TabIcon name="发现" focused={focused} />,
  我的: ({ focused }) => <TabIcon name="我的" focused={focused} />,
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
        tabBarIcon: tabBarIconMap[route.name as TabName],
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
    alignItems: 'center',
    justifyContent: 'center',
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
