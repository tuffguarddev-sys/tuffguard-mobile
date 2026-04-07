import React, { useState, useEffect } from 'react';
import {
 View, Text, TextInput, TouchableOpacity, StyleSheet,
 ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitIncident } from '../services/api';

const INCIDENT_TYPES = [
 'Theft', 'Trespassing', 'Vandalism', 'Medical Emergency', 'Fire',
 'Assault', 'Suspicious Activity', 'Property Damage', 'Disturbance',
 'Accident', 'Unauthorized Access', 'Other'
];

const SectionHeader = ({ title }) => (
 <View style={styles.sectionHeader}>
 <Text style={styles.sectionTitle}>{title}</Text>
 </View>
);

const Field = ({ label, required, children }) => (
 <View style={styles.field}>
 <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
 {children}
 </View>
);

const ReportIncident = ({ navigation }) => {
 const [loading, setLoading] = useState(false);
 const [images, setImages] = useState([]);
 const [videos, setVideos] = useState([]);

 // Pre-fill location from active shift site
 useEffect(() => {
 AsyncStorage.getItem('activeShift').then(data => {
 if (data) {
 const shift = JSON.parse(data);
 const site = shift.site;
 if (site) {
 const addr = [site.address, site.city, site.state, site.zipCode].filter(Boolean).join(', ');
 if (addr) setLocation(addr);
 if (site.name) setZone(site.name);
 }
 }
 }).catch(() => {});
 }, []);

 // Report Info
 const [policeEventCode, setPoliceEventCode] = useState('');
 const [reportingOfficer, setReportingOfficer] = useState('');
 const [badgeNumber, setBadgeNumber] = useState('');

 // Incident Details
 const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
 const [incidentTime, setIncidentTime] = useState(new Date().toTimeString().substring(0, 5));
 const [duration, setDuration] = useState('');
 const [location, setLocation] = useState('');
 const [zone, setZone] = useState('');
 const [incidentType, setIncidentType] = useState('');
 const [severity, setSeverity] = useState('medium');

 // People Involved
 const [suspects, setSuspects] = useState('');
 const [victims, setVictims] = useState('');
 const [witnesses, setWitnesses] = useState('');

 // Narrative
 const [narrative, setNarrative] = useState('');
 const [actionsTaken, setActionsTaken] = useState('');

 // Evidence
 const [evidenceDescription, setEvidenceDescription] = useState('');
 const [cctvTimestamps, setCctvTimestamps] = useState('');

 // Injuries & Damage
 const [injuries, setInjuries] = useState('');
 const [medicalAttention, setMedicalAttention] = useState(false);
 const [propertyDamage, setPropertyDamage] = useState('');

 // Response
 const [policeNotified, setPoliceNotified] = useState(false);
 const [policeReportNumber, setPoliceReportNumber] = useState('');
 const [emsNotified, setEmsNotified] = useState(false);
 const [managementNotified, setManagementNotified] = useState(false);
 const [externalAgencies, setExternalAgencies] = useState('');

 // Follow-Up
 const [recommendedActions, setRecommendedActions] = useState('');
 const [status, setStatus] = useState('open');

 const pickImage = async () => {
 const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
 if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera roll permission required.'); return; }
 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Images] : ImagePicker.MediaTypeOptions.Images,
 allowsMultipleSelection: false, quality: 0.8,
 });
 if (!result.canceled) setImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
 };

 const takePhoto = async () => {
 const { status } = await ImagePicker.requestCameraPermissionsAsync();
 if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera permission required.'); return; }
 const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
 if (!result.canceled) setImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
 };

 const pickVideo = async () => {
 const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
 if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera roll permission required.'); return; }
 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Videos] : ImagePicker.MediaTypeOptions.Videos,
 allowsMultipleSelection: false, quality: 0.8,
 });
 if (!result.canceled) setVideos(prev => [...prev, result.assets[0].uri].slice(0, 5));
 };

 const recordVideo = async () => {
 const { status } = await ImagePicker.requestCameraPermissionsAsync();
 if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera permission required.'); return; }
 const result = await ImagePicker.launchCameraAsync({
 mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Videos] : ImagePicker.MediaTypeOptions.Videos,
 // No video duration limit
 });
 if (!result.canceled) setVideos(prev => [...prev, result.assets[0].uri].slice(0, 5));
 };

 const handleSubmit = async () => {
 if (!narrative.trim()) { Alert.alert('Required', 'Please provide a narrative description.'); return; }
 if (!incidentType) { Alert.alert('Required', 'Please select an incident type.'); return; }
 setLoading(true);
 try {
 console.log('Videos to upload:', JSON.stringify(videos));
 console.log('Images to upload:', JSON.stringify(images));
 const userData = await AsyncStorage.getItem('user');
 const user = userData ? JSON.parse(userData) : null;
 const officerName = reportingOfficer.trim() || (user ? `${user.firstName} ${user.lastName}` : 'Unknown');

 const description = `
INCIDENT REPORT

${policeEventCode ? `POLICE EVENT CODE: ${policeEventCode}\n` : ''}REPORTING OFFICER: ${officerName}${badgeNumber ? ` | Badge: ${badgeNumber}` : ''}
INCIDENT DATE/TIME: ${incidentDate} ${incidentTime}${duration ? ` | Duration: ${duration}` : ''}
LOCATION: ${location}${zone ? ` | Zone/Post: ${zone}` : ''}
INCIDENT TYPE: ${incidentType}

--- PEOPLE INVOLVED ---
${suspects ? `SUSPECTS/SUBJECTS:\n${suspects}\n` : ''}${victims ? `VICTIMS:\n${victims}\n` : ''}${witnesses ? `WITNESSES:\n${witnesses}\n` : ''}
--- NARRATIVE ---
${narrative}

--- ACTIONS TAKEN ---
${actionsTaken || 'N/A'}

--- EVIDENCE ---
${evidenceDescription || 'N/A'}${cctvTimestamps ? `\nCCTV Timestamps: ${cctvTimestamps}` : ''}${videos.length > 0 ? `\nVideo Footage: ${videos.length} video(s) attached` : ''}

--- INJURIES & DAMAGE ---
${injuries || 'None reported'}
Medical Attention: ${medicalAttention ? 'Yes' : 'No'}
${propertyDamage ? `Property Damage: ${propertyDamage}` : ''}

--- RESPONSE ---
Police Notified: ${policeNotified ? `Yes${policeReportNumber ? ` (Report #${policeReportNumber})` : ''}` : 'No'}
EMS Notified: ${emsNotified ? 'Yes' : 'No'}
Management Notified: ${managementNotified ? 'Yes' : 'No'}
${externalAgencies ? `External Agencies: ${externalAgencies}` : ''}

--- FOLLOW-UP ---
Recommended Actions: ${recommendedActions || 'None'}
Status: ${status.toUpperCase()}
`.trim();

 await submitIncident({
 title: `${incidentType} - ${incidentDate}`,
 incidentType,
 description,
 location: location.trim() || null,
 severity,
 incidentTime: new Date(`${incidentDate}T${incidentTime}`).toISOString(),
 images,
 videos,
 });

 Alert.alert('Success', 'Incident report submitted successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
 } catch (error) {
 Alert.alert('Error', 'Failed to submit incident report. Please try again.');
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

 return (
 <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
 <View style={styles.header}>
 <Text style={styles.headerTitle}>Incident Report</Text>
 <Text style={styles.headerSub}>Complete all required fields marked with *</Text>
 </View>

 {/* Report Information */}
 <SectionHeader title=" Report Information" />
 <View style={styles.section}>
 <Field label="Police Event Code / CAD Number">
 <TextInput style={styles.input} value={policeEventCode} onChangeText={setPoliceEventCode}
 placeholder="Police event code or CAD number" placeholderTextColor="#666" />
 </Field>
 <Field label="Reporting Officer Name" required>
 <TextInput style={styles.input} value={reportingOfficer} onChangeText={setReportingOfficer}
 placeholder="Full name" placeholderTextColor="#666" />
 </Field>
 <Field label="Badge / Employee Number">
 <TextInput style={styles.input} value={badgeNumber} onChangeText={setBadgeNumber}
 placeholder="Badge or ID number" placeholderTextColor="#666" />
 </Field>
 </View>

 {/* Incident Details */}
 <SectionHeader title=" Incident Details" />
 <View style={styles.section}>
 <Field label="Incident Date" required>
 <TextInput style={styles.input} value={incidentDate} onChangeText={setIncidentDate}
 placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
 </Field>
 <Field label="Incident Time" required>
 <TextInput style={styles.input} value={incidentTime} onChangeText={setIncidentTime}
 placeholder="HH:MM" placeholderTextColor="#666" />
 </Field>
 <Field label="Duration">
 <TextInput style={styles.input} value={duration} onChangeText={setDuration}
 placeholder="e.g. 15 minutes, 1 hour" placeholderTextColor="#666" />
 </Field>
 <Field label="Location / Address" required>
 <TextInput style={styles.input} value={location} onChangeText={setLocation}
 placeholder="Address or description" placeholderTextColor="#666" />
 </Field>
 <Field label="Zone / Post">
 <TextInput style={styles.input} value={zone} onChangeText={setZone}
 placeholder="Zone, post, or area" placeholderTextColor="#666" />
 </Field>
 <Field label="Incident Type" required>
 <View style={styles.typeGrid}>
 {INCIDENT_TYPES.map(type => (
 <TouchableOpacity key={type} style={[styles.typeBtn, incidentType === type && styles.typeBtnActive]}
 onPress={() => setIncidentType(type)}>
 <Text style={[styles.typeBtnText, incidentType === type && styles.typeBtnTextActive]}>{type}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </Field>
 <Field label="Severity" required>
 <View style={styles.row}>
 {['low', 'medium', 'high', 'critical'].map(s => (
 <TouchableOpacity key={s} style={[styles.severityBtn, severity === s && styles[`severity_${s}`]]}
 onPress={() => setSeverity(s)}>
 <Text style={styles.severityText}>{s.toUpperCase()}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </Field>
 </View>

 {/* People Involved */}
 <SectionHeader title=" People Involved" />
 <View style={styles.section}>
 <Field label="Suspects / Subjects">
 <TextInput style={[styles.input, styles.textArea]} value={suspects} onChangeText={setSuspects}
 placeholder="Name, description, DOB if known..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 <Field label="Victims">
 <TextInput style={[styles.input, styles.textArea]} value={victims} onChangeText={setVictims}
 placeholder="Name, contact info..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 <Field label="Witnesses">
 <TextInput style={[styles.input, styles.textArea]} value={witnesses} onChangeText={setWitnesses}
 placeholder="Name, contact info..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 </View>

 {/* Narrative */}
 <SectionHeader title=" Narrative / Description" />
 <View style={styles.section}>
 <Field label="Detailed Account (chronological order)" required>
 <TextInput style={[styles.input, styles.textAreaLarge]} value={narrative} onChangeText={setNarrative}
 placeholder="Describe what happened in chronological order..." placeholderTextColor="#666"
 multiline numberOfLines={8} textAlignVertical="top" />
 </Field>
 <Field label="Actions Taken by Security Personnel">
 <TextInput style={[styles.input, styles.textArea]} value={actionsTaken} onChangeText={setActionsTaken}
 placeholder="What actions did you take?" placeholderTextColor="#666" multiline numberOfLines={4} />
 </Field>
 </View>

 {/* Evidence */}
 <SectionHeader title=" Evidence & Documentation" />
 <View style={styles.section}>
 <Field label="Evidence Description">
 <TextInput style={[styles.input, styles.textArea]} value={evidenceDescription} onChangeText={setEvidenceDescription}
 placeholder="Photos, physical evidence collected..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 <Field label="CCTV Timestamps">
 <TextInput style={styles.input} value={cctvTimestamps} onChangeText={setCctvTimestamps}
 placeholder="Camera IDs and time ranges" placeholderTextColor="#666" />
 </Field>
 <Field label={`Photos (${images.length}/10)`}>
 <View style={styles.row}>
 <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
 <Text style={styles.photoBtnText}> Camera</Text>
 </TouchableOpacity>
 <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
 <Text style={styles.photoBtnText}> Gallery</Text>
 </TouchableOpacity>
 </View>
 {images.length > 0 && (
 <Text style={styles.photoCount}>{images.length} photo{images.length !== 1 ? 's' : ''} attached</Text>
 )}
 <Field label={`Videos (${videos.length}/5)`}>
 <View style={styles.row}>
 <TouchableOpacity style={styles.photoBtn} onPress={recordVideo}>
 <Text style={styles.photoBtnText}> Record</Text>
 </TouchableOpacity>
 <TouchableOpacity style={styles.photoBtn} onPress={pickVideo}>
 <Text style={styles.photoBtnText}> Gallery</Text>
 </TouchableOpacity>
 </View>
 {videos.length > 0 && (
 <Text style={styles.photoCount}>{videos.length} video{videos.length !== 1 ? 's' : ''} attached</Text>
 )}
 </Field>
 </Field>
 </View>

 {/* Injuries & Damage */}
 <SectionHeader title=" Injuries & Property Damage" />
 <View style={styles.section}>
 <Field label="Nature of Injuries">
 <TextInput style={[styles.input, styles.textArea]} value={injuries} onChangeText={setInjuries}
 placeholder="Describe any injuries..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 <View style={styles.switchRow}>
 <Text style={styles.label}>Medical Attention Required</Text>
 <Switch value={medicalAttention} onValueChange={setMedicalAttention} trackColor={{ true: '#4CAF50' }} />
 </View>
 <Field label="Property Damaged or Stolen">
 <TextInput style={[styles.input, styles.textArea]} value={propertyDamage} onChangeText={setPropertyDamage}
 placeholder="Description and estimated value..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 </View>

 {/* Response */}
 <SectionHeader title=" Response & Notifications" />
 <View style={styles.section}>
 <View style={styles.switchRow}>
 <Text style={styles.label}>Police Notified</Text>
 <Switch value={policeNotified} onValueChange={setPoliceNotified} trackColor={{ true: '#2196F3' }} />
 </View>
 {policeNotified && (
 <Field label="Police Report Number">
 <TextInput style={styles.input} value={policeReportNumber} onChangeText={setPoliceReportNumber}
 placeholder="Report/case number" placeholderTextColor="#666" />
 </Field>
 )}
 <View style={styles.switchRow}>
 <Text style={styles.label}>EMS Notified</Text>
 <Switch value={emsNotified} onValueChange={setEmsNotified} trackColor={{ true: '#f44336' }} />
 </View>
 <View style={styles.switchRow}>
 <Text style={styles.label}>Management Notified</Text>
 <Switch value={managementNotified} onValueChange={setManagementNotified} trackColor={{ true: '#FF9800' }} />
 </View>
 <Field label="External Agency Details">
 <TextInput style={[styles.input, styles.textArea]} value={externalAgencies} onChangeText={setExternalAgencies}
 placeholder="Agency names, report numbers..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 </View>

 {/* Follow-Up */}
 <SectionHeader title=" Follow-Up" />
 <View style={styles.section}>
 <Field label="Recommended Actions">
 <TextInput style={[styles.input, styles.textArea]} value={recommendedActions} onChangeText={setRecommendedActions}
 placeholder="Recommended follow-up actions..." placeholderTextColor="#666" multiline numberOfLines={3} />
 </Field>
 <Field label="Status">
 <View style={styles.row}>
 {['open', 'pending', 'closed'].map(s => (
 <TouchableOpacity key={s} style={[styles.statusBtn, status === s && styles.statusBtnActive]}
 onPress={() => setStatus(s)}>
 <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>{s.toUpperCase()}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </Field>
 </View>

 {/* Submit */}
 <View style={styles.submitSection}>
 <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Incident Report</Text>}
 </TouchableOpacity>
 <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
 <Text style={styles.cancelBtnText}>Cancel</Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 );
};

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000' },
 header: { backgroundColor: '#1a1a1a', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
 headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
 headerSub: { color: '#666', fontSize: 13, marginTop: 4 },
 sectionHeader: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#333', marginTop: 8 },
 sectionTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
 section: { padding: 16, gap: 12 },
 field: { marginBottom: 4 },
 label: { color: '#aaa', fontSize: 13, marginBottom: 6 },
 required: { color: '#f44336' },
 input: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14 },
 textArea: { minHeight: 80, textAlignVertical: 'top' },
 textAreaLarge: { minHeight: 140, textAlignVertical: 'top' },
 row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
 typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
 typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#444', backgroundColor: '#1a1a1a' },
 typeBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
 typeBtnText: { color: '#aaa', fontSize: 13 },
 typeBtnTextActive: { color: '#000', fontWeight: 'bold' },
 severityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#444', alignItems: 'center' },
 severity_low: { backgroundColor: '#1a2a1a', borderColor: '#4CAF50' },
 severity_medium: { backgroundColor: '#2a2000', borderColor: '#FF9800' },
 severity_high: { backgroundColor: '#2a1a1a', borderColor: '#f44336' },
 severity_critical: { backgroundColor: '#2a0a2a', borderColor: '#9C27B0' },
 severityText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
 switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
 photoBtn: { flex: 1, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#444', borderRadius: 8, padding: 12, alignItems: 'center' },
 photoBtnText: { color: '#fff', fontSize: 14 },
 photoCount: { color: '#4CAF50', fontSize: 13, marginTop: 8, textAlign: 'center' },
 statusBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#444', alignItems: 'center' },
 statusBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
 statusBtnText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
 statusBtnTextActive: { color: '#000' },
 submitSection: { padding: 20, gap: 12 },
 submitBtn: { backgroundColor: '#f44336', borderRadius: 12, padding: 18, alignItems: 'center' },
 submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
 cancelBtn: { backgroundColor: '#333', borderRadius: 12, padding: 14, alignItems: 'center' },
 cancelBtnText: { color: '#fff', fontSize: 15 },
});

export default ReportIncident;
