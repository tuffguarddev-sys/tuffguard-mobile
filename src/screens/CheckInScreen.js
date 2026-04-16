import React, { useState, useEffect } from 'react';
import {
 View, Text, TextInput, TouchableOpacity, StyleSheet,
 FlatList, Alert, ActivityIndicator, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const CheckInScreen = ({ navigation }) => {
 const [checkIns, setCheckIns] = useState([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [showModal, setShowModal] = useState(false);
 const [notes, setNotes] = useState('');
 const [activeShift, setActiveShift] = useState(null);
 const [interval, setIntervalInfo] = useState(60);

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const shiftData = await AsyncStorage.getItem('activeShift');
 const token = await AsyncStorage.getItem('token');
 if (shiftData) {
 const shift = JSON.parse(shiftData);
 setActiveShift(shift);
 // Load check-ins for this shift
 const res = await fetch(`${API}/checkins/shift/${shift.id}`, {
 headers: { Authorization: 'Bearer ' + token }
 });
 const data = await res.json();
 setCheckIns(data.data || []);
 // Load site check-in interval
 if (shift.siteId) {
 const siteRes = await fetch(`${API}/sites/${shift.siteId}`, {
 headers: { Authorization: 'Bearer ' + token }
 });
 const siteData = await siteRes.json();
 if (siteData.site?.checkInInterval) setIntervalInfo(siteData.site.checkInInterval);
 }
 }
 } catch (err) {
 console.error('Load check-ins error:', err);
 } finally {
 setLoading(false);
 }
 };

 const handleCheckIn = async () => {
 if (!activeShift) {
 Alert.alert('No Active Shift', 'You must be clocked in to check in.');
 return;
 }
 setSubmitting(true);
 try {
 const token = await AsyncStorage.getItem('token');
 const res = await fetch(`${API}/checkins`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
 body: JSON.stringify({
 shiftId: activeShift.id,
 siteId: activeShift.siteId,
 notes: notes.trim() || null,
 })
 });
 if (!res.ok) throw new Error('Failed to check in');
 Alert.alert('Check-In Recorded', `Time: ${new Date().toLocaleTimeString()}${notes.trim() ? '\nNotes: ' + notes.trim() : ''}`);
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
 return new Date(last.getTime() + interval * 60 * 1000);
 };

 const nextCheckIn = getNextCheckIn();
 const isOverdue = nextCheckIn && new Date() > nextCheckIn;

 if (loading) return (
 <View style={styles.loadingContainer}>
 <ActivityIndicator size="large" color="#4CAF50" />
 <Text style={styles.loadingText}>Loading...</Text>
 </View>
 );

 return (
 <View style={styles.container}>
 {/* Status Card */}
 <View style={styles.statusCard}>
 {!activeShift ? (
 <Text style={styles.noShiftText}>Clock in to enable check-ins</Text>
 ) : (
 <>
 <Text style={styles.statusTitle}>Check-In Status</Text>
 <View style={styles.intervalBadge}>
 <Text style={styles.intervalText}>Required every {interval} minutes</Text>
 </View>
 {nextCheckIn && (
 <View style={[styles.nextBadge, isOverdue && styles.overdueBadge]}>
 <Text style={[styles.nextText, isOverdue && styles.overdueText]}>
 {isOverdue ? ' Check-in overdue!' : `Next check-in by: ${nextCheckIn.toLocaleTimeString()}`}
 </Text>
 </View>
 )}
 <Text style={styles.checkInCount}>{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''} this shift</Text>
 </>
 )}
 </View>

 {/* Check-In Button */}
 <TouchableOpacity
 style={[styles.checkInButton, !activeShift && styles.disabledButton]}
 onPress={() => setShowModal(true)}
 disabled={!activeShift}>
 <Text style={styles.checkInButtonText}>Check In Now</Text>
 <Text style={styles.checkInButtonSub}>{new Date().toLocaleTimeString()}</Text>
 </TouchableOpacity>

 {/* Check-In History */}
 <Text style={styles.historyTitle}>Check-In History</Text>
 {checkIns.length === 0 ? (
 <View style={styles.emptyContainer}>
 <Text style={styles.emptyText}>No check-ins yet</Text>
 <Text style={styles.emptySubtext}>Tap "Check In Now" to record your first check-in</Text>
 </View>
 ) : (
 <FlatList
 data={[...checkIns].reverse()}
 keyExtractor={item => item.id}
 renderItem={({ item, index }) => (
 <View style={styles.checkInItem}>
 <View style={styles.checkInDot} />
 <View style={styles.checkInContent}>
 <Text style={styles.checkInTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
 <Text style={styles.checkInDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
 {item.notes && <Text style={styles.checkInNotes}>{item.notes}</Text>}
 </View>
 </View>
 )}
 />
 )}

 {/* Check-In Modal */}
 <Modal visible={showModal} transparent animationType="slide">
 <View style={styles.modalOverlay}>
 <View style={styles.modalContainer}>
 <Text style={styles.modalTitle}>Record Check-In</Text>
 <Text style={styles.modalTime}>{new Date().toLocaleString()}</Text>
 <Text style={styles.modalLabel}>Notes (Optional)</Text>
 <TextInput
 style={styles.modalInput}
 value={notes}
 onChangeText={setNotes}
 placeholder="E.g., All clear, perimeter checked..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={3}
 autoFocus
 />
 <TouchableOpacity style={styles.submitButton} onPress={handleCheckIn} disabled={submitting}>
 {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Record Check-In</Text>}
 </TouchableOpacity>
 <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowModal(false); setNotes(''); }}>
 <Text style={styles.cancelButtonText}>Cancel</Text>
 </TouchableOpacity>
 </View>
 </View>
 </Modal>
 </View>
 );
};

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000', padding: 20 },
 loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
 loadingText: { color: '#fff', marginTop: 10 },
 statusCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
 statusTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
 noShiftText: { color: '#999', fontSize: 14, textAlign: 'center', padding: 10 },
 intervalBadge: { backgroundColor: '#1a2a1a', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 8, marginBottom: 8 },
 intervalText: { color: '#4CAF50', fontSize: 13, textAlign: 'center' },
 nextBadge: { backgroundColor: '#1a2a2a', borderWidth: 1, borderColor: '#2196F3', borderRadius: 8, padding: 8, marginBottom: 8 },
 overdueBadge: { backgroundColor: '#2a1a1a', borderColor: '#f44336' },
 nextText: { color: '#2196F3', fontSize: 13, textAlign: 'center' },
 overdueText: { color: '#f44336' },
 checkInCount: { color: '#999', fontSize: 12, textAlign: 'center' },
 checkInButton: { backgroundColor: '#4CAF50', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 24 },
 disabledButton: { backgroundColor: '#333' },
 checkInButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
 checkInButtonSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
 historyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
 emptyContainer: { alignItems: 'center', paddingTop: 30 },
 emptyText: { color: '#999', fontSize: 16, marginBottom: 8 },
 emptySubtext: { color: '#666', fontSize: 13, textAlign: 'center' },
 checkInItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
 checkInDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginTop: 5, marginRight: 12 },
 checkInContent: { flex: 1 },
 checkInTime: { color: '#fff', fontSize: 15, fontWeight: '600' },
 checkInDate: { color: '#666', fontSize: 12, marginTop: 2 },
 checkInNotes: { color: '#aaa', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
 modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
 modalContainer: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderWidth: 1, borderColor: '#333' },
 modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
 modalTime: { color: '#4CAF50', fontSize: 14, marginBottom: 16 },
 modalLabel: { color: '#999', fontSize: 14, marginBottom: 8 },
 modalInput: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
 submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
 submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
 cancelButton: { backgroundColor: '#333', padding: 14, borderRadius: 10, alignItems: 'center' },
 cancelButtonText: { color: '#fff', fontSize: 15 },
});

export default CheckInScreen;
