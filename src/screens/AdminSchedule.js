import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getWeekDates = (date) => {
  const d = new Date(date);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AdminSchedule = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [guards, setGuards] = useState([]);
  const [sites, setSites] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGuardPicker, setShowGuardPicker] = useState(false);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: '', siteId: '', startDate: '', startTime: '', endTime: '', notes: '', shiftSlot: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const h = { Authorization: 'Bearer ' + token };
      const [s1, s2, s3, s4, s5] = await Promise.all([
        fetch(`${API}/schedules`, { headers: h }),
        fetch(`${API}/shifts`, { headers: h }),
        fetch(`${API}/auth/users`, { headers: h }),
        fetch(`${API}/sites`, { headers: h }),
        fetch(`${API}/time-off`, { headers: h }),
      ]);
      const [d1, d2, d3, d4, d5] = await Promise.all([s1.json(), s2.json(), s3.json(), s4.json(), s5.json()]);
      setSchedules(Array.isArray(d1) ? d1 : d1.data || []);
      setShifts(Array.isArray(d2) ? d2 : d2.data || []);
      const allUsers = Array.isArray(d3) ? d3 : d3.users || d3.data || [];
      setGuards(allUsers.filter(u => !['CLIENT', 'ACCOUNTANT'].includes(u.role)).sort((a, b) => a.lastName.localeCompare(b.lastName)));
      setSites((d4.sites || d4.data || []).filter(s => s.isActive));
      setTimeOffRequests(d5.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const deleteSchedule = async (id) => {
    Alert.alert('Delete Schedule', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const token = await AsyncStorage.getItem('token');
        await fetch(`${API}/schedules/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        loadAll();
      }},
    ]);
  };

  const handleApproveTimeOff = async (id, status) => {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API}/time-off/${id}`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadAll();
  };

  const handleCreate = async () => {
    if (!form.userId || !form.siteId || !form.startDate || !form.shiftSlot) {
      return Alert.alert('Error', 'Please fill in all required fields');
    }
    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      let startTime = new Date(`${form.startDate}T${form.startTime}`).toISOString();
      let endTime = new Date(`${form.startDate}T${form.endTime}`).toISOString();
      // Handle overnight - if end is before start, add 1 day
      if (new Date(endTime) <= new Date(startTime)) {
        const d = new Date(endTime);
        d.setDate(d.getDate() + 1);
        endTime = d.toISOString();
      }
      const res = await fetch(`${API}/schedules`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, siteId: form.siteId, startTime, endTime, notes: form.notes })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({ userId: '', siteId: '', startDate: '', startTime: '', endTime: '', notes: '', shiftSlot: '' });
        loadAll();
        Alert.alert('Success', 'Schedule created!');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to create schedule');
      }
    } catch { Alert.alert('Error', 'Failed to create schedule'); }
    finally { setCreating(false); }
  };

  const selectedGuard = guards.find(g => g.id === form.userId);
  const selectedSite = sites.find(s => s.id === form.siteId);
  const weekDates = getWeekDates(calendarDate);
  const daySchedules = schedules.filter(s => s.startTime && isSameDay(new Date(s.startTime), selectedDate));
  const dayShifts = shifts.filter(s => s.clockInTime && isSameDay(new Date(s.clockInTime), selectedDate) && s.status === 'active');

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1DB954" /></View>;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} colors={['#1DB954']} />}>

        {/* Active Guards Banner */}
        {dayShifts.length > 0 && (
          <View style={styles.activeBanner}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBannerText}>{dayShifts.length} Guard{dayShifts.length > 1 ? 's' : ''} On Duty</Text>
          </View>
        )}

        {/* Weekly Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setDate(d.getDate()-7); setCalendarDate(d); }} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}</Text>
            <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setDate(d.getDate()+7); setCalendarDate(d); }} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {weekDates.map((date, i) => {
              const isToday = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedDate);
              const hasSchedule = schedules.some(s => s.startTime && isSameDay(new Date(s.startTime), date));
              return (
                <TouchableOpacity key={i} style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]} onPress={() => setSelectedDate(date)}>
                  <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>{DAYS[date.getDay()]}</Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayNumToday]}>{date.getDate()}</Text>
                  {hasSchedule && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Day Schedules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(f => ({ ...f, startDate: selectedDate.toISOString().split('T')[0] })); setShowCreateModal(true); }}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {daySchedules.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No shifts scheduled</Text></View>
          ) : daySchedules.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.guardName}>{item.guard ? `${item.guard.firstName} ${item.guard.lastName}` : 'Unknown'}</Text>
                <TouchableOpacity onPress={() => deleteSchedule(item.id)}><Text style={styles.deleteBtn}>Delete</Text></TouchableOpacity>
              </View>
              <Text style={styles.siteName}>{item.site?.name || 'Unknown Site'}</Text>
              <Text style={styles.time}>{formatTime(item.startTime)} — {formatTime(item.endTime)}</Text>
              {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            </View>
          ))}
        </View>

        {/* Time Off Requests */}
        {timeOffRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Off Requests</Text>
            {timeOffRequests.map(r => (
              <View key={r.id} style={styles.timeOffCard}>
                <View style={styles.timeOffTop}>
                  <Text style={styles.timeOffName}>{r.employee?.firstName} {r.employee?.lastName}</Text>
                  <View style={[styles.statusPill, { backgroundColor: r.status === 'approved' ? '#0D2B19' : r.status === 'denied' ? '#2A0D0D' : '#2A1F0D' }]}>
                    <Text style={[styles.statusText, { color: r.status === 'approved' ? '#1DB954' : r.status === 'denied' ? '#FF3B30' : '#FF9500' }]}>{r.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.timeOffDates}>{r.startDate} → {r.endDate}</Text>
                {r.reason && <Text style={styles.timeOffReason}>{r.reason}</Text>}
                {r.status === 'pending' && (
                  <View style={styles.timeOffActions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveTimeOff(r.id, 'approved')}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.denyBtn} onPress={() => handleApproveTimeOff(r.id, 'denied')}><Text style={styles.denyBtnText}>Deny</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        {/* Employee Time Summary */}
        {(() => {
          const weekStart = (() => {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
            return new Date(d.setDate(diff));
          })();
          weekStart.setHours(0,0,0,0);
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
            return d;
          });
          const dayNames = ['M','T','W','T','F','S','S'];
          const activeUserIds = new Set();
          shifts.forEach(s => {
            const cin = new Date(s.clockInTime);
            if (cin >= weekStart && cin < weekEnd && (s.userId || s.user?.id))
              activeUserIds.add(s.userId || s.user?.id);
          });
          schedules.forEach(s => {
            const st = s.startTime ? new Date(s.startTime) : null;
            if (st && st >= weekStart && st < weekEnd && (s.userId || s.guard?.id))
              activeUserIds.add(s.userId || s.guard?.id);
          });
          const activeGuardList = guards.filter(g => activeUserIds.has(g.id));
          if (activeGuardList.length === 0) return null;
          const getHours = (guardId, day) => {
            const ds = new Date(day); ds.setHours(0,0,0,0);
            const de = new Date(day); de.setHours(23,59,59,999);
            let mins = 0;
            shifts.filter(s => {
              const uid = s.userId || s.user?.id;
              const cin = new Date(s.clockInTime);
              const cout = s.clockOutTime ? new Date(s.clockOutTime) : null;
              return uid === guardId && cout && cin <= de && cout >= ds;
            }).forEach(s => {
              const cin = new Date(s.clockInTime);
              const cout = new Date(s.clockOutTime);
              const es = cin < ds ? ds : cin;
              const ee = cout > de ? de : cout;
              const m = Math.floor((ee - es) / 60000);
              if (m > 0) mins += m;
            });
            if (mins === 0) {
              schedules.filter(s => {
                const uid = s.userId || s.guard?.id;
                const st = s.startTime ? new Date(s.startTime) : null;
                const et = s.endTime ? new Date(s.endTime) : null;
                return uid === guardId && st && et && st <= de && et >= ds;
              }).forEach(s => {
                const st = new Date(s.startTime);
                const et = new Date(s.endTime);
                const es = st < ds ? ds : st;
                const ee = et > de ? de : et;
                const m = Math.floor((ee - es) / 60000);
                if (m > 0) mins += m;
              });
            }
            return mins;
          };
          const fmt = mins => mins === 0 ? '-' : (mins / 60).toFixed(2);
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employee Time Summary</Text>
              <View style={styles.summaryTable}>
                {/* Header */}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryCell, styles.summaryHeaderCell, { flex: 2 }]}>Employee</Text>
                  {dayNames.map((d, i) => (
                    <Text key={i} style={[styles.summaryCell, styles.summaryHeaderCell]}>{d}</Text>
                  ))}
                  <Text style={[styles.summaryCell, styles.summaryHeaderCell]}>Total</Text>
                </View>
                {activeGuardList.map((guard, idx) => {
                  let total = 0;
                  const cells = days.map((day, i) => {
                    const mins = getHours(guard.id, day);
                    total += mins;
                    return <Text key={i} style={styles.summaryCell}>{fmt(mins)}</Text>;
                  });
                  return (
                    <View key={guard.id} style={[styles.summaryRow, idx % 2 === 0 ? styles.summaryRowEven : {}]}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.summaryCellName}>{guard.lastName}, {guard.firstName}</Text>
                        <Text style={styles.summaryCellHours}>{fmt(total)} hrs</Text>
                      </View>
                      {cells}
                      <Text style={[styles.summaryCell, { fontWeight: '700', color: '#1DB954' }]}>{fmt(total)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}
      </ScrollView>

      {/* Guard Picker Modal */}
      <Modal visible={showGuardPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.fullPickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderTitle}>Select Guard</Text>
              <TouchableOpacity onPress={() => setShowGuardPicker(false)}><Text style={styles.pickerDone}>Done</Text></TouchableOpacity>
            </View>
            <FlatList
              data={guards}
              keyExtractor={g => g.id}
              renderItem={({ item: g }) => (
                <TouchableOpacity style={[styles.fullPickerItem, form.userId === g.id && styles.fullPickerItemSelected]}
                  onPress={() => { setForm(f => ({ ...f, userId: g.id })); setShowGuardPicker(false); }}>
                  <Text style={[styles.fullPickerText, form.userId === g.id && styles.fullPickerTextSelected]}>
                    {g.lastName}, {g.firstName}
                  </Text>
                  <Text style={styles.fullPickerRole}>{g.role}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: insets.bottom }}
            />
          </View>
        </View>
      </Modal>

      {/* Site Picker Modal */}
      <Modal visible={showSitePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.fullPickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderTitle}>Select Site</Text>
              <TouchableOpacity onPress={() => setShowSitePicker(false)}><Text style={styles.pickerDone}>Done</Text></TouchableOpacity>
            </View>
            <FlatList
              data={sites}
              keyExtractor={s => s.id}
              renderItem={({ item: s }) => (
                <TouchableOpacity style={[styles.fullPickerItem, form.siteId === s.id && styles.fullPickerItemSelected]}
                  onPress={() => { setForm(f => ({ ...f, siteId: s.id })); setShowSitePicker(false); }}>
                  <Text style={[styles.fullPickerText, form.siteId === s.id && styles.fullPickerTextSelected]}>{s.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: insets.bottom }}
            />
          </View>
        </View>
      </Modal>

      {/* Create Schedule Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>New Schedule</Text>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Guard *</Text>
                <TouchableOpacity style={styles.selectorBtn} onPress={() => setShowGuardPicker(true)}>
                  <Text style={selectedGuard ? styles.selectorBtnTextSelected : styles.selectorBtnPlaceholder}>
                    {selectedGuard ? `${selectedGuard.lastName}, ${selectedGuard.firstName} (${selectedGuard.role})` : 'Tap to select guard...'}
                  </Text>
                  <Text style={styles.selectorArrow}>›</Text>
                </TouchableOpacity>
                <Text style={styles.inputLabel}>Site *</Text>
                <TouchableOpacity style={styles.selectorBtn} onPress={() => setShowSitePicker(true)}>
                  <Text style={selectedSite ? styles.selectorBtnTextSelected : styles.selectorBtnPlaceholder}>
                    {selectedSite ? selectedSite.name : 'Tap to select site...'}
                  </Text>
                  <Text style={styles.selectorArrow}>›</Text>
                </TouchableOpacity>
                <Text style={styles.inputLabel}>Date * (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={form.startDate} onChangeText={v => setForm(f => ({ ...f, startDate: v }))} placeholder="2026-05-01" placeholderTextColor="#555" />
                {(() => {
                  const site = sites.find(s => s.id === form.siteId);
                  const availableShifts = [
                    site?.shift1Start ? { label: `1st Shift (${site.shift1Start} - ${site.shift1End})`, value: '1', start: site.shift1Start, end: site.shift1End, icon: '🟢' } : null,
                    site?.shift2Start ? { label: `2nd Shift (${site.shift2Start} - ${site.shift2End})`, value: '2', start: site.shift2Start, end: site.shift2End, icon: '🟡' } : null,
                    site?.shift3Start ? { label: `3rd Shift (${site.shift3Start} - ${site.shift3End})`, value: '3', start: site.shift3Start, end: site.shift3End, icon: '🟣' } : null,
                    site?.shift4Start ? { label: `Overnight (${site.shift4Start} - ${site.shift4End})`, value: '4', start: site.shift4Start, end: site.shift4End, icon: '🌙' } : null,
                  ].filter(Boolean);
                  if (!form.siteId) return null;
                  if (availableShifts.length === 0) return (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>⚠️ No shifts configured for this site. Set shift times on the Sites page first.</Text>
                    </View>
                  );
                  return (
                    <View>
                      <Text style={styles.inputLabel}>Shift *</Text>
                      {availableShifts.map(shift => (
                        <TouchableOpacity
                          key={shift.value}
                          style={[styles.shiftBtn, form.shiftSlot === shift.value && styles.shiftBtnActive]}
                          onPress={() => {
                            const dateStr = form.startDate || new Date().toISOString().split('T')[0];
                            let startTime = shift.start;
                            let endTime = shift.end;
                            setForm(f => ({ ...f, shiftSlot: shift.value, startTime, endTime }));
                          }}>
                          <Text style={[styles.shiftBtnText, form.shiftSlot === shift.value && styles.shiftBtnTextActive]}>
                            {shift.icon} {shift.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput style={[styles.input, { height: 60 }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional..." placeholderTextColor="#555" multiline />
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
                  {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create</Text>}
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
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  activeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D2B19', borderBottomWidth: 1, borderBottomColor: '#1DB954', padding: 12, gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1DB954' },
  activeBannerText: { color: '#1DB954', fontSize: 13, fontWeight: '600' },
  calendarCard: { backgroundColor: '#141414', margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  navText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  monthLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', padding: 6, borderRadius: 10, flex: 1 },
  dayCellSelected: { backgroundColor: '#1DB954' },
  dayCellToday: { backgroundColor: '#1C1C1E' },
  dayName: { color: '#8E8E93', fontSize: 10, fontWeight: '600' },
  dayNum: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 4 },
  dayNumToday: { color: '#1DB954' },
  dayTextSelected: { color: '#fff' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1DB954', marginTop: 3 },
  dotSelected: { backgroundColor: '#fff' },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addBtn: { backgroundColor: '#1DB954', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyBox: { backgroundColor: '#141414', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 12 },
  emptyText: { color: '#555', fontSize: 14 },
  card: { backgroundColor: '#141414', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A', borderLeftWidth: 4, borderLeftColor: '#1DB954' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  guardName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: { color: '#FF3B30', fontSize: 13 },
  siteName: { color: '#8E8E93', fontSize: 13, marginBottom: 4 },
  time: { color: '#1DB954', fontSize: 13 },
  notes: { color: '#555', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  timeOffCard: { backgroundColor: '#141414', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A' },
  timeOffTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  timeOffName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  timeOffDates: { color: '#8E8E93', fontSize: 13, marginBottom: 4 },
  timeOffReason: { color: '#555', fontSize: 12, marginBottom: 8 },
  timeOffActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: { flex: 1, backgroundColor: '#0D2B19', borderWidth: 1, borderColor: '#1DB954', padding: 8, borderRadius: 8, alignItems: 'center' },
  approveBtnText: { color: '#1DB954', fontSize: 13, fontWeight: '600' },
  denyBtn: { flex: 1, backgroundColor: '#2A0D0D', borderWidth: 1, borderColor: '#FF3B30', padding: 8, borderRadius: 8, alignItems: 'center' },
  denyBtnText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2A2A2A' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#2A2A2A', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  inputLabel: { color: '#8E8E93', fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14 },
  selectorBtn: { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorBtnTextSelected: { color: '#fff', fontSize: 14, flex: 1 },
  selectorBtnPlaceholder: { color: '#555', fontSize: 14, flex: 1 },
  selectorArrow: { color: '#555', fontSize: 20 },
  timeRow: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: '#1C1C1E', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  cancelBtnText: { color: '#8E8E93', fontSize: 15, fontWeight: '600' },
  createBtn: { flex: 1, backgroundColor: '#1DB954', padding: 14, borderRadius: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  shiftBtn: { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, padding: 14, marginBottom: 8 },
  shiftBtnActive: { backgroundColor: '#0D2B19', borderColor: '#1DB954' },
  shiftBtnText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },
  shiftBtnTextActive: { color: '#1DB954' },
  warningBox: { backgroundColor: '#2A1F0D', borderWidth: 1, borderColor: '#FF9500', borderRadius: 10, padding: 12, marginBottom: 8 },
  warningText: { color: '#FF9500', fontSize: 13 },
  summaryTable: { backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2A2A2A', paddingVertical: 8, paddingHorizontal: 8 },
  summaryRowEven: { backgroundColor: '#1A1A1A' },
  summaryCell: { flex: 1, color: '#8E8E93', fontSize: 11, textAlign: 'center' },
  summaryHeaderCell: { color: '#fff', fontWeight: '700', fontSize: 11 },
  summaryCellName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  summaryCellHours: { color: '#1DB954', fontSize: 10 },
  fullPickerContainer: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, flex: 0.7, borderWidth: 1, borderColor: '#2A2A2A' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  pickerHeaderTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  pickerDone: { color: '#1DB954', fontSize: 16, fontWeight: '600' },
  fullPickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fullPickerItemSelected: { backgroundColor: '#0D2B19' },
  fullPickerText: { color: '#8E8E93', fontSize: 15 },
  fullPickerTextSelected: { color: '#1DB954', fontWeight: '600' },
  fullPickerRole: { color: '#555', fontSize: 12 },
});

export default AdminSchedule;
