import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Modal,
  TextInput, ScrollView, Alert, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';

const API = 'https://tuffguardsecurityms.com/api';

const BannedIndividualsScreen = ({ route, navigation }) => {
  const { siteId, siteName } = route.params;
  const insets = useSafeAreaInsets();
  const [banned, setBanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ name: '', banDate: todayStr, reason: '', notes: '', photo: null });
  const [editingId, setEditingId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadBanned();
    AsyncStorage.getItem('user').then(data => {
      if (data) setUserRole(JSON.parse(data).role || '');
    });
  }, []);

  const loadBanned = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/banned?siteId=${siteId}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      setBanned(data.data || []);
    } catch (err) {
      console.error('Error loading banned:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setForm(f => ({ ...f, photo: result.assets[0] }));
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setForm(f => ({ ...f, photo: result.assets[0] }));
  };

  const submitBan = async () => {
    console.log('🔵 submitBan called');
    console.log('🔵 form state:', JSON.stringify({ name: form.name, banDate: form.banDate, reason: form.reason, notes: form.notes, hasPhoto: !!form.photo }));
    if (!form.banDate || !form.reason) { 
      console.log('🔴 Validation failed - banDate:', form.banDate, 'reason:', form.reason);
      Alert.alert('Required', 'Ban date and reason are required.'); 
      return; 
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🔵 Token retrieved:', token ? 'YES' : 'NO');
      console.log('🔵 siteId:', siteId);
      console.log('🔵 editingId:', editingId);
      const formData = new FormData();
      formData.append('siteId', siteId);
      formData.append('name', form.name);
      formData.append('banDate', form.banDate);
      formData.append('reason', form.reason);
      formData.append('notes', form.notes);
      if (form.photo) {
        console.log('🔵 Adding photo:', form.photo.uri);
        formData.append('photo', {
          uri: form.photo.uri,
          type: 'image/jpeg',
          name: 'ban-photo.jpg'
        });
      }
      const url = editingId ? `${API}/banned/${editingId}` : `${API}/banned`;
      const method = editingId ? 'PUT' : 'POST';
      console.log('🔵 Sending', method, 'to', url);
      const res = await fetch(url, {
        method,
        headers: { Authorization: 'Bearer ' + token },
        body: formData
      });
      console.log('🔵 Response status:', res.status);
      const data = await res.json();
      console.log('🔵 Response data:', JSON.stringify(data));
      if (data.success) {
        console.log('✅ Ban added successfully');
        setModalVisible(false);
        setEditingId(null);
        setForm({ name: '', banDate: new Date().toISOString().split('T')[0], reason: '', notes: '', photo: null });
        loadBanned();
      } else {
        console.log('🔴 Server error:', data.error);
        Alert.alert('Error', data.error || 'Failed to add banned individual.');
      }
    } catch (err) {
      console.error('🔴 submitBan catch error:', err.message);
      console.error('🔴 Full error:', err);
      Alert.alert('Error', 'Something went wrong: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const removeBan = (id) => {
    Alert.alert('Remove Ban', 'Are you sure you want to remove this individual from the banned list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          await fetch(`${API}/banned/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
          loadBanned();
        } catch (err) { Alert.alert('Error', 'Failed to remove.'); }
      }}
    ]);
  };

  const isAdmin = ['DEV', 'BOSS', 'MANAGER'].includes(userRole);
  const canEdit = ['DEV', 'BOSS', 'MANAGER', 'EMPLOYEE'].includes(userRole);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.caseFile}>
      <View style={styles.caseHeader}>
        <View style={styles.caseNumber}>
          <Text style={styles.caseNumberText}>CASE #{String(index + 1).padStart(3, '0')}</Text>
        </View>
        <Text style={styles.caseDate}>Banned: {formatDate(item.banDate)}</Text>
      </View>
      <View style={styles.caseBody}>
        {item.photo ? (
          <TouchableOpacity onPress={() => { setViewerImages([{ uri: `https://tuffguardsecurityms.com${item.photo}` }]); setViewerVisible(true); }}>
            <Image source={{ uri: `https://tuffguardsecurityms.com${item.photo}` }} style={styles.photo} />
          </TouchableOpacity>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>NO{'\n'}PHOTO</Text>
          </View>
        )}
        <View style={styles.caseDetails}>
          <Text style={styles.caseName}>{item.name || 'Unknown Individual'}</Text>
          <Text style={styles.caseReasonLabel}>REASON FOR BAN:</Text>
          <Text style={styles.caseReason}>{item.reason}</Text>
        </View>
      </View>
      {item.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>NOTES:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}
      {canEdit && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => {
            setEditingId(item.id);
            setSelectedDate(item.banDate ? new Date(item.banDate + 'T00:00:00') : new Date());
            setForm({ name: item.name || '', banDate: item.banDate || '', reason: item.reason || '', notes: item.notes || '', photo: null });
            setModalVisible(true);
          }}>
            <MaterialIcons name='edit' size={16} color={colors.textPrimary} />
            <Text style={styles.editBtnText}> Edit</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeBan(item.id)}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Banned Individuals</Text>
          <Text style={styles.headerSub}>{siteName}</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { setForm({ name: '', banDate: new Date().toISOString().split('T')[0], reason: '', notes: '', photo: null }); setModalVisible(true); }}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={banned}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBanned(); }} colors={[colors.blue]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name='check-circle' size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Banned Individuals</Text>
            <Text style={styles.emptyText}>This site has no banned individuals on record.</Text>
          </View>
        }
      />

      {/* Add Ban Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Entry' : 'Add Banned Individual'}</Text>

              <Text style={styles.label}>Full Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
                placeholder="Enter name if known"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Ban Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: form.banDate ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
                  {form.banDate || 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setSelectedDate(date);
                      const formatted = date.toISOString().split('T')[0];
                      setForm(f => ({ ...f, banDate: formatted }));
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Reason for Ban *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.reason}
                onChangeText={t => setForm(f => ({ ...f, reason: t }))}
                placeholder="Describe the incident..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={t => setForm(f => ({ ...f, notes: t }))}
                placeholder="Add any additional notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.label}>Photo (optional)</Text>
              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                  <MaterialIcons name='photo-library' size={18} color={colors.textPrimary} />
                  <Text style={styles.photoBtnText}> Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <MaterialIcons name='camera-alt' size={18} color={colors.textPrimary} />
                  <Text style={styles.photoBtnText}> Camera</Text>
                </TouchableOpacity>
              </View>
              {form.photo && (
                <Image source={{ uri: form.photo.uri }} style={styles.previewPhoto} resizeMode='contain' />
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setEditingId(null); setForm({ name: '', banDate: '', reason: '', notes: '', photo: null }); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={submitBan} disabled={submitting}>
                  <Text style={styles.submitBtnText}>{submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add to List'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ImageViewing
        images={viewerImages}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgHeader, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { paddingRight: 12 },
  backBtnText: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: '#ff4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  listContent: { padding: 16 },
  caseFile: { backgroundColor: colors.bgCard, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ff444433', overflow: 'hidden' },
  caseHeader: { backgroundColor: '#1a0a0a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ff444433' },
  caseNumber: {},
  caseNumberText: { color: '#ff4444', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  caseDate: { color: colors.textSecondary, fontSize: 11 },
  caseBody: { flexDirection: 'row', padding: 14, gap: 14 },
  photo: { width: 100, height: 130, borderRadius: 8, backgroundColor: colors.bgInput, resizeMode: 'cover' },
  noPhoto: { width: 80, height: 100, borderRadius: 8, backgroundColor: '#1a0a0a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ff444444' },
  noPhotoText: { color: '#ff4444', fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  caseDetails: { flex: 1 },
  caseName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  caseReasonLabel: { color: '#ff4444', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  caseReason: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  removeBtn: { margin: 14, marginTop: 0, backgroundColor: '#1a0a0a', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ff444455' },
  removeBtnText: { color: '#ff4444', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, margin: 14, marginTop: 0 },
  editBtn: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  editBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  notesBox: { marginHorizontal: 14, marginBottom: 8, backgroundColor: colors.bgInput, borderRadius: 8, padding: 10 },
  notesLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  notesText: { color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  photoBtnText: { color: colors.textPrimary, fontSize: 14 },
  previewPhoto: { width: '100%', height: 250, borderRadius: 10, marginTop: 10, resizeMode: 'contain' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: colors.bgInput, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 1, backgroundColor: '#ff4444', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default BannedIndividualsScreen;
