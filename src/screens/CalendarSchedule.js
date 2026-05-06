import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Alert, ActivityIndicator, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSchedules, apiRequest } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';

const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CalendarSchedule = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [timeOffModal, setTimeOffModal] = useState(false);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeOffForm, setTimeOffForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState(null);

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

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
      Alert.alert('Error', err.message || 'Failed to submit request.');
    } finally { setSubmitting(false); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });
  };

  const hasShift = (date) => {
    const dateStr = formatLocalDate(date);
    return schedules.some(s => s.startTime && s.startTime.split('T')[0] === dateStr);
  };

  const changeWeek = (dir) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeekStart(d);
  };

  const daySchedules = schedules.filter(s => s.startTime && s.startTime.split('T')[0] === selectedDate);
  const today = new Date().toISOString().split('T')[0];

  const statusConfig = {
    pending: { color: colors.warning, bg: colors.warningBg, label: 'PENDING' },
    approved: { color: colors.primary, bg: colors.primaryBg, label: 'APPROVED' },
    denied: { color: colors.danger, bg: colors.dangerBg, label: 'DENIED' },
  };

  const weekDays = getWeekDays();
  const monthYear = `${MONTHS[currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Week Strip */}
      <View style={styles.weekHeader}>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekNavBtn}>
            <Text style={styles.weekNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthYear}</Text>
          <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekNavBtn}>
            <Text style={styles.weekNavText}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekDays}>
          {weekDays.map((day, i) => {
            const dateStr = formatLocalDate(day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const hasS = hasShift(day);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, isSelected && styles.dayBtnSelected, isToday && !isSelected && styles.dayBtnToday]}
                onPress={() => setSelectedDate(dateStr)}>
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{DAYS[day.getDay()]}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isToday && !isSelected && styles.dayNumToday]}>
                  {day.getDate()}
                </Text>
                {hasS && <View style={[styles.shiftDot, { backgroundColor: isSelected ? '#fff' : colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={() => { setSelectedDate(today); setCurrentWeekStart(getWeekStart(new Date())); }} style={styles.todayPill}>
          <Text style={styles.todayPillText}>Today</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Day Schedules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
          ) : daySchedules.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayText}>No shifts scheduled</Text>
            </View>
          ) : (
            daySchedules.map(s => (
              <TouchableOpacity key={s.id} style={styles.shiftCard} onPress={() => setSelectedShift(s)} activeOpacity={0.7}>
                <View style={styles.shiftCardLeft} />
                <View style={styles.shiftCardBody}>
                  <Text style={styles.shiftSite}>{s.site?.name || 'Unknown Site'}</Text>
                  <Text style={styles.shiftTime}>{formatTime(s.startTime)} — {formatTime(s.endTime)}</Text>
                  {s.notes && <Text style={styles.shiftNotes}>{s.notes}</Text>}
                </View>
                <Text style={styles.shiftArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Time Off Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Time Off Requests</Text>
            <TouchableOpacity style={styles.requestBtn} onPress={() => setTimeOffModal(true)}>
              <Text style={styles.requestBtnText}>+ Request</Text>
            </TouchableOpacity>
          </View>
          {timeOffRequests.length === 0 ? (
            <Text style={styles.noRequests}>No time off requests</Text>
          ) : (
            timeOffRequests.map(r => {
              const st = statusConfig[r.status] || statusConfig.pending;
              return (
                <View key={r.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestDates}>{r.startDate} — {r.endDate}</Text>
                    {r.reason ? <Text style={styles.requestReason}>{r.reason}</Text> : null}
                    {r.adminNote ? <Text style={styles.adminNote}>Note: {r.adminNote}</Text> : null}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: st.bg, borderColor: st.color }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Shift Detail Modal */}
      <Modal visible={!!selectedShift} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            {selectedShift && (
              <>
                <Text style={styles.modalTitle}>{selectedShift.site?.name || 'Unknown Site'}</Text>
                <Text style={styles.modalDate}>
                  {new Date(selectedShift.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Time</Text>
                  <Text style={styles.detailValue}>{formatTime(selectedShift.startTime)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End Time</Text>
                  <Text style={styles.detailValue}>{formatTime(selectedShift.endTime)}</Text>
                </View>
                {selectedShift.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{selectedShift.notes}</Text>
                  </View>
                )}
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedShift(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Off Modal */}
      <Modal visible={timeOffModal} transparent animationType="slide" onRequestClose={() => setTimeOffModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Request Time Off</Text>
              <ScrollView>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
                  <Text style={[styles.datePickerText, !timeOffForm.startDate && { color: colors.textMuted }]}>
                    {timeOffForm.startDate || 'Select start date'}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDateObj}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (date) { setStartDateObj(date); setTimeOffForm(f => ({ ...f, startDate: formatLocalDate(date) })); }
                    }}
                    minimumDate={new Date()}
                  />
                )}
                <Text style={styles.fieldLabel}>End Date</Text>
                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
                  <Text style={[styles.datePickerText, !timeOffForm.endDate && { color: colors.textMuted }]}>
                    {timeOffForm.endDate || 'Select end date'}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDateObj}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (date) { setEndDateObj(date); setTimeOffForm(f => ({ ...f, endDate: formatLocalDate(date) })); }
                    }}
                    minimumDate={startDateObj}
                  />
                )}
                <Text style={styles.fieldLabel}>Reason (optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={timeOffForm.reason}
                  onChangeText={v => setTimeOffForm(f => ({ ...f, reason: v }))}
                  placeholder="Reason for time off..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setTimeOffModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={submitTimeOff} disabled={submitting}>
                  <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  weekHeader: { backgroundColor: colors.bgHeader, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  weekNavBtn: { padding: 4 },
  weekNavText: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  monthLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  weekDays: { flexDirection: 'row', paddingHorizontal: 8 },
  dayBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, marginHorizontal: 2 },
  dayBtnSelected: { backgroundColor: colors.primary },
  dayBtnToday: { backgroundColor: colors.bgInput },
  dayName: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  dayNameSelected: { color: '#fff' },
  dayNum: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  dayNumSelected: { color: '#fff' },
  dayNumToday: { color: colors.primary },
  shiftDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  todayPill: { alignSelf: 'center', marginTop: 6, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  todayPillText: { color: colors.textSecondary, fontSize: 12 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyDay: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyDayText: { color: colors.textMuted, fontSize: 14 },
  shiftCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  shiftCardLeft: { width: 4, height: '100%', backgroundColor: colors.primary, borderRadius: 2, marginRight: 14 },
  shiftCardBody: { flex: 1 },
  shiftSite: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  shiftTime: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  shiftNotes: { color: colors.textMuted, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  shiftArrow: { color: colors.textMuted, fontSize: 22 },
  requestBtn: { backgroundColor: colors.blue, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  requestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  noRequests: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  requestCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  requestInfo: { flex: 1, marginRight: 10 },
  requestDates: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  requestReason: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  adminNote: { color: colors.warning, fontSize: 12, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalDate: { color: colors.textSecondary, fontSize: 13, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textSecondary, fontSize: 14 },
  detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  notesBox: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 14, marginTop: 14 },
  notesLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  notesText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  closeBtn: { backgroundColor: colors.bgInput, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  datePickerBtn: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  datePickerText: { color: colors.textPrimary, fontSize: 14 },
  fieldInput: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, color: colors.textPrimary, fontSize: 14 },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textPrimary, fontSize: 15 },
  submitBtn: { flex: 1, backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default CalendarSchedule;
