import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(API + '/notifications', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setNotifications(data.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(API + '/notifications/read-all', { method: 'PUT', headers: { Authorization: 'Bearer ' + token } });
      load();
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const typeIcon = { message: '💬', incident: '⚠️', shift_report: '📋', late_clockin: '⏰', missed_clockin: '🚫', skipped_report: '📝' };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
        renderItem={({ item }) => (
          <View style={[styles.item, !item.isRead && styles.unread]}>
            <Text style={styles.icon}>{typeIcon[item.type] || '🔔'}</Text>
            <View style={styles.itemContent}>
              <Text style={styles.title}>{item.title}</Text>
              {item.message && <Text style={styles.message}>{item.message}</Text>}
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  markAllBtn: { padding: 12, alignItems: 'flex-end', paddingHorizontal: 16 },
  markAllText: { color: '#4CAF50', fontSize: 14 },
  empty: { color: '#999', textAlign: 'center', marginTop: 50, fontSize: 16 },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222', alignItems: 'flex-start' },
  unread: { backgroundColor: '#1a2a1a' },
  icon: { fontSize: 24, marginRight: 12 },
  itemContent: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  message: { color: '#999', fontSize: 13, marginTop: 3 },
  time: { color: '#666', fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginTop: 6 },
});

export default NotificationsScreen;
