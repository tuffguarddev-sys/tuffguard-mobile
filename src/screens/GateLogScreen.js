import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Alert, ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

const API = 'https://tuffguardsecurityms.com/api';

const ENTRY_TYPES = ['employee', 'visitor', 'contractor'];
const TYPE_COLORS = {
  employee: { color: colors.primary, bg: colors.primaryBg },
  visitor: { color: colors.blue, bg: colors.blueBg },
  contractor: { color: colors.warning, bg: colors.warningBg },
};

const GateLogScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [gateLog, setGateLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [form, setForm] = useState({
    name: '', type: 'visitor', timeIn: '', timeOut: '',
    breakStart: '', breakEnd: '', notes: '',
    idPhoto: null, licensePlatePhoto: null,
  });

  useEffect(() => {
    loadActiveShift();
    loadGateLog();
  }, []);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadActiveShift = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/shifts/active`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success && data.data) setActiveShift(data.data);
    } catch (err) { console.error(err); }
  };

  const loadGateLog = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/gate-logs/my`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      setGateLog(data.data || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createLog = async () => {
    if (!activeShift) {
      Alert.alert('Not Clocked In', 'You must be clocked in to start a gate log.');
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${API}/gate-logs`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: activeShift.siteId, shiftId: activeShift.id })
      });
      const data = await res.json();
      if (data.success) setGateLog(data.data);
      else Alert.alert('Error', data.error || 'Failed to create log');
    } catch (err) {
      Alert.alert('Error', 'Failed to create gate log');
    }
  };

  const resetForm = () => {
    setForm({ name: '', type: 'visitor', timeIn: '', timeOut: '', breakStart: '', breakEnd: '', notes: '', idPhoto: null, licensePlatePhoto: null });
    setEditEntry(null);
  };

  const openAddEntry = () => {
    resetForm();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setForm(f => ({ ...f, timeIn: timeStr }));
    setEntryModal(true);
  };

  const openEditEntry = (entry) => {
    setEditEntry(entry);
    setForm({
      name: entry.name || '',
      type: entry.type || 'visitor',
      timeIn: entry.timeIn || '',
      timeOut: entry.timeOut || '',
      breakStart: entry.breakStart || '',
      breakEnd: entry.breakEnd || '',
      notes: entry.notes || '',
      idPhoto: null,
      licensePlatePhoto: null,
    });
    setEntryModal(true);
  };

  const pickPhoto = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access.');
      return;
    }
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: async () => {
        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (camStatus !== 'granted') return;
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!result.canceled) setForm(f => ({ ...f, [field]: result.assets[0] }));
      }},
      { text: 'Gallery', onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!result.canceled) setForm(f => ({ ...f, [field]: result.assets[0] }));
      }},
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const saveEntry = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('type', form.type);
      if (form.timeIn) formData.append('timeIn', form.timeIn);
      if (form.timeOut) formData.append('timeOut', form.timeOut);
      if (form.breakStart) formData.append('breakStart', form.breakStart);
      if (form.breakEnd) formData.append('breakEnd', form.breakEnd);
      if (form.notes) formData.append('notes', form.notes);
      if (form.idPhoto) formData.append('idPhoto', { uri: form.idPhoto.uri, name: 'id.jpg', type: 'image/jpeg' });
      if (form.licensePlatePhoto) formData.append('licensePlatePhoto', { uri: form.licensePlatePhoto.uri, name: 'plate.jpg', type: 'image/jpeg' });

      const url = editEntry
        ? `${API}/gate-logs/${gateLog.id}/entries/${editEntry.id}`
        : `${API}/gate-logs/${gateLog.id}/entries`;
      const method = editEntry ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setEntryModal(false);
        resetForm();
        loadGateLog();
      } else {
        Alert.alert('Error', data.error || 'Failed to save entry');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save entry');
      console.error(err);
    }
  };

  const deleteEntry = (entryId) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const token = await getToken();
          await fetch(`${API}/gate-logs/${gateLog.id}/entries/${entryId}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
          });
          loadGateLog();
        } catch (err) { Alert.alert('Error', 'Failed to delete entry'); }
      }}
    ]);
  };

  const typeConfig = (type) => TYPE_COLORS[type] || TYPE_COLORS.visitor;

  const renderEntry = ({ item, index }) => {
    const tc = typeConfig(item.type);
    return (
      <View style={styles.entryCard}>
        <View style={styles.entryTop}>
          <View style={styles.entryLeft}>
            <Text style={styles.entryNum}>#{index + 1}</Text>
            <View>
              <Text style={styles.entryName}>{item.name}</Text>
              <View style={[styles.typePill, { backgroundColor: tc.bg, borderColor: tc.color }]}>
                <Text style={[styles.typeText, { color: tc.color }]}>{item.type.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          <View style={styles.entryActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditEntry(item)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteEntry(item.id)}>
              <Text style={styles.deleteBtnText}>Del</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.entryTimes}>
          {item.timeIn && <Text style={styles.timeChip}>In: {item.timeIn}</Text>}
          {item.timeOut && <Text style={styles.timeChip}>Out: {item.timeOut}</Text>}
          {item.breakStart && <Text style={[styles.timeChip, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>Break: {item.breakStart}{item.breakEnd ? ' - ' + item.breakEnd : ''}</Text>}
        </View>
        {item.notes ? <Text style={styles.entryNotes}>{item.notes}</Text> : null}
        {(item.idPhoto || item.licensePlatePhoto) && (
          <View style={styles.photoRow}>
            {item.idPhoto && <Text style={styles.photoTag}>ID Photo</Text>}
            {item.licensePlatePhoto && <Text style={styles.photoTag}>Plate Photo</Text>}
          </View>
        )}
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Gate Log</Text>
          <Text style={styles.headerSub}>
            {gateLog ? `${gateLog.entries?.length || 0} entries today` : 'No active log'}
          </Text>
        </View>
        {gateLog && (
          <View style={[styles.statusPill, { backgroundColor: gateLog.status === 'submitted' ? colors.primaryBg : colors.blueBg, borderColor: gateLog.status === 'submitted' ? colors.primary : colors.blue }]}>
            <Text style={[styles.statusText, { color: gateLog.status === 'submitted' ? colors.primary : colors.blue }]}>
              {gateLog.status === 'submitted' ? 'SUBMITTED' : 'OPEN'}
            </Text>
          </View>
        )}
      </View>

      {!gateLog ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Gate Log</Text>
          <Text style={styles.emptyText}>Start a gate log to track site visitors, employees, and contractors.</Text>
          {activeShift ? (
            <TouchableOpacity style={styles.startBtn} onPress={createLog}>
              <Text style={styles.startBtnText}>Start Gate Log</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.notClockedIn}>You must be clocked in to start a gate log.</Text>
          )}
        </View>
      ) : (
        <>
          {gateLog.site && <View style={styles.siteBar}><Text style={styles.siteBarText}>{gateLog.site.name}</Text></View>}
          {gateLog.status === 'open' && (
            <TouchableOpacity style={styles.addEntryBtn} onPress={openAddEntry}>
              <Text style={styles.addEntryBtnText}>+ Add Entry</Text>
            </TouchableOpacity>
          )}
          {gateLog.status === 'submitted' && (
            <View style={styles.submittedBanner}>
              <Text style={styles.submittedBannerText}>This log has been submitted and is read-only.</Text>
            </View>
          )}
          <FlatList
            data={gateLog.entries || []}
            keyExtractor={item => item.id}
            renderItem={renderEntry}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyEntries}>
                <Text style={styles.emptyEntriesText}>No entries yet. Tap + Add Entry to begin.</Text>
              </View>
            }
          />
        </>
      )}

      {/* Add/Edit Entry Modal */}
      <Modal visible={entryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editEntry ? 'Edit Entry' : 'Add Entry'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type selector */}
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {ENTRY_TYPES.map(t => {
                  const tc = typeConfig(t);
                  const selected = form.type === t;
                  return (
                    <TouchableOpacity key={t} style={[styles.typeBtn, selected && { backgroundColor: tc.bg, borderColor: tc.color }]} onPress={() => setForm(f => ({ ...f, type: t }))}>
                      <Text style={[styles.typeBtnText, selected && { color: tc.color }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput style={styles.fieldInput} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Full name" placeholderTextColor={colors.textMuted} />

              <View style={styles.timeGrid}>
                <View style={styles.timeGridItem}>
                  <Text style={styles.fieldLabel}>Time In</Text>
                  <TextInput style={styles.fieldInput} value={form.timeIn} onChangeText={v => setForm(f => ({ ...f, timeIn: v }))} placeholder="e.g. 08:30" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.timeGridItem}>
                  <Text style={styles.fieldLabel}>Time Out</Text>
                  <TextInput style={styles.fieldInput} value={form.timeOut} onChangeText={v => setForm(f => ({ ...f, timeOut: v }))} placeholder="e.g. 17:00" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={styles.timeGrid}>
                <View style={styles.timeGridItem}>
                  <Text style={styles.fieldLabel}>Break Start</Text>
                  <TextInput style={styles.fieldInput} value={form.breakStart} onChangeText={v => setForm(f => ({ ...f, breakStart: v }))} placeholder="e.g. 12:00" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.timeGridItem}>
                  <Text style={styles.fieldLabel}>Break End</Text>
                  <TextInput style={styles.fieldInput} value={form.breakEnd} onChangeText={v => setForm(f => ({ ...f, breakEnd: v }))} placeholder="e.g. 13:00" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput style={[styles.fieldInput, { minHeight: 70, textAlignVertical: 'top' }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes..." placeholderTextColor={colors.textMuted} multiline />

              <Text style={styles.fieldLabel}>Photos (optional)</Text>
              <View style={styles.photoButtons}>
                <TouchableOpacity style={[styles.photoBtn, form.idPhoto && styles.photoBtnDone]} onPress={() => pickPhoto('idPhoto')}>
                  <Text style={styles.photoBtnText}>{form.idPhoto ? 'ID Photo ✓' : 'Add ID Photo'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoBtn, form.licensePlatePhoto && styles.photoBtnDone]} onPress={() => pickPhoto('licensePlatePhoto')}>
                  <Text style={styles.photoBtnText}>{form.licensePlatePhoto ? 'Plate Photo ✓' : 'Add Plate Photo'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEntryModal(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
                <Text style={styles.saveBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { backgroundColor: colors.bgHeader, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  siteBar: { backgroundColor: colors.bgCard, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  siteBarText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  addEntryBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  addEntryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submittedBanner: { margin: 16, backgroundColor: colors.primaryBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.primary },
  submittedBannerText: { color: colors.primary, fontSize: 13, textAlign: 'center' },
  listContent: { padding: 16, paddingTop: 0 },
  entryCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  entryNum: { color: colors.textMuted, fontSize: 12, fontWeight: '700', width: 24 },
  entryName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  typeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  entryActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: colors.blueBg, borderWidth: 1, borderColor: colors.blue, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  editBtnText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  deleteBtn: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  deleteBtnText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  entryTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  timeChip: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, color: colors.textSecondary, fontSize: 12 },
  entryNotes: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  photoRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  photoTag: { backgroundColor: colors.primaryBg, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, color: colors.primary, fontSize: 11 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  startBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  notClockedIn: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  emptyEntries: { padding: 30, alignItems: 'center' },
  emptyEntriesText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  fieldInput: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, color: colors.textPrimary, fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', gap: 10 },
  timeGridItem: { flex: 1 },
  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  photoBtnDone: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  photoBtnText: { color: colors.textSecondary, fontSize: 13 },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textPrimary, fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default GateLogScreen;
