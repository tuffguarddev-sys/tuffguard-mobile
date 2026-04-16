import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Linking, Platform, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const SitesScreen = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    loadSites();
    AsyncStorage.getItem('user').then(data => {
      if (data) setUserRole(JSON.parse(data).role || '');
    });
  }, []);

  const loadSites = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/sites`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      const activeSites = (data.data || data.sites || []).filter(s => s.isActive);
      setSites(activeSites);
    } catch (err) {
      console.error('Error loading sites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSites();
  };

  const openMaps = (site) => {
    const address = [site.address, site.city, site.state, site.zipCode].filter(Boolean).join(', ');
    const encoded = encodeURIComponent(address);
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url);
  };

  const callSite = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
  };

  const filtered = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderSite = ({ item }) => {
    const fullAddress = [item.address, item.city, item.state, item.zipCode].filter(Boolean).join(', ');

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>

        {fullAddress ? (
          <TouchableOpacity onPress={() => openMaps(item)}>
            <Text style={styles.address}>{fullAddress}</Text>
          </TouchableOpacity>
        ) : null}

        {['DEV', 'BOSS', 'MANAGER'].includes(userRole) && item.contactPhone ? (
          <TouchableOpacity onPress={() => callSite(item.contactPhone)}>
            <Text style={styles.phone}>{item.contactPhone}</Text>
          </TouchableOpacity>
        ) : null}

        {['DEV', 'BOSS', 'MANAGER'].includes(userRole) && item.contactName ? (
          <Text style={styles.contact}>Contact: {item.contactName}</Text>
        ) : null}

        {['DEV', 'BOSS', 'MANAGER'].includes(userRole) && item.contactEmail ? (
          <Text style={styles.contact}>{item.contactEmail}</Text>
        ) : null}

        {item.notes ? (
          <Text style={styles.notes}>{item.notes}</Text>
        ) : null}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.dirBtn} onPress={() => openMaps(item)}>
            <Text style={styles.dirBtnText}>Get Directions</Text>
          </TouchableOpacity>
          {['DEV', 'BOSS', 'MANAGER'].includes(userRole) && item.contactPhone && (
            <TouchableOpacity style={styles.callBtn} onPress={() => callSite(item.contactPhone)}>
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>Loading sites...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Sites</Text>
        <Text style={styles.headerSub}>{sites.length} active site{sites.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search sites..."
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderSite}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2196F3']} tintColor="#2196F3" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sites found</Text>
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
  list: { padding: 16 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  name: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  address: { fontSize: 14, color: '#aaa', marginBottom: 6 },
  phone: { fontSize: 14, color: '#2196F3', marginBottom: 6 },
  contact: { fontSize: 13, color: '#888', marginBottom: 4 },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dirBtn: { flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  dirBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  callBtn: { backgroundColor: '#2196F3', paddingHorizontal: 20, padding: 12, borderRadius: 8, alignItems: 'center' },
  callBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#666', fontSize: 16 },
});

export default SitesScreen;
