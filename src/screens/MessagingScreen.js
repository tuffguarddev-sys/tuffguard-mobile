import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessagesFromAPI, getAllUsers, getUnreadCountAPI } from '../services/api';

const MessagingScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const me = userData ? JSON.parse(userData) : null;
      if (!me) return;
      setCurrentUser(me);

      // Load all users and messages in parallel
      const [allUsers, msgData] = await Promise.all([
        getAllUsers(),
        getMessagesFromAPI(),
      ]);

      // Filter out current user and clients
      const otherUsers = (allUsers || []).filter(u => u.id !== me.id && u.role !== 'CLIENT');

      // Build conversation map from messages
      const msgs = msgData?.data || msgData || [];
      const convMap = {};
      msgs.forEach(msg => {
        const isMe = msg.senderId === me.id;
        const otherId = isMe ? msg.recipientId : msg.senderId;
        if (!convMap[otherId]) {
          convMap[otherId] = { lastMessage: '', timestamp: null, unread: 0 };
        }
        if (!convMap[otherId].timestamp || new Date(msg.createdAt) > new Date(convMap[otherId].timestamp)) {
          convMap[otherId].lastMessage = msg.content || msg.body || '';
          convMap[otherId].timestamp = msg.createdAt;
        }
        if (!msg.isRead && !isMe) convMap[otherId].unread++;
      });

      setConversations(convMap);
      setUsers(otherUsers);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffH = (now - date) / 3600000;
    if (diffH < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (user) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'DEV': return '#9C27B0';
      case 'BOSS': return '#f44336';
      case 'MANAGER': return '#FF9800';
      case 'CLIENT': return '#2196F3';
      default: return '#4CAF50';
    }
  };

  // Sort users: those with conversations first (by time), then alphabetically
  const sortedUsers = [...users]
    .filter(u => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return name.includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const aConv = conversations[a.id];
      const bConv = conversations[b.id];
      if (aConv && bConv) return new Date(bConv.timestamp) - new Date(aConv.timestamp);
      if (aConv) return -1;
      if (bConv) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

  const renderUser = ({ item }) => {
    const conv = conversations[item.id];
    const hasConv = !!conv;

    return (
      <TouchableOpacity
        style={[styles.card, conv?.unread > 0 && styles.cardUnread]}
        onPress={() => navigation.navigate('Conversation', {
          otherUserId: item.id,
          otherUserName: `${item.firstName} ${item.lastName}`,
          currentUser,
        })}
      >
        <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.avatarText}>{getInitials(item)}</Text>
          {conv?.unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conv.unread}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.name, conv?.unread > 0 && styles.bold]}>
              {item.firstName} {item.lastName}
            </Text>
            {conv?.timestamp && (
              <Text style={styles.time}>{formatTime(conv.timestamp)}</Text>
            )}
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.role}>{item.role}</Text>
            {hasConv ? (
              <Text style={[styles.preview, conv?.unread > 0 && styles.bold]} numberOfLines={1}>
                {conv.lastMessage}
              </Text>
            ) : (
              <Text style={styles.noMessages}>Tap to start conversation</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>{users.length} contacts</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={sortedUsers}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2196F3']} tintColor="#2196F3" />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No contacts found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff', marginTop: 12 },
  header: { backgroundColor: '#1a1a1a', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#666', fontSize: 13, marginTop: 2 },
  searchContainer: { backgroundColor: '#111', padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  searchInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 },
  card: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  cardUnread: { borderColor: '#2196F3' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12, position: 'relative' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#f44336', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#000' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: '#fff', fontSize: 15 },
  bold: { fontWeight: 'bold' },
  time: { color: '#666', fontSize: 12 },
  cardFooter: { flexDirection: 'column' },
  role: { color: '#555', fontSize: 11, marginBottom: 2 },
  preview: { color: '#888', fontSize: 13 },
  noMessages: { color: '#444', fontSize: 12, fontStyle: 'italic' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#fff', fontSize: 16 },
});

export default MessagingScreen;
