import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const API = 'http://192.168.0.172:3000/api';

const AdminSites = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadSites(); }, []);

  const loadSites = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/sites`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setSites(data.data || data.sites || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const toggleActive = async (site) => {
    Alert.alert(
      `${site.isActive ? 'Deactivate' : 'Activate'} Site`,
      `${site.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          const token = await AsyncStorage.getItem('token');
          await fetch(`${API}/sites/${site.id}`, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !site.isActive }),
          });
          loadSites();
        }},
      ]
    );
  };

  const openMaps = (site) => {
    const addr = [site.address, site.city, site.state].filter(Boolean).join(', ');
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encodeURIComponent(addr)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
    Linking.openURL(url);
  };

  const filtered = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderSite = ({ item }) => (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: item.isActive ? '#1a2a1a' : '#2a1a1a', borderWidth: 1, borderColor: item.isActive ? '#4CAF50' : '#f44336' }]}>
          <Text style={[styles.badgeText, { color: item.isActive ? '#4CAF50' : '#f44336' }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.address}>{[item.address, item.city, item.state].filter(Boolean).join(', ')}</Text>
      {item.contactName && <Text style={styles.contact}>Contact: {item.contactName}</Text>}
      {item.contactPhone && <Text style={styles.phone}>{item.contactPhone}</Text>}
      {item.contactEmail && <Text style={styles.contact}>{item.contactEmail}</Text>}
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.dirBtn} onPress={() => openMaps(item)}>
          <Text style={styles.dirBtnText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, { borderColor: item.isActive ? '#f44336' : '#4CAF50' }]} onPress={() => toggleActive(item)}>
          <Text style={[styles.toggleBtnText, { color: item.isActive ? '#f44336' : '#4CAF50' }]}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#4CAF50" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search sites..." placeholderTextColor="#666" />
      </View>
      <FlatList data={filtered} keyExtractor={s => s.id} renderItem={renderSite}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSites(); }} colors={['#4CAF50']} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.count}>{filtered.length} sites</Text>}
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
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  cardInactive: { borderLeftColor: '#555', opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  address: { color: '#aaa', fontSize: 13, marginBottom: 4 },
  contact: { color: '#888', fontSize: 12, marginBottom: 2 },
  phone: { color: '#2196F3', fontSize: 13, marginBottom: 2 },
  notes: { color: '#666', fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dirBtn: { flex: 1, backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, alignItems: 'center' },
  dirBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  toggleBtn: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnText: { fontSize: 13, fontWeight: 'bold' },
});

export default AdminSites;
