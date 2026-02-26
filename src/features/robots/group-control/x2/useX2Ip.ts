/**
 * useX2Ip — 管理手动添加的 X2 机器人 IP 列表，使用 AsyncStorage 持久化
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'x2_ip_list';

export function useX2Ip() {
  const [ips, setIpsState] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      try {
        setIpsState(val ? JSON.parse(val) : []);
      } catch {
        setIpsState([]);
      }
      setLoaded(true);
    });
  }, []);

  const addIp = useCallback((newIp: string) => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    setIpsState(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeIp = useCallback((ip: string) => {
    setIpsState(prev => {
      const next = prev.filter(i => i !== ip);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { ips, addIp, removeIp, loaded };
}
