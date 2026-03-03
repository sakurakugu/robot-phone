import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHOW_TOAST_EVENT = 'SHOW_TOAST_EVENT';

export const Toast = {
  SHORT: 2000,
  LONG: 3500,
  show: (message: string, duration: number = 2000) => {
    if (Platform.OS === 'android') {
      const androidDuration =
        duration >= 3000 ? ToastAndroid.LONG : ToastAndroid.SHORT;
      ToastAndroid.show(message, androidDuration);
    } else {
      DeviceEventEmitter.emit(SHOW_TOAST_EVENT, { message, duration });
    }
  },
};

export function ToastComponent() {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      SHOW_TOAST_EVENT,
      ({ message: msg, duration }) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        setMessage(msg);

        // Reset opacity if it was already visible or animating
        opacity.setValue(0);

        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(duration),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Animation finished
        });
      },
    );

    return () => {
      subscription.remove();
    };
  }, [opacity]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { opacity, bottom: insets.bottom + 80 }, // Position from bottom
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
