import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { usePalette } from '../../../app/theme/palette';
import { useRobotChatSession } from '../hooks/useRobotChatSession';
import { RobotChatComposer } from './RobotChatComposer';
import { RobotChatMessageBubble } from './RobotChatMessageBubble';

type RobotChatPanelProps = {
  robotUuid: string;
  robotName?: string;
  showStatusHeader?: boolean;
};

/**
 * 机器人聊天面板 —— 自包含 WebSocket 连接 + 聊天 UI
 * 可嵌入到 Screen 全屏页面或 ChatDrawer 抽屉中
 */
export function RobotChatPanel({
  robotUuid,
  robotName,
  showStatusHeader = false,
}: RobotChatPanelProps) {
  const palette = usePalette();
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const {
    flatListRef,
    input,
    setInput,
    messages,
    displayMessages,
    loadingHistory,
    hasMoreHistory,
    isConnected,
    statusText,
    audioMethods,
    playUri,
    finalizeCurrentAudio,
    handleSend,
    handleHistoryScrollBegin,
    handleHistoryEndReached,
  } = useRobotChatSession({ robotUuid, robotName });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      event => {
        setKeyboardOffset(event.endCoordinates.height);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset > 0 ? 90 : 0}
    >
      {showStatusHeader ? (
        <View
          style={[
            styles.statusHeader,
            { borderBottomColor: palette.border },
          ]}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isConnected
                  ? palette.success
                  : palette.textMuted,
              },
            ]}
          />
          <Text style={[styles.statusText, { color: palette.textMuted }]}>
            {statusText}
          </Text>
          {!isConnected ? (
            <ActivityIndicator
              size="small"
              color={palette.primary}
              style={styles.statusSpinner}
            />
          ) : null}
        </View>
      ) : null}

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            还没有对话记录，发送一条消息开始吧！
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          inverted
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
          renderItem={({ item }) => <RobotChatMessageBubble item={item} />}
          onScrollBeginDrag={handleHistoryScrollBegin}
          onEndReached={handleHistoryEndReached}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text
                  style={[
                    styles.historyLoadingText,
                    { color: palette.textMuted },
                  ]}
                >
                  正在加载更早的对话...
                </Text>
              </View>
            ) : hasMoreHistory ? (
              <View style={styles.historyLoading}>
                <Text
                  style={[
                    styles.historyLoadingText,
                    { color: palette.textMuted },
                  ]}
                >
                  上拉加载更多历史
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <RobotChatComposer
        input={input}
        isConnected={isConnected}
        audioMethods={audioMethods}
        onChangeInput={setInput}
        onSend={handleSend}
      />

      {playUri ? (
        <Video
          source={{ uri: playUri }}
          paused={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onEnd={finalizeCurrentAudio}
          onError={finalizeCurrentAudio}
          style={styles.hiddenAudio}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  statusSpinner: {
    marginLeft: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  historyLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    gap: 6,
  },
  historyLoadingText: {
    fontSize: 12,
  },
  hiddenAudio: {
    width: 0,
    height: 0,
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
