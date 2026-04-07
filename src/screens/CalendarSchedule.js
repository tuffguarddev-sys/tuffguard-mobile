import React, { useState, useEffect } from 'react';
import {
 View, Text, StyleSheet, TouchableOpacity,
 ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSchedules } from '../services/api';

const CalendarSchedule = ({ navigation }) => {
 const [user, setUser] = useState(null);
 const [schedules, setSchedules] = useState([]);
 const [loading, setLoading] = useState(true);
 const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

 useEffect(() => {
 loadUser();
 loadSchedules();
 }, []);

 const loadUser = async () => {
 try {
 const userData = await AsyncStorage.getItem('user');
 if (userData) setUser(JSON.parse(userData));
 } catch (error) {
 console.error('Error loading user:', error);
 }
 };

 const loadSchedules = async () => {
 try {
 setLoading(true);
 const response = await getSchedules();
 if (response && Array.isArray(response)) {
 setSchedules(response);
 } else if (response && response.data) {
 setSchedules(response.data);
 }
 } catch (error) {
 console.error('Error loading schedules:', error);
 Alert.alert('Error', 'Failed to load schedules');
 } finally {
 setLoading(false);
 }
 };

 const getSchedulesForDate = (date) => {
 return schedules.filter(s => s.startTime && s.startTime.split('T')[0] === date);
 };

 const formatTime = (isoString) => {
 if (!isoString) return '';
 try {
 return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 } catch { return ''; }
 };

 const getColorForGuard = (userId) => {
 if (!userId) return '#4CAF50';
 const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
 const hue = hash % 360;
 return `hsl(${hue}, 70%, 45%)`;
 };

 const changeDate = (days) => {
 const current = new Date(selectedDate);
 current.setDate(current.getDate() + days);
 setSelectedDate(current.toISOString().split('T')[0]);
 };

 const formatDateDisplay = (dateStr) => {
 const date = new Date(dateStr + 'T00:00:00');
 return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
 };

 const daySchedules = getSchedulesForDate(selectedDate);

 if (loading) {
 return (
 <View style={styles.loadingContainer}>
 <ActivityIndicator size="large" color="#4CAF50" />
 <Text style={styles.loadingText}>Loading schedules...</Text>
 </View>
 );
 }

 return (
 <View style={styles.container}>
 {/* Date Navigator */}
 <View style={styles.dateNav}>
 <TouchableOpacity style={styles.navBtn} onPress={() => changeDate(-1)}>
 <Text style={styles.navBtnText}>‹</Text>
 </TouchableOpacity>
 <View style={styles.dateLabelContainer}>
 <Text style={styles.dateLabel}>{formatDateDisplay(selectedDate)}</Text>
 <TouchableOpacity onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
 <Text style={styles.todayBtn}>Today</Text>
 </TouchableOpacity>
 </View>
 <TouchableOpacity style={styles.navBtn} onPress={() => changeDate(1)}>
 <Text style={styles.navBtnText}>›</Text>
 </TouchableOpacity>
 </View>

 {/* Schedule Count */}
 <View style={styles.countBar}>
 <Text style={styles.countText}>{daySchedules.length} shift{daySchedules.length !== 1 ? 's' : ''} scheduled</Text>
 <TouchableOpacity onPress={loadSchedules}>
 <Text style={styles.refreshText}>↻ Refresh</Text>
 </TouchableOpacity>
 </View>

 {/* Schedule List */}
 <ScrollView style={styles.list}>
 {daySchedules.length === 0 ? (
 <View style={styles.empty}>
 <Text style={styles.emptyIcon}></Text>
 <Text style={styles.emptyText}>No shifts scheduled for this day</Text>
 </View>
 ) : (
 daySchedules.map(schedule => (
 <TouchableOpacity
 key={schedule.id}
 style={[styles.card, { borderLeftColor: getColorForGuard(schedule.userId) }]}
 onPress={() => Alert.alert(
 'Shift Details',
 `Guard: ${schedule.guard ? schedule.guard.firstName + ' ' + schedule.guard.lastName : 'Unknown'}\nSite: ${schedule.site?.name || 'Unknown'}\nStart: ${formatTime(schedule.startTime)}\nEnd: ${formatTime(schedule.endTime)}${schedule.notes ? '\nNotes: ' + schedule.notes : ''}`
 )}
 >
 <View style={styles.cardHeader}>
 <Text style={styles.guardName}>
 {schedule.guard ? `${schedule.guard.firstName} ${schedule.guard.lastName}` : 'Unknown Guard'}
 </Text>
 <View style={[styles.dot, { backgroundColor: getColorForGuard(schedule.userId) }]} />
 </View>
 <Text style={styles.siteName}> {schedule.site?.name || 'Unknown Site'}</Text>
 <Text style={styles.time}>
 {formatTime(schedule.startTime)} — {formatTime(schedule.endTime)}
 </Text>
 {schedule.notes && <Text style={styles.notes}> {schedule.notes}</Text>}
 </TouchableOpacity>
 ))
 )}
 </ScrollView>
 </View>
 );
};

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000' },
 loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
 loadingText: { color: '#fff', marginTop: 12 },
 dateNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
 navBtn: { padding: 8 },
 navBtnText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
 dateLabelContainer: { flex: 1, alignItems: 'center' },
 dateLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
 todayBtn: { color: '#4CAF50', fontSize: 12, marginTop: 2 },
 countBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#111' },
 countText: { color: '#999', fontSize: 13 },
 refreshText: { color: '#4CAF50', fontSize: 13 },
 list: { flex: 1, padding: 16 },
 empty: { alignItems: 'center', paddingTop: 60 },
 emptyIcon: { fontSize: 48, marginBottom: 12 },
 emptyText: { color: '#666', fontSize: 16 },
 card: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 12, borderLeftWidth: 4 },
 cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
 guardName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
 dot: { width: 10, height: 10, borderRadius: 5 },
 siteName: { color: '#aaa', fontSize: 14, marginBottom: 4 },
 time: { color: '#4CAF50', fontSize: 14, marginBottom: 4 },
 notes: { color: '#888', fontSize: 13, fontStyle: 'italic', marginTop: 4 },
});

export default CalendarSchedule;
