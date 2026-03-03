import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  const { robotIp } = (route.params || {}) as RouteParams;
  const themedStyles = useMemo(
    () => ({
      message: { color: palette.warning },
      modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)' },
      modalContent: { backgroundColor: palette.surface },
      modalTitle: { color: palette.text },
      modalItemText: { color: palette.text },
      modalSignalText: { color: palette.textMuted },
      modalClose: { backgroundColor: palette.surfaceAlt },
      modalCloseText: { color: palette.text },
    }),
    [palette],
  );

  const [scanLoading, setScanLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState<RobotClient | null>(null);

  // WiFi 状态
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiList, setWifiList] = useState<any[]>([]);
  const [showWifiList, setShowWifiList] = useState(false);
  const [groupBySSID, setGroupBySSID] = useState(true);

  const displayWifiList = useMemo(() => {
    if (!groupBySSID) {
      return wifiList;
    }

    const groups: Record<string, any> = {};
    wifiList.forEach((item) => {
      const ssid = item.ssid || item;
      if (!ssid) return;

      if (!groups[ssid]) {
        groups[ssid] = item;
      } else {
        const existing = groups[ssid];
        // Prioritize connected
        if (existing.in_use) return;
        if (item.in_use) {
          groups[ssid] = item;
          return;
        }
        // Prioritize stronger signal
        const existingSignal = parseInt(existing.signal || '0', 10);
        const newSignal = parseInt(item.signal || '0', 10);
        if (newSignal > existingSignal) {
          groups[ssid] = item;
        }
      }
    });

    const result = Object.values(groups);
    // Sort
    result.sort((a, b) => {
      if (a.in_use) return -1;
      if (b.in_use) return 1;
      const aSignal = parseInt(a.signal || '0', 10);
      const bSignal = parseInt(b.signal || '0', 10);
      return bSignal - aSignal;
    });
    return result;
  }, [wifiList, groupBySSID]);

  useEffect(() => {
    if (robotIp) {
      const c = new RobotClient(robotIp);
      setClient(c);
      c.login().catch(() => { });
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
      // title="WiFi 设置"
      // subtitle={robotName || robotUuid}
      unsafeTop={true}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <Text style={[styles.message, themedStyles.message]}>
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
        <View style={[styles.modalOverlay, themedStyles.modalOverlay]}>
          <View style={[styles.modalContent, themedStyles.modalContent]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text
                style={[
                  styles.modalTitle,
                  themedStyles.modalTitle,
                  { marginBottom: 0 },
                ]}
              >
                WiFi 列表
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8, color: palette.text }}>
                  聚合
                </Text>
                <Switch value={groupBySSID} onValueChange={setGroupBySSID} />
              </View>
            </View>
            <FlatList
              data={displayWifiList}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setWifiSSID(item.ssid || item);
                    setShowWifiList(false);
                  }}
                >
                  <Text style={themedStyles.modalItemText}>
                    {item.ssid || item} {item.in_use ? '(已连接)' : ''}
                  </Text>
                  {item.signal && (
                    <Text
                      style={[styles.modalSignal, themedStyles.modalSignalText]}
                    >
                      信号: {item.signal}%
                    </Text>
                  )}
                </Pressable>
              )}
            />
            <Pressable
              style={[styles.modalClose, themedStyles.modalClose]}
              onPress={() => setShowWifiList(false)}
            >
              <Text style={themedStyles.modalCloseText}>关闭</Text>
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
  modalSignal: {
    fontSize: 12,
  },
  modalClose: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
