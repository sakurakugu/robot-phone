import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AuthScreen } from '../../features/auth/screens/AuthScreen';
import { D1ChoreoPlayScreen } from '../../features/choreo/screens/舞蹈播放屏幕';
import { SSHTerminalScreen } from '../../features/discover/screens/SSH终端屏幕';
import { FirstInstallScreen } from '../../features/discover/screens/安装屏幕';
import { LoginSessionsScreen } from '../../features/profile/screens/LoginSessionsScreen';
import { PersonalCenterScreen } from '../../features/profile/screens/PersonalCenterScreen';
import { PersonalProfileScreen } from '../../features/profile/screens/PersonalProfileScreen';
import { D1ControlScreen } from '../../features/robots/group-control/screens/D1控制屏幕';
import { X2TaiCiScreen } from '../../features/robots/group-control/screens/X2台词屏幕';
import { X2NormalScreen } from '../../features/robots/group-control/screens/X2基础屏幕';
import { X2ControlScreen } from '../../features/robots/group-control/screens/X2控制屏幕';
import { X2HaidilaoScreen } from '../../features/robots/group-control/screens/X2海底捞屏幕';
import { X2LingChuangScreen } from '../../features/robots/group-control/screens/X2灵创屏幕';
import { X2TejiScreen } from '../../features/robots/group-control/screens/X2特技屏幕';
import { RobotWifiScreen } from '../../features/robots/screens/机器人WIFI屏幕';
import { RobotChatScreen } from '../../features/robots/screens/机器人对话屏幕';
import { RobotOperationScreen } from '../../features/robots/screens/机器人操作屏幕';
import { RobotLogScreen } from '../../features/robots/screens/机器人日志屏幕';
import { AddRobotScreen } from '../../features/robots/screens/机器人添加屏幕';
import { RobotGroupControlScreen } from '../../features/robots/screens/机器人群控屏幕';
import { RobotSettingsScreen } from '../../features/robots/screens/机器人设置屏幕';
import { RobotConfigScreen } from '../../features/robots/screens/机器人配置屏幕';
import { RoleFormScreen } from '../../features/roles/screens/RoleFormScreen';
import { AddEnvironmentScreen } from '../../features/settings/screens/AddEnvironmentScreen';
import { AppearanceScreen } from '../../features/settings/screens/AppearanceScreen';
import { FeedbackScreen } from '../../features/settings/screens/FeedbackScreen';
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
      <Stack.Screen name="舞蹈播放" component={D1ChoreoPlayScreen} />
      <Stack.Screen name="X2 机器人控制" component={X2ControlScreen} />
      <Stack.Screen name="X2 普通动作" component={X2NormalScreen} />
      <Stack.Screen name="X2 灵创动作" component={X2LingChuangScreen} />
      <Stack.Screen name="X2 海底捞" component={X2HaidilaoScreen} />
      <Stack.Screen name="X2 台词" component={X2TaiCiScreen} />
      <Stack.Screen name="X2 特技" component={X2TejiScreen} />
      <Stack.Screen name="设置" component={SettingsScreen} />
      <Stack.Screen name="反馈" component={FeedbackScreen} />
      <Stack.Screen name="外观设置" component={AppearanceScreen} />
      <Stack.Screen name="服务器环境" component={NetworkEnvironmentScreen} />
      <Stack.Screen name="添加配置环境" component={AddEnvironmentScreen} />
      <Stack.Screen name="版本历史" component={VersionHistoryScreen} />
      <Stack.Screen name="账号登录" component={AuthScreen} />
      <Stack.Screen name="登录设备" component={LoginSessionsScreen} />
      <Stack.Screen name="个人中心" component={PersonalCenterScreen} />
      <Stack.Screen name="个人资料" component={PersonalProfileScreen} />
      <Stack.Screen name="SSH 终端" component={SSHTerminalScreen} />
      <Stack.Screen name="安装机器狗软件" component={FirstInstallScreen} />
    </Stack.Navigator>
  );
}
