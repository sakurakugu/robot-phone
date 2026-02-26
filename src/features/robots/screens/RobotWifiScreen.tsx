import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { ActionRow, InputRow, Section } from '../components/SettingsComponents';
import { RobotClient } from '../robotClient';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
  robotIp: string;
};

export function RobotWifiScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const { robotUuid, robotName, robotIp } = (route.params || {}) as RouteParams;

  const [scanLoading, setScanLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState<RobotClient | null>(null);

  // WiFi 状态
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiList, setWifiList] = useState<any[]>([]);
  const [showWifiList, setShowWifiList] = useState(false);

  useEffect(() => {
    if (robotIp) {
      const c = new RobotClient(robotIp);
      setClient(c);
      c.login().catch(() => {});
    }
  }, [robotIp]);

  const handleScanWifi = async () => {
    if (!client) return;
    try {
      setScanLoading(true);
      setMessage('');
      const res = await client.scanWifi();
      if (res.success) {
        setWifiList(res.networks || []);
        setShowWifiList(true);
      }
    } catch (e: any) {
      setMessage(e.message || '扫描失败');
    } finally {
      setScanLoading(false);
    }
  };

  const handleConnectWifi = async () => {
    if (!client) return;
    if (!wifiSSID || !wifiPassword) {
      setMessage('请输入SSID和密码');
      return;
    }
    try {
      setConnectLoading(true);
      setMessage('');
      const res = await client.connectWifi(wifiSSID, wifiPassword);
      if (res.success) {
        setMessage('WiFi连接请求已发送');
      }
    } catch (e: any) {
      setMessage(e.message || '连接失败');
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <Screen
      palette={palette}
      title="WiFi 设置"
      subtitle={robotName || robotUuid}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <Text style={[styles.message, { color: palette.warning }]}>
            {message}
          </Text>
        ) : null}

        <Section title="连接 WiFi">
          <InputRow
            label="SSID"
            value={wifiSSID}
            onChangeText={setWifiSSID}
            placeholder="WiFi名称"
            autoCapitalize="none"
          />
          <InputRow
            label="密码"
            value={wifiPassword}
            onChangeText={setWifiPassword}
            placeholder="WiFi密码"
            secureTextEntry
            autoCapitalize="none"
          />
          <ActionRow
            label="扫描 WiFi"
            onPress={handleScanWifi}
            loading={scanLoading}
          />
          <ActionRow
            label="连接 WiFi"
            onPress={handleConnectWifi}
            loading={connectLoading}
            isLast
          />
        </Section>
      </ScrollView>

      {/* WiFi 列表弹窗 */}
      <Modal visible={showWifiList} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <View
            style={[styles.modalContent, { backgroundColor: palette.surface }]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              WiFi 列表
            </Text>
            <FlatList
              data={wifiList}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setWifiSSID(item.ssid || item);
                    setShowWifiList(false);
                  }}
                >
                  <Text style={{ color: palette.text }}>
                    {item.ssid || item} {item.in_use ? '(已连接)' : ''}
                  </Text>
                  {item.signal && (
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      信号: {item.signal}%
                    </Text>
                  )}
                </Pressable>
              )}
            />
            <Pressable
              style={[
                styles.modalClose,
                { backgroundColor: palette.surfaceAlt },
              ]}
              onPress={() => setShowWifiList(false)}
            >
              <Text style={{ color: palette.text }}>关闭</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 14,
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalClose: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
