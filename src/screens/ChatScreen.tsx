import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useRobotControl from '../hooks/useRobotControl';
import ApiService from '../services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  actions?: string[];
}

const ChatScreen = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { selectedRobot } = useRobotControl();
  
  // 初始化对话
  useEffect(() => {
    // 添加欢迎消息
    setMessages([{
      id: 'welcome',
      text: '你好！我是机器狗AI助手，有什么可以帮助你的吗？',
      sender: 'ai',
      timestamp: new Date(),
    }]);
  }, []);

  const handleSend = async () => {
    if (inputText.trim() && selectedRobot) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        sender: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      
      try {
        // 发送消息到后端API
        const response = await ApiService.sendMessage(selectedRobot.uuid, inputText);
        
        // 添加AI响应
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: response.text || '我理解了您的请求，正在处理...',
          sender: 'ai',
          timestamp: new Date(),
          actions: response.actions || [],
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('发送消息失败:', error);
        
        // 如果API调用失败，显示模拟响应
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `我收到了你的消息："${inputText}"。如果需要让机器人执行动作，请明确说明动作类型，例如：让机器人前进、后退、坐下等。`,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiResponse]);
      }
    } else if (!selectedRobot) {
      Alert.alert('提示', '请先在操作页面选择一个机器人');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.aiMessage
    ]}>
      <View style={[
        styles.messageContent,
        item.sender === 'user' ? styles.userMessageContent : styles.aiMessageContent
      ]}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageSender}>
            {item.sender === 'user' ? '我' : 'AI助手'}
          </Text>
          <Text style={styles.messageTime}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.text}</Text>
        
        {item.actions && item.actions.length > 0 && (
          <View style={styles.messageActions}>
            <Text style={styles.actionsLabel}>建议动作:</Text>
            {item.actions.map((action, index) => (
              <Text key={index} style={styles.actionTag}>{action}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>对话</Text>
        {selectedRobot && (
          <Text style={styles.robotIndicator}>
            当前机器人: {selectedRobot.name}
          </Text>
        )}
      </View>
      
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesListContent}
        inverted
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 5,
  },
  robotIndicator: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesListContent: {
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    padding: 12,
    borderRadius: 15,
    maxWidth: '100%',
  },
  userMessageContent: {
    backgroundColor: '#667eea',
  },
  aiMessageContent: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#333',
  },
  messageActions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actionsLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  actionTag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    fontSize: 11,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    marginRight: 10,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatScreen;