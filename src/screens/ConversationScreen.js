import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConversationFromAPI, sendMessageToAPI, markMessageAsReadAPI } from '../services/api';

const ConversationScreen = ({ route, navigation }) => {
  const { otherUserId, otherUserName, currentUser } = route.params;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const intervalRef = useRef(null);


  useEffect(() => {
    navigation.setOptions({ title: otherUserName });
    loadConversation();
    intervalRef.current = setInterval(loadConversation, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const loadConversation = useCallback(async () => {
    try {
      const response = await getConversationFromAPI(otherUserId);
      const msgs = (response?.data || []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(msgs);
      // Mark unread as read
      const userData = await AsyncStorage.getItem('user');
      const me = userData ? JSON.parse(userData) : null;
      msgs.forEach(msg => {
        if (msg.recipientId === me?.id && !msg.isRead) {
          markMessageAsReadAPI(msg.id).catch(() => {});
        }
      });
    } catch (err) {
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await sendMessageToAPI(otherUserId, text, 'Message');
      await loadConversation();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffH = (now - date) / 3600000;
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffH < 24) return timeStr;
    if (diffH < 48) return `Yesterday ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderId === currentUser?.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showTime = !prevMsg || 
      (new Date(item.createdAt) - new Date(prevMsg.createdAt)) > 5 * 60 * 1000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeStamp}>{formatTime(item.createdAt)}</Text>
        )}
        <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, !isMe && !item.isRead && styles.bubbleUnread]}>
            <Text style={styles.bubbleText}>{item.content || item.body || ''}</Text>
            {isMe && (
              <Text style={styles.readReceipt}>{item.isRead ? 'Read' : 'Delivered'}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableOpacity activeOpacity={1} style={styles.flex} onPress={() => inputRef.current?.focus()}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySub}>Send a message to start the conversation</Text>
            </View>
          }
        />
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Message..."
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendBtnText}>Send</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  msgList: { padding: 16, flexGrow: 1 },
  timeStamp: { color: '#555', fontSize: 11, textAlign: 'center', marginVertical: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 4 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#2196F3', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1e1e1e', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#333' },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  bubbleUnread: { borderLeftWidth: 3, borderLeftColor: '#2196F3' },
  readReceipt: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'right', marginTop: 3 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptySub: { color: '#666', fontSize: 13, textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, paddingBottom: Platform.OS === 'android' ? 24 : 10, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222' },
  input: { flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 120, marginRight: 8 },
  sendBtn: { backgroundColor: '#2196F3', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#444' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default ConversationScreen;
