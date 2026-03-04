import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AuthScreen } from '../../features/auth/screens/AuthScreen';
import { LoginSessionsScreen } from '../../features/profile/screens/LoginSessionsScreen';
import { PersonalCenterScreen } from '../../features/profile/screens/PersonalCenterScreen';
import { PersonalProfileScreen } from '../../features/profile/screens/PersonalProfileScreen';
import { D1ControlScreen } from '../../features/robots/group-control/screens/D1ControlScreen';
import { X2ControlScreen } from '../../features/robots/group-control/screens/X2ControlScreen';
import { X2HaidilaoScreen } from '../../features/robots/group-control/screens/X2HaidilaoScreen';
import { X2LingChuangScreen } from '../../features/robots/group-control/screens/X2LingChuangScreen';
import { X2NormalScreen } from '../../features/robots/group-control/screens/X2NormalScreen';
import { X2TaiCiScreen } from '../../features/robots/group-control/screens/X2TaiCiScreen';
import { X2TejiScreen } from '../../features/robots/group-control/screens/X2TejiScreen';
import { AddRobotScreen } from '../../features/robots/screens/AddRobotScreen';
import { RobotChatScreen } from '../../features/robots/screens/RobotChatScreen';
import { RobotConfigScreen } from '../../features/robots/screens/RobotConfigScreen';
import { RobotGroupControlScreen } from '../../features/robots/screens/RobotGroupControlScreen';
import { RobotLogScreen } from '../../features/robots/screens/RobotLogScreen';
import { RobotOperationScreen } from '../../features/robots/screens/RobotOperationScreen';
import { RobotSettingsScreen } from '../../features/robots/screens/RobotSettingsScreen';
import { RobotWifiScreen } from '../../features/robots/screens/RobotWifiScreen';
import { RoleFormScreen } from '../../features/roles/screens/RoleFormScreen';
import { AddEnvironmentScreen } from '../../features/settings/screens/AddEnvironmentScreen';
import { AppearanceScreen } from '../../features/settings/screens/AppearanceScreen';
import { NetworkEnvironmentScreen } from '../../features/settings/screens/NetworkEnvironmentScreen';
import { SettingsScreen } from '../../features/settings/screens/SettingsScreen';
import { VersionHistoryScreen } from '../../features/settings/screens/VersionHistoryScreen';
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
      <Stack.Screen name="新增机器人" component={AddRobotScreen} />
      <Stack.Screen name="新增角色" component={RoleFormScreen} />
      <Stack.Screen name="编辑角色" component={RoleFormScreen} />
      <Stack.Screen name="WiFi设置" component={RobotWifiScreen} />
      <Stack.Screen name="日志管理" component={RobotLogScreen} />
      <Stack.Screen name="高级配置" component={RobotConfigScreen} />
      <Stack.Screen name="群控" component={RobotGroupControlScreen} />
      <Stack.Screen name="机器人对话" component={RobotChatScreen} />
      <Stack.Screen name="D1 机器狗群控" component={D1ControlScreen} />
      <Stack.Screen name="X2 机器人控制" component={X2ControlScreen} />
      <Stack.Screen name="X2 普通动作" component={X2NormalScreen} />
      <Stack.Screen name="X2 灵创动作" component={X2LingChuangScreen} />
      <Stack.Screen name="X2 海底捞" component={X2HaidilaoScreen} />
      <Stack.Screen name="X2 台词" component={X2TaiCiScreen} />
      <Stack.Screen name="X2 特技" component={X2TejiScreen} />
      <Stack.Screen name="设置" component={SettingsScreen} />
      <Stack.Screen name="外观设置" component={AppearanceScreen} />
      <Stack.Screen name="服务器环境" component={NetworkEnvironmentScreen} />
      <Stack.Screen name="添加配置环境" component={AddEnvironmentScreen} />
      <Stack.Screen name="版本历史" component={VersionHistoryScreen} />
      <Stack.Screen name="账号登录" component={AuthScreen} />
      <Stack.Screen name="登录设备" component={LoginSessionsScreen} />
      <Stack.Screen name="个人中心" component={PersonalCenterScreen} />
      <Stack.Screen name="个人资料" component={PersonalProfileScreen} />
    </Stack.Navigator>
  );
}
