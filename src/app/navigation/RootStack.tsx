import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { RobotChatScreen } from '../../features/robots/screens/RobotChatScreen';
import { RobotGroupControlScreen } from '../../features/robots/screens/RobotGroupControlScreen';
import { RobotOperationScreen } from '../../features/robots/screens/RobotOperationScreen';
import { RobotSettingsScreen } from '../../features/robots/screens/RobotSettingsScreen';
import { RobotWifiScreen } from '../../features/robots/screens/RobotWifiScreen';
import { RobotLogScreen } from '../../features/robots/screens/RobotLogScreen';
import { RobotConfigScreen } from '../../features/robots/screens/RobotConfigScreen';
import { AddEnvironmentScreen } from '../../features/settings/screens/AddEnvironmentScreen';
import { AppearanceScreen } from '../../features/settings/screens/AppearanceScreen';
import { NetworkEnvironmentScreen } from '../../features/settings/screens/NetworkEnvironmentScreen';
import { SettingsScreen } from '../../features/settings/screens/SettingsScreen';
import { useAppPreferences } from '../preferences/AppPreferences';
import { usePalette } from '../theme/palette';
import { RootTabs } from './RootTabs';

const Stack = createNativeStackNavigator();

export function RootStack() {
  const palette = usePalette();
  const { homeOrientation } = useAppPreferences();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen
        name="主页"
        component={RootTabs}
        options={{ headerShown: false, orientation: homeOrientation }}
      />
      <Stack.Screen
        name="机器人操作"
        component={RobotOperationScreen}
        options={{ headerShown: false, orientation: 'landscape' }}
      />
      <Stack.Screen name="机器人设置" component={RobotSettingsScreen} />
      <Stack.Screen name="WiFi设置" component={RobotWifiScreen} />
      <Stack.Screen name="日志管理" component={RobotLogScreen} />
      <Stack.Screen name="高级配置" component={RobotConfigScreen} />
      <Stack.Screen name="群控" component={RobotGroupControlScreen} />
      <Stack.Screen name="机器人对话" component={RobotChatScreen} />
      <Stack.Screen name="设置" component={SettingsScreen} />
      <Stack.Screen name="外观设置" component={AppearanceScreen} />
      <Stack.Screen name="服务器环境" component={NetworkEnvironmentScreen} />
      <Stack.Screen name="添加配置环境" component={AddEnvironmentScreen} />
    </Stack.Navigator>
  );
}
