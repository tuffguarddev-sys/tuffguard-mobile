import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSchedules, apiRequest } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const API = 'https://tuffguardsecurityms.com/api';

const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CalendarSchedule = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOffModal, setTimeOffModal] = useState(false);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeOffForm, setTimeOffForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());

  useEffect(() => {
    loadUser();
    loadSchedules();
    loadTimeOffRequests();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) { console.error(error); }
  };

  const loadSchedules = async () => {
    try {
      const data = await getSchedules();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const loadTimeOffRequests = async () => {
    try {
      const data = await apiRequest('/time-off/my', 'GET');
      setTimeOffRequests(data.data || []);
    } catch (err) { console.error('Time off load error:', err); }
  };

  const submitTimeOff = async () => {
    if (!timeOffForm.startDate || !timeOffForm.endDate) {
      Alert.alert('Required', 'Please select start and end dates.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest('/time-off', 'POST', timeOffForm);
      if (data.success) {
        Alert.alert('Success', 'Time off request submitted.');
        setTimeOffModal(false);
        setTimeOffForm({ startDate: '', endDate: '', reason: '' });
        loadTimeOffRequests();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit request.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', err.message || 'Failed to submit request.');
    } finally { setSubmitting(false); }
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const daySchedules = schedules.filter(s => s.startTime && s.startTime.split('T')[0] === selectedDate);

  const statusColor = { pending: '#FF9800', approved: '#4CAF50', denied: '#f44336' };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }} style={styles.container}>
      {/* Request Time Off Section */}
      <View style={styles.timeOffSection}>
        <View style={styles.timeOffHeader}>
          <Text style={styles.timeOffTitle}>Time Off Requests</Text>
          <TouchableOpacity style={styles.requestBtn} onPress={() => setTimeOffModal(true)}>
            <Text style={styles.requestBtnText}>+ Request</Text>
          </TouchableOpacity>
        </View>

        {timeOffRequests.length === 0 ? (
          <Text style={styles.noRequests}>No time off requests</Text>
        ) : (
          timeOffRequests.map(r => (
            <View key={r.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestDates}>{r.startDate} → {r.endDate}</Text>
                {r.reason ? <Text style={styles.requestReason}>{r.reason}</Text> : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor[r.status] + '22', borderColor: statusColor[r.status] }]}>
                <Text style={[styles.statusText, { color: statusColor[r.status] }]}>{r.status.toUpperCase()}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Date Navigation */}
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

      {/* Schedule */}
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 40 }} />
      ) : daySchedules.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No shifts scheduled for this day</Text>
        </View>
      ) : (
        <View style={styles.scheduleList}>
          {daySchedules.map(s => (
            <View key={s.id} style={styles.scheduleCard}>
              <Text style={styles.siteName}>{s.site?.name || 'Unknown Site'}</Text>
              <Text style={styles.shiftTime}>{formatTime(s.startTime)} — {formatTime(s.endTime)}</Text>
              {s.notes && <Text style={styles.notes}>{s.notes}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Time Off Request Modal */}
      <Modal visible={timeOffModal} transparent animationType="slide" onRequestClose={() => setTimeOffModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimeOffModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={styles.modal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Request Time Off</Text>
                  <TouchableOpacity onPress={() => setTimeOffModal(false)}>
                    <Text style={styles.modalClose}></Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.datePickerText}>{timeOffForm.startDate || 'Select start date'}</Text>
                    
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startDateObj}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowStartPicker(Platform.OS === 'ios');
                        if (date) {
                          setStartDateObj(date);
                          setTimeOffForm(f => ({ ...f, startDate: formatLocalDate(date) }));
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}

                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.datePickerText}>{timeOffForm.endDate || 'Select end date'}</Text>
                    
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={endDateObj}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowEndPicker(Platform.OS === 'ios');
                        if (date) {
                          setEndDateObj(date);
                          setTimeOffForm(f => ({ ...f, endDate: formatLocalDate(date) }));
                        }
                      }}
                      minimumDate={startDateObj}
                    />
                  )}

                  <Text style={styles.fieldLabel}>Reason (optional)</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMulti]}
                    value={timeOffForm.reason}
                    onChangeText={v => setTimeOffForm(f => ({ ...f, reason: v }))}
                    placeholder="Reason for time off..."
                    placeholderTextColor="#555"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setTimeOffModal(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={submitTimeOff} disabled={submitting}>
                    <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  timeOffSection: { backgroundColor: '#1a1a1a', margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#333' },
  timeOffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  timeOffTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  requestBtn: { backgroundColor: '#2196F3', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  requestBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  noRequests: { color: '#555', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  requestCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#2a2a2a' },
  requestInfo: { flex: 1 },
  requestDates: { color: '#fff', fontSize: 13, fontWeight: '600' },
  requestReason: { color: '#888', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  dateNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  navBtn: { padding: 8 },
  navText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  todayBtn: { color: '#2196F3', fontSize: 12, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 15 },
  scheduleList: { padding: 16 },
  scheduleCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  siteName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  shiftTime: { color: '#2196F3', fontSize: 14 },
  notes: { color: '#666', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  datePickerBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  datePickerText: { color: '#fff', fontSize: 14 },
  datePickerIcon: { fontSize: 16 },
  modal: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalClose: { color: '#666', fontSize: 20 },
  modalBody: { padding: 20, gap: 8 },
  fieldLabel: { color: '#666', fontSize: 12, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
  fieldInput: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14 },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#333' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#555', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 15 },
  submitBtn: { flex: 1, backgroundColor: '#2196F3', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default CalendarSchedule;
