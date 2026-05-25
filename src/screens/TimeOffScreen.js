import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';

const API = 'https://tuffguardsecurityms.com/api';

const statusConfig = {
  pending:  { color: colors.warning, bg: colors.warningBg, icon: 'schedule',     label: 'PENDING' },
  approved: { color: colors.primary, bg: colors.primaryBg, icon: 'check-circle', label: 'APPROVED' },
  denied:   { color: colors.danger,  bg: colors.dangerBg,  icon: 'cancel',       label: 'DENIED' },
};

const TimeOffScreen = () => {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/time-off`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load time off requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) return Alert.alert('Error', 'Please enter start and end dates');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return Alert.alert('Error', 'Date format must be YYYY-MM-DD\nExample: 2026-04-20');
    }
    if (new Date(startDate) > new Date(endDate)) {
      return Alert.alert('Error', 'Start date must be before end date');
    }
    if (new Date(startDate) < new Date()) {
      return Alert.alert('Error', 'Start date cannot be in the past');
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/time-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ startDate, endDate, reason })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Request Submitted', 'Your time off request has been submitted for approval.');
        setShowModal(false); setStartDate(''); setEndDate(''); setReason('');
        load();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit request');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (item) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this time off request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        setCancelling(item.id);
        try {
          const token = await AsyncStorage.getItem('token');
          const res = await fetch(`${API}/time-off/${item.id}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
          });
          if (res.ok) { load(); }
          else Alert.alert('Error', 'Failed to cancel request');
        } catch {
          Alert.alert('Error', 'Failed to cancel request');
        } finally {
          setCancelling(null);
        }
      }}
    ]);
  };

  const getDays = (start, end) => {
    const diff = new Date(end) - new Date(start);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Time Off</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statBox, { borderColor: colors.primary }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{requests.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Request Button */}
      <TouchableOpacity style={styles.requestBtn} onPress={() => setShowModal(true)}>
        <MaterialIcons name='event' size={20} color='#fff' />
        <Text style={styles.requestBtnText}>Request Time Off</Text>
      </TouchableOpacity>

      {/* Requests List */}
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name='beach-access' size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>Submit a time off request and it will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const stat = statusConfig[item.status] || statusConfig.pending;
          const days = getDays(item.startDate, item.endDate);
          return (
            <View style={[styles.card, { borderLeftColor: stat.color }]}>
              <View style={styles.cardTop}>
                <View style={[styles.statusPill, { backgroundColor: stat.bg, borderColor: stat.color }]}>
                  <MaterialIcons name={stat.icon} size={12} color={stat.color} />
                  <Text style={[styles.statusText, { color: stat.color }]}>{stat.label}</Text>
                </View>
                <Text style={styles.daysCount}>{days} day{days !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.dateRange}>
                {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
              {item.adminNote ? (
                <View style={styles.adminNoteBox}>
                  <Text style={styles.adminNoteLabel}>Manager Note</Text>
                  <Text style={styles.adminNoteText}>{item.adminNote}</Text>
                </View>
              ) : null}
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item)}
                  disabled={cancelling === item.id}>
                  {cancelling === item.id
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <Text style={styles.cancelBtnText}>Cancel Request</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Request Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Request Time Off</Text>
            <Text style={styles.modalSubtitle}>Submit a request for your manager to review</Text>

            <Text style={styles.inputLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={startDate}
              onChangeText={setStartDate}
            />
            <Text style={styles.inputLabel}>End Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={endDate}
              onChangeText={setEndDate}
            />
            {startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && (
              <Text style={styles.dayPreview}>
                {getDays(startDate, endDate)} day{getDays(startDate, endDate) !== 1 ? 's' : ''} requested
              </Text>
            )}
            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="E.g., Family vacation, medical appointment..."
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setShowModal(false); setStartDate(''); setEndDate(''); setReason(''); }}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  listContent: { padding: 16 },

  header: { backgroundColor: colors.bgHeader, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { backgroundColor: colors.bgCard, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.textSecondary, fontSize: 11 },

  requestBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  requestBtnIcon: { fontSize: 20 },
  requestBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusIcon: { fontSize: 12 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  daysCount: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  dateRange: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  reason: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  adminNoteBox: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 10, marginTop: 10 },
  adminNoteLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  adminNoteText: { color: colors.primary, fontSize: 13 },
  cancelBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, padding: 10, alignItems: 'center' },
  cancelBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontSize: 16, marginBottom: 14 },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  dayPreview: { color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  submitBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: { backgroundColor: colors.bgInput, padding: 14, borderRadius: 14, alignItems: 'center' },
  closeBtnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});

export default TimeOffScreen;
