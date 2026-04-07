import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://192.168.0.172:3000/api';

const AdminShiftHistory = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/shifts/all`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      const sorted = (data.data || []).sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime));
      setShifts(sorted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const getDuration = (shift) => {
    if (!shift.clockOutTime) return 'Ongoing';
    const mins = Math.floor((new Date(shift.clockOutTime) - new Date(shift.clockInTime)) / 60000);
    return `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  const filtered = shifts.filter(s =>
    (s.guard ? `${s.guard.firstName} ${s.guard.lastName}` : '').toLowerCase().includes(search.toLowerCase()) ||
    (s.site?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const statColor = { active: '#4CAF50', completed: '#2196F3', missed: '#f44336' };

  const renderShift = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.guard ? `${item.guard.firstName} ${item.guard.lastName}` : 'Unknown'}</Text>
        <View style={[styles.badge, { backgroundColor: statColor[item.status] || '#555' }]}>
          <Text style={styles.badgeText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.site}>{item.site?.name || 'Unknown Site'}</Text>
      <View style={styles.timeRow}>
        <Text style={styles.time}>In: {new Date(item.clockInTime).toLocaleString()}</Text>
        <Text style={styles.duration}>{getDuration(item)}</Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#607D8B" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search shifts..." placeholderTextColor="#666" />
      </View>
      <FlatList data={filtered} keyExtractor={s => s.id} renderItem={renderShift}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShifts(); }} colors={['#607D8B']} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.count}>{filtered.length} shifts</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  searchBox: { padding: 10, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#333' },
  searchInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 },
  count: { color: '#555', fontSize: 12, marginBottom: 10 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  site: { color: '#888', fontSize: 13, marginBottom: 6 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: '#666', fontSize: 12 },
  duration: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
});

export default AdminShiftHistory;
