import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://192.168.0.172:3000/api';

const AdminSchedule = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/schedules`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const deleteSchedule = async (id) => {
    Alert.alert('Delete Schedule', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const token = await AsyncStorage.getItem('token');
        await fetch(`${API}/schedules/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        loadSchedules();
      }},
    ]);
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateDisplay = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const daySchedules = schedules.filter(s => s.startTime && s.startTime.split('T')[0] === selectedDate);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#FF9800" /></View>;

  return (
    <View style={styles.container}>
      {/* Date Nav */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateLabel}>{formatDateDisplay(selectedDate)}</Text>
          <TouchableOpacity onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
            <Text style={styles.todayBtn}>Today</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.listHeader}>
        <Text style={styles.count}>{daySchedules.length} shift{daySchedules.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateSchedule')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={daySchedules}
        keyExtractor={s => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSchedules(); }} colors={['#FF9800']} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No shifts scheduled</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateSchedule')}>
              <Text style={styles.addBtnText}>+ Add Schedule</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.guardName}>
                {item.guard ? `${item.guard.firstName} ${item.guard.lastName}` : 'Unknown Guard'}
              </Text>
              <TouchableOpacity onPress={() => deleteSchedule(item.id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.siteName}>{item.site?.name || 'Unknown Site'}</Text>
            <Text style={styles.time}>{formatTime(item.startTime)} — {formatTime(item.endTime)}</Text>
            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  dateNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  navBtn: { padding: 8 },
  navText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  todayBtn: { color: '#FF9800', fontSize: 12, marginTop: 2 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  count: { color: '#555', fontSize: 12 },
  addBtn: { backgroundColor: '#FF9800', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { color: '#666', fontSize: 16, marginBottom: 8 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  guardName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  deleteBtn: { color: '#f44336', fontSize: 13 },
  siteName: { color: '#888', fontSize: 13, marginBottom: 4 },
  time: { color: '#FF9800', fontSize: 13 },
  notes: { color: '#666', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
});

export default AdminSchedule;
