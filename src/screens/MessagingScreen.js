import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessagesFromAPI, getAllUsers } from '../services/api';
import socketService from '../services/socketService';
import { colors } from '../theme/colors';

const MessagingScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const meRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const me = userData ? JSON.parse(userData) : null;
      if (!me) return;
      setCurrentUser(me);
      meRef.current = me;

      const [allUsers, msgData] = await Promise.all([
        getAllUsers(),
        getMessagesFromAPI(),
      ]);

      const otherUsers = (allUsers || []).filter(u => u.id !== me.id && u.role !== 'CLIENT');
      const msgs = msgData?.data || msgData || [];
      const convMap = {};

      msgs.forEach(msg => {
        const isMe = msg.senderId === me.id;
        const otherId = isMe ? msg.recipientId : msg.senderId;
        if (!convMap[otherId]) convMap[otherId] = { lastMessage: '', timestamp: null, unread: 0, isMe: false };
        if (!convMap[otherId].timestamp || new Date(msg.createdAt) > new Date(convMap[otherId].timestamp)) {
          convMap[otherId].lastMessage = msg.content || msg.body || '';
          convMap[otherId].timestamp = msg.createdAt;
          convMap[otherId].isMe = isMe;
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

    // Socket listeners for real-time updates
    const socket = socketService.socket;
    if (socket) {
      socket.on('message:new', () => loadData());
      socket.on('users:online', ({ userIds }) => setOnlineUsers(new Set(userIds)));
      socket.on('user:online', ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])));
      socket.on('user:offline', ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));
    }

    return () => {
      if (socket) {
        socket.off('message:new');
        socket.off('users:online');
        socket.off('user:online');
        socket.off('user:offline');
      }
    };
  }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffH = (now - date) / 3600000;
    if (diffH < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (user) => `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  const getRoleColor = (role) => colors.roleColors[role] || colors.primary;

  const totalUnread = Object.values(conversations).reduce((sum, c) => sum + (c.unread || 0), 0);

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
    const isOnline = onlineUsers.has(item.id);
    const roleColor = getRoleColor(item.role);

    return (
      <TouchableOpacity
        style={[styles.card, conv?.unread > 0 && styles.cardUnread]}
        onPress={() => navigation.navigate('Conversation', {
          otherUserId: item.id,
          otherUserName: `${item.firstName} ${item.lastName}`,
          currentUser,
        })}
        activeOpacity={0.7}>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{getInitials(item)}</Text>
          </View>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.primary : colors.textMuted }]} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.name, conv?.unread > 0 && styles.nameBold]}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.time}>{conv?.timestamp ? formatTime(conv.timestamp) : ''}</Text>
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.roleTag}>{item.role}</Text>
            {conv ? (
              <Text style={[styles.preview, conv?.unread > 0 && styles.previewBold]} numberOfLines={1}>
                {conv.isMe ? '↗ ' : ''}{conv.lastMessage}
              </Text>
            ) : (
              <Text style={styles.noConv}>Tap to message</Text>
            )}
          </View>
        </View>

        {/* Unread Badge */}
        {conv?.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{conv.unread > 9 ? '9+' : conv.unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>{totalUnread} unread</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>{users.length} contacts · {onlineUsers.size} online</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={sortedUsers}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} tintColor={colors.blue} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No contacts found</Text>
            <Text style={styles.emptyText}>Try adjusting your search</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  listContent: { padding: 16 },

  header: { backgroundColor: colors.bgHeader, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 13 },
  totalUnreadBadge: { backgroundColor: colors.blue, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  totalUnreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgHeader, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 15 },
  clearSearch: { color: colors.textMuted, fontSize: 16, padding: 4 },

  card: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cardUnread: { borderColor: colors.blue, backgroundColor: '#0D1525' },

  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.bgCard },

  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  nameBold: { fontWeight: '700' },
  time: { color: colors.textMuted, fontSize: 12 },
  cardBottom: { gap: 2 },
  roleTag: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  preview: { color: colors.textSecondary, fontSize: 13 },
  previewBold: { color: colors.textPrimary, fontWeight: '600' },
  noConv: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },

  unreadBadge: { backgroundColor: colors.blue, borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});

export default MessagingScreen;
