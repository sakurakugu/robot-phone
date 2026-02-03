import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useRobotControl, { Robot } from '../hooks/useRobotControl';
import ApiService from '../services/api';

interface Role {
  id: string;
  name: string;
  description: string;
  llmProvider: string;
  llmModel: string;
  isDefault?: boolean;
}

const ManagementScreen = () => {
  const [activeTab, setActiveTab] = useState<'robot' | 'role'>('robot');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { 
    robots, 
    selectedRobot, 
    isLoading: isRobotsLoading, 
    error: robotError, 
    selectRobot, 
    testConnection,
    reloadRobots
  } = useRobotControl();
  
  // 加载角色数据
  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getRoles();
      setRoles(data);
    } catch (err) {
      console.error('加载角色失败:', err);
      Alert.alert('错误', '加载角色失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'role') {
      loadRoles();
    }
  }, [activeTab]);

  const handleDeleteRobot = (robotId: string) => {
    Alert.alert(
      '删除机器人',
      '确定要删除这个机器人吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteRobot(robotId);
              reloadRobots(); // 重新加载机器人列表
            } catch (err) {
              console.error('删除机器人失败:', err);
              Alert.alert('错误', '删除机器人失败');
            }
          }
        }
      ]
    );
  };

  const handleTestConnection = (robot: Robot) => {
    testConnection(robot);
  };

  const handleDeleteRole = (roleId: string) => {
    Alert.alert(
      '删除角色',
      '确定要删除这个角色吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteRole(roleId);
              loadRoles(); // 重新加载角色列表
            } catch (err) {
              console.error('删除角色失败:', err);
              Alert.alert('错误', '删除角色失败');
            }
          }
        }
      ]
    );
  };

  const handleSetDefaultRole = (roleId: string) => {
    Alert.alert(
      '设为默认角色',
      '确定要将此角色设为默认角色吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: async () => {
            try {
              // 更新角色为默认角色的逻辑（这里简化处理）
              await ApiService.updateRole(roleId, { isDefault: true });
              loadRoles(); // 重新加载角色列表
            } catch (err) {
              console.error('设置默认角色失败:', err);
              Alert.alert('错误', '设置默认角色失败');
            }
          }
        }
      ]
    );
  };

  const renderRobotItem = ({ item }: { item: Robot }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'online' ? '#4CAF50' : item.status === 'connecting' ? '#FF9800' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'online' ? '在线' : item.status === 'connecting' ? '连接中' : '离线'}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.detailText}>UUID: {item.uuid}</Text>
        <Text style={styles.detailText}>电量: {item.battery}%</Text>
        <Text style={styles.detailText}>最后连接: {item.lastConnected}</Text>
        {item.model && <Text style={styles.detailText}>型号: {item.model}</Text>}
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // 编辑机器人逻辑
            Alert.alert('提示', '编辑机器人功能待实现');
          }}
        >
          <Text style={styles.actionButtonText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteRobot(item.id)}
        >
          <Text style={styles.actionButtonText}>删除</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            item.status === 'online' ? styles.connectButton : styles.testButton
          ]}
          onPress={() => handleTestConnection(item)}
        >
          <Text style={styles.actionButtonText}>
            {item.status === 'online' ? '连接' : '测试'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRoleItem = ({ item }: { item: Role }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>默认</Text>
          </View>
        )}
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.detailText}>{item.description}</Text>
        <Text style={styles.detailText}>服务商: {item.llmProvider}</Text>
        <Text style={styles.detailText}>模型: {item.llmModel}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // 编辑角色逻辑
            Alert.alert('提示', '编辑角色功能待实现');
          }}
        >
          <Text style={styles.actionButtonText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteRole(item.id)}
        >
          <Text style={styles.actionButtonText}>删除</Text>
        </TouchableOpacity>
        {!item.isDefault && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleSetDefaultRole(item.id)}
          >
            <Text style={styles.actionButtonText}>设为默认</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>管理</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'robot' && styles.activeTab]}
          onPress={() => setActiveTab('robot')}
        >
          <Text style={[styles.tabText, activeTab === 'robot' && styles.activeTabText]}>机器人管理</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'role' && styles.activeTab]}
          onPress={() => setActiveTab('role')}
        >
          <Text style={[styles.tabText, activeTab === 'role' && styles.activeTabText]}>角色管理</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {(activeTab === 'robot' || isRobotsLoading) ? (
          <FlatList
            data={robots}
            renderItem={renderRobotItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isRobotsLoading}
            onRefresh={reloadRobots}
          />
        ) : (
          <FlatList
            data={roles}
            renderItem={renderRoleItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isLoading}
            onRefresh={loadRoles}
          />
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          // 添加新项目逻辑
          if (activeTab === 'robot') {
            Alert.alert('提示', '添加机器人功能待实现');
          } else {
            Alert.alert('提示', '添加角色功能待实现');
          }
        }}
      >
        <Text style={styles.addButtonText}>
          {activeTab === 'robot' ? '+ 添加机器人' : '+ 添加角色'}
        </Text>
      </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2196F3',
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  itemDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  testButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#667eea',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ManagementScreen;