import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { RootTabs } from './RootTabs';
import { RobotOperationScreen } from '../../features/robots/screens/RobotOperationScreen';
import { RobotChatScreen } from '../../features/robots/screens/RobotChatScreen';
import { RobotSettingsScreen } from '../../features/robots/screens/RobotSettingsScreen';
import { AddEnvironmentScreen } from '../../features/settings/screens/AddEnvironmentScreen';
import { SettingsScreen } from '../../features/settings/screens/SettingsScreen';
import { useAppPreferences } from '../preferences/AppPreferences';
import { usePalette } from '../theme/palette';

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
      <Stack.Screen name="机器人对话" component={RobotChatScreen} />
      <Stack.Screen name="设置" component={SettingsScreen} />
      <Stack.Screen name="添加配置环境" component={AddEnvironmentScreen} />
    </Stack.Navigator>
  );
}
