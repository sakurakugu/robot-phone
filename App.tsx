/**
 * 机器狗控制应用 - React Native版
 * 包含操作、聊天、管理、我的四个主要功能模块
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// 导入各页面组件
import OperationScreen from './src/screens/OperationScreen';
import ChatScreen from './src/screens/ChatScreen';
import ManagementScreen from './src/screens/ManagementScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// 底部标签导航组件
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          if (route.name === 'Operation') {
            iconName = focused ? 'gamepad' : 'gamepad';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chat' : 'chat-bubble-outline';
          } else if (route.name === 'Management') {
            iconName = focused ? 'build' : 'build';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Operation" component={OperationScreen} options={{ title: '操作' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: '聊天' }} />
      <Tab.Screen name="Management" component={ManagementScreen} options={{ title: '管理' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
