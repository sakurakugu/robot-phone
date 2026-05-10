import React, { useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import type { ControlMode } from '../services/operation';

const MAX_SPEED = 30;
const SLIDER_WIDTH = 140;

function SpeedSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const palette = usePalette();
  const containerRef = useRef<View>(null);
  const widthRef = useRef(0);
  const pageXRef = useRef(0);

  const applyPageX = (pageX: number) => {
    const x = Math.max(0, pageX - pageXRef.current);
    const width = widthRef.current;
    if (!width) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, x / width));
    const nextValue = Math.round(1 + ratio * (MAX_SPEED - 1));
    onChange(nextValue);
  };

  const percent = ((value - 1) / (MAX_SPEED - 1)) * 100;
  const fillWidth = (percent / 100) * SLIDER_WIDTH;
  const thumbLeft = (percent / 100) * SLIDER_WIDTH;

  return (
    <View
      ref={containerRef}
      style={styles.speedSliderContainer}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, width, _height, pageX) => {
          widthRef.current = width;
          pageXRef.current = pageX;
        });
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={event => applyPageX(event.nativeEvent.pageX)}
      onResponderMove={event => applyPageX(event.nativeEvent.pageX)}
    >
      <View
        style={[
          styles.speedSliderTrack,
          { backgroundColor: palette.surfaceAlt },
        ]}
      >
        <View
          style={[
            styles.speedSliderFill,
            { width: fillWidth, backgroundColor: palette.primary },
          ]}
        />
      </View>
      <View
        style={[
          styles.speedSliderThumb,
          { left: thumbLeft, backgroundColor: palette.primary },
        ]}
      />
    </View>
  );
}

type RobotOperationSpeedPopoverProps = {
  visible: boolean;
  position: {
    x: number;
    y: number;
  };
  controlMode: ControlMode;
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
};

export function RobotOperationSpeedPopover({
  visible,
  position,
  controlMode,
  value,
  onChange,
  onClose,
}: RobotOperationSpeedPopoverProps) {
  const palette = usePalette();
  const speedLabel = controlMode === 'pose' ? '强度' : '速度';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View
          onStartShouldSetResponder={() => true}
          style={[
            styles.speedPopover,
            {
              left: position.x,
              top: position.y,
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.speedPopoverLabel, { color: palette.text }]}>
            {speedLabel}
          </Text>
          <SpeedSlider value={value} onChange={onChange} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  speedSliderContainer: {
    height: 32,
    justifyContent: 'center',
    width: SLIDER_WIDTH,
  },
  speedSliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  speedSliderFill: {
    height: '100%',
  },
  speedSliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: 8,
    elevation: 2,
  },
  speedPopover: {
    position: 'absolute',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 192,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedPopoverLabel: {
    fontSize: 12,
  },
});
