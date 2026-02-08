import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useRobotControl, { Robot } from '../hooks/useRobotControl';

const OperationScreen = () => {
  const {
    robots,
    selectedRobot,
    isLoading,
    error,
    robotActions,
    selectRobot,
    sendAction,
    testConnection,
  } = useRobotControl();

  const [controlMode, setControlMode] = useState<'move' | 'pose'>('move');

  const handleRobotSelection = (robot: Robot) => {
    selectRobot(robot);
  };

  const handleActionPress = (action: string) => {
    sendAction(action);
  };

  const handleEmergencyStop = () => {
    Alert.alert('紧急停止', '确定要发送紧急停止命令吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: () => {
          // 发送紧急停止命令
          if (selectedRobot) {
            sendAction('emergency_stop');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>机器人操作</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 机器人选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择机器人</Text>
          <View style={styles.robotSelector}>
            {robots.map(robot => (
              <TouchableOpacity
                key={robot.id}
                style={[
                  styles.robotOption,
                  selectedRobot?.id === robot.id && styles.selectedRobot,
                ]}
                onPress={() => handleRobotSelection(robot)}
              >
                <Text
                  style={[
                    styles.robotText,
                    selectedRobot?.id === robot.id && styles.selectedRobotText,
                  ]}
                >
                  {robot.name}
                </Text>
                <Text
                  style={[
                    styles.robotStatus,
                    {
                      color: robot.status === 'online' ? '#4CAF50' : '#F44336',
                    },
                  ]}
                >
                  {robot.status === 'online' ? '在线' : '离线'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 控制模式切换 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>控制模式</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                controlMode === 'move' && styles.activeMode,
              ]}
              onPress={() => setControlMode('move')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  controlMode === 'move' && styles.activeModeText,
                ]}
              >
                移动
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                controlMode === 'pose' && styles.activeMode,
              ]}
              onPress={() => setControlMode('pose')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  controlMode === 'pose' && styles.activeModeText,
                ]}
              >
                姿态
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 摇杆控制区域 */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>控制面板</Text>

          <View style={styles.joystickContainer}>
            <View style={styles.leftJoystick}>
              <Text style={styles.joystickLabel}>移动控制</Text>
            </View>

            <View style={styles.rightJoystick}>
              <Text style={styles.joystickLabel}>视角控制</Text>
            </View>
          </View>
        </View>

        {/* 动作按钮区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>动作控制</Text>
          <View style={styles.actionButtons}>
            {robotActions.slice(0, 6).map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => handleActionPress(action.command)}
              >
                <Text style={styles.actionButtonText}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 状态信息 */}
        <View style={styles.statusSection}>
          <View style={styles.statusItem}>
            <Text style={styles.statusText}>
              电量: {selectedRobot ? `${selectedRobot.battery}%` : 'N/A'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusText}>
              连接状态:{' '}
              {selectedRobot
                ? selectedRobot.status === 'online'
                  ? '在线'
                  : '离线'
                : '未选择'}
            </Text>
          </View>
        </View>

        {/* 急停按钮 */}
        <View style={styles.emergencySection}>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyStop}
          >
            <Text style={styles.emergencyButtonText}>急停</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  robotSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  robotOption: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196f3',
    alignItems: 'center',
  },
  selectedRobot: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  robotText: {
    color: '#2196f3',
    fontWeight: '500',
  },
  selectedRobotText: {
    color: '#fff',
  },
  robotStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  activeMode: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  activeModeText: {
    color: '#fff',
  },
  modeButtonText: {
    color: '#2196f3',
    fontWeight: '500',
  },
  controlSection: {
    alignItems: 'center',
  },
  joystickContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  leftJoystick: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rightJoystick: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  joystickLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#667eea',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    margin: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  emergencySection: {
    alignItems: 'center',
    marginTop: 20,
  },
  emergencyButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OperationScreen;
