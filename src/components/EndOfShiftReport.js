import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 TextInput,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 Modal,
 Alert,
 ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EndOfShiftReport = ({ visible, onClose, onSubmit, shiftData }) => {
 const [activities, setActivities] = useState('');
 const [incidents, setIncidents] = useState('');
 const [notes, setNotes] = useState('');
 const [equipmentStatus, setEquipmentStatus] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [checkIns, setCheckIns] = useState([]);

 useEffect(() => {
 if (visible && shiftData?.id) {
 AsyncStorage.getItem('token').then(token => {
 fetch('https://tuffguardsecurityms.com/api/checkins/shift/' + shiftData.id, {
 headers: { Authorization: 'Bearer ' + token }
 }).then(r => r.json()).then(d => setCheckIns(d.data || [])).catch(() => {});
 });
 }
 }, [visible, shiftData?.id]);

 const formatReportMessage = (report, user) => {
 const duration = calculateDuration(report.clockIn, report.clockOut);
 
 let message = ` END OF SHIFT REPORT\n\n`;
 message += ` Officer: ${user}\n`;
 message += ` Shift Duration: ${duration}\n`;
 message += ` Date: ${new Date(report.clockOut).toLocaleDateString()}\n\n`;
 
 message += ` ACTIVITIES:\n${report.activities}\n\n`;
 
 if (report.incidents) {
 message += ` INCIDENTS/ISSUES:\n${report.incidents}\n\n`;
 }
 
 if (report.equipmentStatus) {
 message += ` EQUIPMENT STATUS:\n${report.equipmentStatus}\n\n`;
 }
 
 if (report.notes) {
 message += ` ADDITIONAL NOTES:\n${report.notes}\n\n`;
 }
 
 message += `---\nSubmitted: ${new Date(report.submittedAt).toLocaleString()}`;
 
 return message;
 };

 const calculateDuration = (clockIn, clockOut) => {
 const start = new Date(clockIn);
 const end = new Date(clockOut);
 const diff = end - start;
 
 const hours = Math.floor(diff / (1000 * 60 * 60));
 const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
 
 return `${hours}h ${minutes}m`;
 };

 const handleSubmit = async () => {
 if (!activities.trim()) {
 Alert.alert('Required Field', 'Please describe your activities during the shift');
 return;
 }
 setSubmitting(true);
 try {
 const token = await AsyncStorage.getItem('token');
 const userData = await AsyncStorage.getItem('user');
 const user = userData ? JSON.parse(userData) : null;
 const report = {
 shiftId: shiftData?.id,
 siteId: shiftData?.siteId,
 siteName: shiftData?.siteName,
 activities: activities.trim(),
 incidents: incidents.trim(),
 notes: notes.trim(),
 equipmentStatus: equipmentStatus.trim(),
 clockIn: shiftData?.clockInTime || shiftData?.startTime,
 clockOut: new Date().toISOString(),
 };
 const response = await fetch('https://tuffguardsecurityms.com/api/shift-reports', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
 body: JSON.stringify(report),
 });
 if (!response.ok) {
 const err = await response.json();
 throw new Error(err.error || 'Failed to submit');
 }
 const reportsData = await AsyncStorage.getItem('shiftReports');
 const reports = reportsData ? JSON.parse(reportsData) : [];
 reports.push({ ...report, id: Date.now(), submittedAt: new Date().toISOString() });
 await AsyncStorage.setItem('shiftReports', JSON.stringify(reports));
 Alert.alert('Success', 'Shift report submitted successfully', [{ text: 'OK' }]);
 setActivities('');
 setIncidents('');
 setNotes('');
 setEquipmentStatus('');
 onSubmit(report);
 } catch (error) {
 console.error('Error submitting report:', error);
 Alert.alert('Error', 'Failed to submit: ' + error.message);
 } finally {
 setSubmitting(false);
 }
 };

 const handleSkip = () => {
 Alert.alert(
 'Skip Report',
 'Are you sure you want to skip the end-of-shift report? Management will not receive a summary of your shift.',
 [
 { text: 'Cancel', style: 'cancel' },
 {
 text: 'Skip',
 style: 'destructive',
 onPress: () => onSubmit(null),
 },
 ]
 );
 };

 return (
 <Modal
 visible={visible}
 animationType="slide"
 transparent={false}
 onRequestClose={onClose}>
 <View style={styles.container}>
 <View style={styles.header}>
 <Text style={styles.headerTitle}>End of Shift Report</Text>
 <Text style={styles.headerSubtitle}>
 This report will be submitted to the admin
 </Text>
 </View>

 <ScrollView style={styles.form}>
 <Text style={styles.label}>Activities Performed *</Text>
 <Text style={styles.helperText}>
 Describe what you did during your shift (patrols, checks, etc.)
 </Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={activities}
 onChangeText={setActivities}
 placeholder="E.g., Conducted 3 perimeter patrols, monitored security cameras, checked all entry points..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={6}
 />

 <Text style={styles.label}>Incidents or Issues (Optional)</Text>
 <Text style={styles.helperText}>
 Report any incidents, suspicious activity, or issues encountered
 </Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={incidents}
 onChangeText={setIncidents}
 placeholder="E.g., No incidents to report / Found unlocked door at 2:30 PM..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={4}
 />

 <Text style={styles.label}>Equipment Status (Optional)</Text>
 <Text style={styles.helperText}>
 Note any equipment issues or maintenance needs
 </Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={equipmentStatus}
 onChangeText={setEquipmentStatus}
 placeholder="E.g., All equipment functional / Camera 3 needs adjustment..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={3}
 />

 {checkIns.length > 0 && (
 <View style={styles.checkInsSection}>
 <Text style={styles.checkInsTitle}>Check-In Log ({checkIns.length})</Text>
 {checkIns.map((ci, i) => (
 <View key={ci.id} style={styles.checkInRow}>
 <Text style={styles.checkInTime}>{new Date(ci.timestamp).toLocaleTimeString()}</Text>
 {ci.notes ? <Text style={styles.checkInNote}> — {ci.notes}</Text> : null}
 </View>
 ))}
 </View>
 )}
 <Text style={styles.label}>Additional Notes (Optional)</Text>
 <Text style={styles.helperText}>
 Any other information for the next shift or management
 </Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={notes}
 onChangeText={setNotes}
 placeholder="E.g., Keys handed over to next shift, visitor log updated..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={3}
 />

 <TouchableOpacity
 style={styles.submitButton}
 onPress={handleSubmit}
 disabled={submitting}>
 {submitting ? (
 <ActivityIndicator color="#fff" />
 ) : (
 <Text style={styles.submitButtonText}>
 Submit Report & Clock Out
 </Text>
 )}
 </TouchableOpacity>
 <TouchableOpacity
 style={styles.skipButton}
 onPress={handleSkip}
 disabled={submitting}>
 <Text style={styles.skipButtonText}>Skip Report</Text>
 </TouchableOpacity>
 </ScrollView>
 </View>
 </Modal>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: '#000000',
 },
 header: {
 backgroundColor: '#1a1a1a',
 padding: 20,
 borderBottomWidth: 1,
 borderBottomColor: '#333',
 },
 headerTitle: {
 fontSize: 22,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 5,
 },
 headerSubtitle: {
 fontSize: 14,
 color: '#999',
 },
 managementInfo: {
 backgroundColor: '#1a2a3a',
 padding: 15,
 borderRadius: 8,
 marginBottom: 20,
 borderWidth: 1,
 borderColor: '#2196F3',
 },
 managementInfoTitle: {
 fontSize: 14,
 fontWeight: 'bold',
 color: '#2196F3',
 marginBottom: 8,
 },
 managementName: {
 fontSize: 13,
 color: '#fff',
 marginLeft: 10,
 marginTop: 3,
 },
 form: {
 flex: 1,
 padding: 20,
 },
 label: {
 fontSize: 16,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 5,
 marginTop: 15,
 },
 helperText: {
 fontSize: 12,
 color: '#999',
 marginBottom: 8,
 fontStyle: 'italic',
 },
 input: {
 backgroundColor: '#1a1a1a',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 padding: 12,
 fontSize: 15,
 color: '#fff',
 },
 textArea: {
 minHeight: 100,
 textAlignVertical: 'top',
 },
 submitButton: {
 backgroundColor: '#4CAF50',
 padding: 16,
 borderRadius: 8,
 alignItems: 'center',
 marginTop: 30,
 },
 submitButtonText: {
 color: '#fff',
 fontSize: 18,
 fontWeight: 'bold',
 },
 skipButton: {
 backgroundColor: '#666',
 padding: 16,
 borderRadius: 8,
 alignItems: 'center',
 marginTop: 10,
 marginBottom: 30,
 },
 checkInsSection: { backgroundColor: '#1a2a1a', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 12, marginTop: 15, marginBottom: 10 },
 checkInsTitle: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
 checkInRow: { flexDirection: 'row', paddingVertical: 3 },
 checkInTime: { color: '#fff', fontSize: 13, fontWeight: '600' },
 checkInNote: { color: '#aaa', fontSize: 13, flex: 1 },
 skipButtonText: {
 color: '#fff',
 fontSize: 16,
 },
});

export default EndOfShiftReport;
