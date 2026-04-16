import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const ShiftHistory = () => {
  const [shifts, setShifts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/shifts`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      const sorted = (data.data || []).sort(
        (a, b) => new Date(b.clockInTime) - new Date(a.clockInTime)
      );
      setShifts(sorted);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
  };

  const getWeeklyHours = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 5=Fri
    // Find last Friday
    const daysSinceFriday = (day + 2) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceFriday);
    weekStart.setHours(0, 0, 0, 0);
    const nextFriday = new Date(weekStart);
    nextFriday.setDate(weekStart.getDate() + 7);

    let totalMins = 0;
    shifts.forEach(shift => {
      if (!shift.clockInTime || !shift.clockOutTime) return;
      const clockIn = new Date(shift.clockInTime);
      if (clockIn >= weekStart && clockIn < nextFriday) {
        const mins = Math.floor((new Date(shift.clockOutTime) - clockIn) / 60000);
        if (mins > 0) totalMins += mins;
      }
    });
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return { hours, mins, weekStart, nextFriday: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000) };
  };

  const getDuration = (shift) => {
    if (!shift.clockOutTime) return 'Ongoing';
    const start = new Date(shift.clockInTime);
    const end = new Date(shift.clockOutTime);
    const mins = Math.floor((end - start) / 60000);
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours}h ${remaining}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'missed': return '#f44336';
      default: return '#666';
    }
  };

  const renderShift = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.siteName}>{item.site?.name || 'Unknown Site'}</Text>
          <Text style={styles.date}>
            {new Date(item.clockInTime).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Clock In</Text>
          <Text style={styles.timeValue}>
            {new Date(item.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.timeDivider}>
          <Text style={styles.durationText}>{getDuration(item)}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Clock Out</Text>
          <Text style={styles.timeValue}>
            {item.clockOutTime
              ? new Date(item.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </Text>
        </View>
      </View>

      {item.site && (
        <Text style={styles.address}>
          {[item.site.address, item.site.city, item.site.state].filter(Boolean).join(', ')}
        </Text>
      )}
    </View>
  );

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.loadingText}>Loading shift history...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shift History</Text>
        <Text style={styles.headerSub}>{shifts.length} shift{shifts.length !== 1 ? 's' : ''} recorded</Text>
        {shifts.length > 0 && (() => {
          const { hours, mins, weekStart, nextFriday } = getWeeklyHours();
          return (
            <View style={styles.weeklyBox}>
              <View>
                <Text style={styles.weeklyLabel}>This Week</Text>
                <Text style={styles.weeklyRange}>
                  {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {nextFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <View style={styles.weeklyHours}>
                <Text style={styles.weeklyHoursNum}>{hours}<Text style={styles.weeklyHoursUnit}>h</Text> {mins}<Text style={styles.weeklyHoursUnit}>m</Text></Text>
                <Text style={styles.weeklyHoursLabel}>Total Hours</Text>
              </View>
            </View>
          );
        })()}
      </View>

      {shifts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No shifts recorded yet</Text>
          <Text style={styles.emptySubtext}>Your completed shifts will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={item => item.id}
          renderItem={renderShift}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
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
  weeklyBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#333' },
  weeklyLabel: { color: '#4CAF50', fontSize: 13, fontWeight: 'bold' },
  weeklyRange: { color: '#666', fontSize: 11, marginTop: 2 },
  weeklyHours: { alignItems: 'flex-end' },
  weeklyHoursNum: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  weeklyHoursUnit: { fontSize: 14, color: '#888' },
  weeklyHoursLabel: { color: '#666', fontSize: 11, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { color: '#666', fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  siteName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  date: { color: '#888', fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, padding: 12, marginBottom: 8 },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { color: '#666', fontSize: 11, marginBottom: 4 },
  timeValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  timeDivider: { paddingHorizontal: 12, alignItems: 'center' },
  durationText: { color: '#4CAF50', fontSize: 13, fontWeight: 'bold' },
  address: { color: '#666', fontSize: 12, marginTop: 4 },
});

export default ShiftHistory;
