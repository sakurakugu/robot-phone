import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import {
  buildTargetBoxStyle,
  formatChatTime,
  MESSAGE_IMAGE_HEIGHT,
  MESSAGE_IMAGE_WIDTH,
  type RobotChatMessage,
} from '../services/RobotChat';

type RobotChatMessageBubbleProps = {
  item: RobotChatMessage;
};

export function RobotChatMessageBubble({
  item,
}: RobotChatMessageBubbleProps) {
  const palette = usePalette();
  const isUser = item.role === 'user';
  const isRight = isUser && item.target !== 'robot';
  const bubbleLeftStyle = {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1 as const,
  };
  const bubbleRightStyle = {
    backgroundColor: palette.primary,
  };
  const metaLabelStyle = {
    color: isRight ? 'rgba(255,255,255,0.7)' : palette.textMuted,
  };
  const metaTimeStyle = {
    color: isRight ? 'rgba(255,255,255,0.6)' : palette.textMuted,
  };
  const messageTextStyle = {
    color: isRight ? '#FFFFFF' : palette.text,
  };

  if (item.loading) {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
        <View style={[styles.bubble, bubbleLeftStyle]}>
          <ActivityIndicator size="small" color={palette.primary} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bubbleRow,
        isRight ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isRight ? bubbleRightStyle : bubbleLeftStyle,
        ]}
      >
        <View style={styles.bubbleMeta}>
          <Text style={[styles.metaLabel, metaLabelStyle]}>
            {isUser
              ? item.target === 'ai'
                ? '用户 → AI'
                : '用户 → 机器狗'
              : 'AI助手'}
          </Text>
          <Text style={[styles.metaTime, metaTimeStyle]}>
            {formatChatTime(item.timestamp)}
          </Text>
        </View>
        <Text style={[styles.messageText, messageTextStyle]}>
          {item.text}
        </Text>
        {item.imageUrl ? (
          <View style={styles.messageImageWrap}>
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
            {item.targetPosition ? (
              <View
                style={[
                  styles.targetBox,
                  buildTargetBoxStyle(item.targetPosition),
                ]}
              />
            ) : null}
          </View>
        ) : null}
        {item.actions && item.actions.length > 0 ? (
          <View style={styles.actionTags}>
            <Text style={[styles.actionLabel, metaLabelStyle]}>
              ⚡ {item.actions.join(', ')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaTime: {
    fontSize: 10,
  },
  actionTags: {
    marginTop: 6,
  },
  actionLabel: {
    fontSize: 11,
  },
  messageText: {
    lineHeight: 20,
  },
  messageImageWrap: {
    marginTop: 8,
    width: MESSAGE_IMAGE_WIDTH,
    height: MESSAGE_IMAGE_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  messageImage: {
    width: MESSAGE_IMAGE_WIDTH,
    height: MESSAGE_IMAGE_HEIGHT,
  },
  targetBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ff3b30',
  },
});
