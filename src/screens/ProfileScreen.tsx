import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/api';

const ProfileScreen = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // 模拟登录状态

  const handleLogout = () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '退出', 
          style: 'destructive',
          onPress: () => {
            // 实际的登出逻辑
            setIsLoggedIn(false);
            Alert.alert('成功', '已退出登录');
          }
        }
      ]
    );
  };

  const handleAccountSettings = () => {
    Alert.alert('提示', '账户设置功能待实现');
  };

  const handleNotificationSettings = () => {
    Alert.alert('提示', '通知设置功能待实现');
  };

  const handlePrivacySettings = () => {
    Alert.alert('提示', '隐私设置功能待实现');
  };

  const handleAboutApp = () => {
    Alert.alert('关于应用', '机器狗控制应用 v1.0\n用于远程控制和管理机器狗设备');
  };

  const handleHelpFeedback = () => {
    Alert.alert('帮助与反馈', '如有任何问题或建议，请联系技术支持');
  };

  const handleSystemSettings = () => {
    Alert.alert('提示', '系统设置功能待实现');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
      </View>
      
      <View style={styles.profileSection}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitials}>U</Text>
        </View>
        <Text style={styles.userName}>用户名</Text>
        <Text style={styles.userEmail}>user@example.com</Text>
      </View>
      
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={handleAccountSettings}>
          <Text style={styles.menuItemText}>账户设置</Text>
          <Text style={styles.menuItemValue}>{'>'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleNotificationSettings}>
          <Text style={styles.menuItemText}>通知设置</Text>
          <Text style={styles.menuItemValue}>{'>'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handlePrivacySettings}>
          <Text style={styles.menuItemText}>隐私设置</Text>
          <Text style={styles.menuItemValue}>{'>'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleSystemSettings}>
          <Text style={styles.menuItemText}>系统设置</Text>
          <Text style={styles.menuItemValue}>{'>'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleAboutApp}>
          <Text style={styles.menuItemText}>关于应用</Text>
          <Text style={styles.menuItemValue}>{'>'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelpFeedback}>
          <Text style={styles.menuItemText}>帮助与反馈</Text>
          <Text style={styles.menuItemValue}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      
      {isLoggedIn && (
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 15,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarInitials: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemValue: {
    fontSize: 16,
    color: '#999',
  },
  logoutSection: {
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfileScreen;