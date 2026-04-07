import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal,
  ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://192.168.0.172:3000/api';

const AdminShiftReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/shift-reports`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setReports(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const openEdit = (report) => {
    setForm({
      userFirstName: report.userFirstName || '',
      userLastName: report.userLastName || '',
      siteName: report.siteName || '',
      activities: report.activities || '',
      incidents: report.incidents || '',
      equipmentStatus: report.equipmentStatus || '',
      notes: report.notes || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API}/shift-reports/${selected.id}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setEditing(false);
      setSelected(null);
      loadReports();
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes');
    } finally { setSaving(false); }
  };

  const deleteReport = async (id) => {
    Alert.alert('Delete Report', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const token = await AsyncStorage.getItem('token');
        await fetch(`${API}/shift-reports/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        setSelected(null);
        loadReports();
      }},
    ]);
  };

  const filtered = reports.filter(r =>
    `${r.userFirstName} ${r.userLastName} ${r.siteName || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const Field = ({ label, value, field, multiline }) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
          value={form[field] || ''}
          onChangeText={v => setForm(prev => ({ ...prev, [field]: v }))}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          placeholderTextColor="#555"
          placeholder={label}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      )}
    </View>
  );

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#9C27B0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search reports..." placeholderTextColor="#666" />
      </View>

      <FlatList data={filtered} keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} colors={['#9C27B0']} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.count}>{filtered.length} reports</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); setEditing(false); }}>
            <Text style={styles.name}>{item.userFirstName} {item.userLastName}</Text>
            <Text style={styles.site}>{item.siteName || 'Unknown Site'}</Text>
            <Text style={styles.date}>{new Date(item.submittedAt || item.createdAt).toLocaleString()}</Text>
            <Text style={styles.preview} numberOfLines={2}>{item.activities}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Detail / Edit Modal */}
      {selected && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selected.userFirstName} {selected.userLastName}</Text>
                  <Text style={styles.modalSub}>{selected.siteName} · {new Date(selected.submittedAt || selected.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelected(null); setEditing(false); }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Edit / View Toggle */}
              <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tab, !editing && styles.tabActive]} onPress={() => setEditing(false)}>
                  <Text style={[styles.tabText, !editing && styles.tabTextActive]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, editing && styles.tabActive]} onPress={() => openEdit(selected)}>
                  <Text style={[styles.tabText, editing && styles.tabTextActive]}>Edit</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                {/* Clock times */}
                <View style={styles.timeRow}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Clock In</Text>
                    <Text style={styles.fieldValue}>{selected.clockIn ? new Date(selected.clockIn).toLocaleTimeString() : '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Clock Out</Text>
                    <Text style={styles.fieldValue}>{selected.clockOut ? new Date(selected.clockOut).toLocaleTimeString() : '—'}</Text>
                  </View>
                </View>

                <Field label="First Name" value={selected.userFirstName} field="userFirstName" />
                <Field label="Last Name" value={selected.userLastName} field="userLastName" />
                <Field label="Site Name" value={selected.siteName} field="siteName" />
                <Field label="Activities" value={selected.activities} field="activities" multiline />
                <Field label="Incidents" value={selected.incidents} field="incidents" multiline />
                <Field label="Equipment Status" value={selected.equipmentStatus} field="equipmentStatus" multiline />
                <Field label="Notes" value={selected.notes} field="notes" multiline />

                {/* Check-ins */}
                {!editing && selected.checkIns?.length > 0 && (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Check-Ins ({selected.checkIns.length})</Text>
                    {selected.checkIns.map((ci, i) => (
                      <View key={i} style={styles.checkInRow}>
                        <Text style={styles.checkInTime}>{new Date(ci.timestamp).toLocaleTimeString()}</Text>
                        {ci.notes && <Text style={styles.checkInNote}> — {ci.notes}</Text>}
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons */}
                {editing ? (
                  <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
                      <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteReport(selected.id)}>
                    <Text style={styles.deleteBtnText}>Delete Report</Text>
                  </TouchableOpacity>
                )}
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
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#9C27B0' },
  name: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  site: { color: '#888', fontSize: 13, marginTop: 2 },
  date: { color: '#555', fontSize: 12, marginTop: 2 },
  preview: { color: '#666', fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalSub: { color: '#666', fontSize: 12, marginTop: 2 },
  closeBtn: { color: '#666', fontSize: 20, padding: 4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#9C27B0' },
  tabText: { color: '#666', fontSize: 14 },
  tabTextActive: { color: '#9C27B0', fontWeight: 'bold' },
  modalBody: { padding: 20, gap: 8 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#111', borderRadius: 8, padding: 12, marginBottom: 8 },
  fieldBlock: { marginBottom: 8 },
  fieldLabel: { color: '#666', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  fieldValue: { color: '#fff', fontSize: 14 },
  fieldInput: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, color: '#fff', fontSize: 14 },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  checkInRow: { flexDirection: 'row', paddingVertical: 4 },
  checkInTime: { color: '#4CAF50', fontSize: 13, fontWeight: 'bold' },
  checkInNote: { color: '#aaa', fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#555', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: '#9C27B0', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#2a1a1a', borderWidth: 1, borderColor: '#f44336', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: '#f44336', fontSize: 15, fontWeight: 'bold' },
});

export default AdminShiftReports;
