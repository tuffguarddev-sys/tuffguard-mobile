import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal, ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://192.168.0.172:3000/api';
const sevColor = { low: '#4CAF50', medium: '#FF9800', high: '#f44336', critical: '#9C27B0' };
const statColor = { open: '#f44336', investigating: '#FF9800', resolved: '#4CAF50', closed: '#555' };

const AdminIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadIncidents(); }, []);

  const loadIncidents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/incidents`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setIncidents(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const updateStatus = async (id, status) => {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API}/incidents/${id}`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSelected(null);
    loadIncidents();
  };

  const deleteIncident = async (id) => {
    Alert.alert('Delete Incident', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const token = await AsyncStorage.getItem('token');
        await fetch(`${API}/incidents/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        setSelected(null);
        loadIncidents();
      }},
    ]);
  };

  const filtered = incidents.filter(i =>
    (i.title || i.incidentType || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.site?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderIncident = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={styles.cardHeader}>
        <View style={[styles.sevDot, { backgroundColor: sevColor[item.severity] || '#555' }]} />
        <Text style={styles.title} numberOfLines={1}>{item.title || item.incidentType}</Text>
        <View style={[styles.statBadge, { backgroundColor: statColor[item.status] || '#555' }]}>
          <Text style={styles.statText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.site}>{item.site?.name || 'Unknown Site'}</Text>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#f44336" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search incidents..." placeholderTextColor="#666" />
      </View>
      <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderIncident}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadIncidents(); }} colors={['#f44336']} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.count}>{filtered.length} incidents</Text>}
      />

      {selected && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selected.title || selected.incidentType}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.sevBadge, { backgroundColor: sevColor[selected.severity] || '#555' }]}>
                      <Text style={styles.badgeText}>{selected.severity?.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.sevBadge, { backgroundColor: statColor[selected.status] || '#555' }]}>
                      <Text style={styles.badgeText}>{selected.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <Text style={styles.fieldValue}>{selected.description}</Text>
                  <Text style={styles.fieldLabel}>Site</Text>
                  <Text style={styles.fieldValue}>{selected.site?.name || 'Unknown'}</Text>
                  <Text style={styles.fieldLabel}>Reporter</Text>
                  <Text style={styles.fieldValue}>{selected.reporter ? `${selected.reporter.firstName} ${selected.reporter.lastName}` : 'Unknown'}</Text>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <Text style={styles.fieldValue}>{new Date(selected.createdAt).toLocaleString()}</Text>

                  <Text style={styles.fieldLabel}>Update Status</Text>
                  <View style={styles.statusBtns}>
                    {['open', 'investigating', 'resolved', 'closed'].map(s => (
                      <TouchableOpacity key={s} style={[styles.statusBtn, { backgroundColor: statColor[s] || '#555', opacity: selected.status === s ? 1 : 0.5 }]}
                        onPress={() => updateStatus(selected.id, s)}>
                        <Text style={styles.statusBtnText}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteIncident(selected.id)}>
                    <Text style={styles.deleteBtnText}>Delete Incident</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sevDot: { width: 10, height: 10, borderRadius: 5 },
  title: { flex: 1, color: '#fff', fontSize: 15, fontWeight: 'bold' },
  statBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  site: { color: '#888', fontSize: 13, marginBottom: 2 },
  date: { color: '#555', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 12 },
  closeBtn: { color: '#666', fontSize: 20 },
  modalBody: { padding: 20, gap: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sevBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  fieldLabel: { color: '#666', fontSize: 12, marginTop: 8, textTransform: 'uppercase' },
  fieldValue: { color: '#fff', fontSize: 14 },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  statusBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#2a1a1a', borderWidth: 1, borderColor: '#f44336', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: '#f44336', fontSize: 15, fontWeight: 'bold' },
});

export default AdminIncidents;
