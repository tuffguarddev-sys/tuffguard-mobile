import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { colors } from '../theme/colors';

const API = 'https://tuffguardsecurityms.com/api';

const typeConfig = {
  message:        { icon: '💬', color: colors.blue,    bg: colors.blueBg,    label: 'Message' },
  incident:       { icon: '⚠️', color: colors.danger,  bg: colors.dangerBg,  label: 'Incident' },
  shift_report:   { icon: '📋', color: colors.primary, bg: colors.primaryBg, label: 'Shift Report' },
  late_clockin:   { icon: '⏰', color: colors.warning, bg: colors.warningBg, label: 'Late Clock In' },
  missed_clockin: { icon: '🚫', color: colors.danger,  bg: colors.dangerBg,  label: 'Missed Clock In' },
  skipped_report: { icon: '📝', color: colors.warning, bg: colors.warningBg, label: 'Skipped Report' },
  time_off:       { icon: '📅', color: colors.primary, bg: colors.primaryBg, label: 'Time Off' },
  schedule:       { icon: '🗓️', color: colors.blue,    bg: colors.blueBg,    label: 'Schedule' },
};

const NotificationsScreen = () => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/notifications`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      const notifs = data.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const socket = socketService.socket;
    if (socket) {
      socket.on('notification:new', () => load());
    }
    return () => {
      if (socket) socket.off('notification:new');
    };
  }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const markRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const isToday = (date) => {
    const d = new Date(date);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const formatTime = (date) => {
    const d = new Date(date);
    if (isToday(date)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const todayNotifs = notifications.filter(n => isToday(n.createdAt));
  const earlierNotifs = notifications.filter(n => !isToday(n.createdAt));

  const renderNotification = ({ item }) => {
    const type = typeConfig[item.type] || { icon: '🔔', color: colors.textSecondary, bg: colors.bgInput, label: 'Notification' };
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => { if (!item.isRead) markRead(item.id); }}
        activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: type.bg, borderColor: type.color }]}>
          <Text style={styles.iconText}>{type.icon}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
              {item.title || type.label}
            </Text>
            <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
          </View>
          {item.message && <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>}
          <Text style={[styles.typeLabel, { color: type.color }]}>{type.label}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
        ListHeaderComponent={
          todayNotifs.length > 0 ? (
            <Text style={styles.sectionTitle}>TODAY</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up</Text>
          </View>
        }
        renderItem={renderNotification}
        ItemSeparatorComponent={() => {
          return null;
        }}
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
  unreadBadge: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  markAllText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  card: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  cardUnread: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 },
  iconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  notifTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '500', flex: 1 },
  notifTitleUnread: { color: colors.textPrimary, fontWeight: '700' },
  notifTime: { color: colors.textMuted, fontSize: 12, marginLeft: 8 },
  notifMessage: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  typeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 8, marginTop: 4 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});

export default NotificationsScreen;
