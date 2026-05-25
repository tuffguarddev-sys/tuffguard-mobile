import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';

const API = 'https://tuffguardsecurityms.com/api';

const CheckInScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [checkInInterval, setCheckInInterval] = useState(60);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const shiftData = await AsyncStorage.getItem('activeShift');
      const token = await AsyncStorage.getItem('token');
      if (shiftData) {
        const shift = JSON.parse(shiftData);
        setActiveShift(shift);
        const res = await fetch(`${API}/checkins/shift/${shift.id}`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        setCheckIns(data.data || []);
        if (shift.siteId) {
          const siteRes = await fetch(`${API}/sites/${shift.siteId}`, {
            headers: { Authorization: 'Bearer ' + token }
          });
          const siteData = await siteRes.json();
          if (siteData.site?.checkInInterval) setCheckInInterval(siteData.site.checkInInterval);
        }
      }
    } catch (err) {
      console.error('Load check-ins error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!activeShift) return Alert.alert('No Active Shift', 'You must be clocked in to check in.');
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ shiftId: activeShift.id, siteId: activeShift.siteId, notes: notes.trim() || null })
      });
      if (!res.ok) throw new Error('Failed to check in');
      Alert.alert('Check-In Recorded', `Time: ${new Date().toLocaleTimeString()}${notes.trim() ? '\n' + notes.trim() : ''}`);
      setNotes('');
      setShowModal(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to record check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const getNextCheckIn = () => {
    if (checkIns.length === 0) return null;
    const last = new Date(checkIns[checkIns.length - 1].timestamp);
    return new Date(last.getTime() + checkInInterval * 60 * 1000);
  };

  const getCountdown = () => {
    const next = getNextCheckIn();
    if (!next) return null;
    const diff = next - now;
    if (diff <= 0) return { text: 'OVERDUE', isOverdue: true, mins: 0 };
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return {
      text: hours > 0 ? `${hours}h ${remaining}m` : `${mins}m`,
      isOverdue: false,
      mins,
      percent: Math.max(0, Math.min(100, (diff / (checkInInterval * 60000)) * 100))
    };
  };

  const countdown = getCountdown();
  const isOverdue = countdown?.isOverdue;

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }} contentContainerStyle={{ padding: 16 }}>

        {/* Status Card */}
        {!activeShift ? (
          <View style={styles.noShiftCard}>
            <MaterialIcons name='lock' size={40} color={colors.textMuted} />
            <Text style={styles.noShiftTitle}>Not Clocked In</Text>
            <Text style={styles.noShiftText}>Clock in to start recording check-ins</Text>
          </View>
        ) : (
          <>
            {/* Interval Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Site</Text>
                <Text style={styles.infoValue}>{activeShift.siteName || 'Unknown'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Required Every</Text>
                <Text style={styles.infoValue}>{checkInInterval} minutes</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Check-ins</Text>
                <Text style={styles.infoValue}>{checkIns.length} this shift</Text>
              </View>
            </View>

            {/* Countdown */}
            {countdown ? (
              <View style={[styles.countdownCard, isOverdue && styles.countdownCardOverdue]}>
                <Text style={styles.countdownLabel}>
                  {isOverdue ? 'CHECK-IN OVERDUE' : 'NEXT CHECK-IN IN'}
                </Text>
                <Text style={[styles.countdownValue, isOverdue && styles.countdownValueOverdue]}>
                  {countdown.text}
                </Text>
                {!isOverdue && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${countdown.percent}%` }]} />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.countdownCard}>
                <Text style={styles.countdownLabel}>FIRST CHECK-IN</Text>
                <Text style={styles.countdownValue}>Ready</Text>
              </View>
            )}
          </>
        )}

        {/* Check-In Button */}
        <TouchableOpacity
          style={[styles.checkInBtn, !activeShift && styles.btnDisabled]}
          onPress={() => setShowModal(true)}
          disabled={!activeShift}>
          <MaterialIcons name='check-circle' size={28} color='#fff' />
          <View>
            <Text style={styles.checkInBtnText}>Check In Now</Text>
            <Text style={styles.checkInBtnSub}>{now.toLocaleTimeString()}</Text>
          </View>
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionTitle}>CHECK-IN HISTORY</Text>
        {checkIns.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No check-ins yet this shift</Text>
          </View>
        ) : (
          [...checkIns].reverse().map((item, index) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={[styles.historyDot, index === 0 && styles.historyDotFirst]} />
              <View style={styles.historyContent}>
                <Text style={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                {item.notes && <Text style={styles.historyNotes}>{item.notes}</Text>}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Record Check-In</Text>
            <Text style={styles.modalTime}>{new Date().toLocaleString()}</Text>
            <Text style={styles.modalLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="E.g., All clear, perimeter checked..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCheckIn} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Record Check-In</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setNotes(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
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

  noShiftCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  noShiftIcon: { fontSize: 40, marginBottom: 12 },
  noShiftTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  noShiftText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  infoCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: colors.textSecondary, fontSize: 13 },
  infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },

  countdownCard: { backgroundColor: colors.primaryBg, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  countdownCardOverdue: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  countdownLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  countdownValue: { color: colors.primary, fontSize: 36, fontWeight: '700' },
  countdownValueOverdue: { color: colors.danger },
  progressBar: { width: '100%', height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  checkInBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  btnDisabled: { opacity: 0.4 },
  checkInBtnIcon: { fontSize: 28 },
  checkInBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  checkInBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: colors.textMuted, fontSize: 15 },

  historyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textMuted, marginTop: 5, marginRight: 14 },
  historyDotFirst: { backgroundColor: colors.primary },
  historyContent: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  historyTime: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  historyDate: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  historyNotes: { color: colors.textSecondary, fontSize: 13, marginTop: 6, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalTime: { color: colors.primary, fontSize: 14, marginBottom: 16 },
  modalLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
  modalInput: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: colors.bgInput, padding: 14, borderRadius: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});

export default CheckInScreen;
