import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 TextInput,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 Alert,
 Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// List of work sites
const WORK_SITES = [
 'Select a site...',
 'Biewer Sawmill',
 'Choctaw County High School Event',
 'Hilton Garden & Hampton Inn',
 'Mdrs',
 'Meridian Crossroads Shopping Center',
 "Saint Paul's Episcopal Church",
 'Unassigned',
];

// List of employees
const EMPLOYEES = [
 'Select employee...',
 'Brandon Abercrombie',
 'Sharon Bell',
 'Preston Byrd',
 'Richard Embrey',
 'Thomas Hudnalll',
 'Tery Kennedy',
 'Michel Lovelace',
 'Phillip Mckee',
 'Ashley Ray',
 'Russell Trotter',
 'Jessie West',
 'Unassigned',
];

const CreateSchedule = ({ navigation, route }) => {
 // Check if we're editing an existing schedule
 const editingSchedule = route.params?.schedule || null;
 const isEditing = !!editingSchedule;

  const insets = useSafeAreaInsets();
 const [site, setSite] = useState(editingSchedule?.site || 'Select a site...');
 const [date, setDate] = useState(editingSchedule?.date ? new Date(editingSchedule.date) : new Date());
 const [startTime, setStartTime] = useState(
 editingSchedule?.startTime 
 ? new Date(`2000-01-01T${editingSchedule.startTime}`) 
 : new Date()
 );
 const [endTime, setEndTime] = useState(
 editingSchedule?.endTime 
 ? new Date(`2000-01-01T${editingSchedule.endTime}`) 
 : new Date()
 );
 const [assignedTo, setAssignedTo] = useState(editingSchedule?.assignedTo || 'Select employee...');
 const [notes, setNotes] = useState(editingSchedule?.notes || '');

 // Date/Time picker visibility states
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [showStartTimePicker, setShowStartTimePicker] = useState(false);
 const [showEndTimePicker, setShowEndTimePicker] = useState(false);

 const formatDate = (date) => {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
 };

 const formatTime = (date) => {
 const hours = String(date.getHours()).padStart(2, '0');
 const minutes = String(date.getMinutes()).padStart(2, '0');
 return `${hours}:${minutes}`;
 };

 const formatDisplayTime = (date) => {
 const hours = date.getHours();
 const minutes = String(date.getMinutes()).padStart(2, '0');
 const ampm = hours >= 12 ? 'PM' : 'AM';
 const displayHour = hours % 12 || 12;
 return `${displayHour}:${minutes} ${ampm}`;
 };

 const formatDisplayDate = (date) => {
 return date.toLocaleDateString('en-US', {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });
 };

 const onDateChange = (event, selectedDate) => {
 setShowDatePicker(Platform.OS === 'ios');
 if (selectedDate) {
 setDate(selectedDate);
 }
 };

 const onStartTimeChange = (event, selectedTime) => {
 setShowStartTimePicker(Platform.OS === 'ios');
 if (selectedTime) {
 setStartTime(selectedTime);
 }
 };

 const onEndTimeChange = (event, selectedTime) => {
 setShowEndTimePicker(Platform.OS === 'ios');
 if (selectedTime) {
 setEndTime(selectedTime);
 }
 };

 const validateForm = () => {
 if (site === 'Select a site...') {
 Alert.alert('Error', 'Please select a work site');
 return false;
 }
 if (assignedTo === 'Select employee...') {
 Alert.alert('Error', 'Please select an employee');
 return false;
 }

 // Check if end time is after start time
 if (startTime >= endTime) {
 Alert.alert('Error', 'End time must be after start time');
 return false;
 }

 return true;
 };

 const checkForConflicts = async (scheduleData, excludeId = null) => {
 try {
 const schedulesData = await AsyncStorage.getItem('schedules');
 const schedules = schedulesData ? JSON.parse(schedulesData) : [];

 // Check for conflicts with the same employee on the same date
 const conflicts = schedules.filter(s => {
 // Skip the schedule we're editing
 if (excludeId && s.id === excludeId) return false;

 // Only check schedules for the same employee on the same date
 if (s.assignedTo !== scheduleData.assignedTo || s.date !== scheduleData.date) {
 return false;
 }

 // Check for time overlap
 const existingStart = s.startTime;
 const existingEnd = s.endTime;
 const newStart = scheduleData.startTime;
 const newEnd = scheduleData.endTime;

 // Check if times overlap
 return (
 (newStart >= existingStart && newStart < existingEnd) ||
 (newEnd > existingStart && newEnd <= existingEnd) ||
 (newStart <= existingStart && newEnd >= existingEnd)
 );
 });

 return conflicts;
 } catch (error) {
 console.error('Error checking conflicts:', error);
 return [];
 }
 };

 const handleSubmit = async () => {
 if (!validateForm()) {
 return;
 }

 try {
 const scheduleData = {
 site,
 date: formatDate(date),
 startTime: formatTime(startTime),
 endTime: formatTime(endTime),
 assignedTo,
 notes,
 };

 // Check for conflicts
 const conflicts = await checkForConflicts(
 scheduleData, 
 isEditing ? editingSchedule.id : null
 );

 if (conflicts.length > 0) {
 const conflict = conflicts;
 Alert.alert(
 'Schedule Conflict',
 `${assignedTo} is already scheduled at ${conflict.site} from ${formatDisplayTime(new Date(`2000-01-01T${conflict.startTime}`))} to ${formatDisplayTime(new Date(`2000-01-01T${conflict.endTime}`))} on this date.\n\nDo you want to create this schedule anyway?`,
 [
 { text: 'Cancel', style: 'cancel' },
 { text: 'Create Anyway', onPress: () => saveSchedule(scheduleData) },
 ]
 );
 } else {
 await saveSchedule(scheduleData);
 }
 } catch (error) {
 console.error('Error submitting schedule:', error);
 Alert.alert('Error', 'Failed to save schedule');
 }
 };

 const saveSchedule = async (scheduleData) => {
 try {
 const schedulesData = await AsyncStorage.getItem('schedules');
 const schedules = schedulesData ? JSON.parse(schedulesData) : [];

 if (isEditing) {
 // Update existing schedule
 const updatedSchedules = schedules.map(s => 
 s.id === editingSchedule.id 
 ? { ...scheduleData, id: editingSchedule.id, createdAt: editingSchedule.createdAt, updatedAt: new Date().toISOString() }
 : s
 );
 await AsyncStorage.setItem('schedules', JSON.stringify(updatedSchedules));
 Alert.alert('Success', 'Schedule updated successfully', [
 { text: 'OK', onPress: () => navigation.goBack() },
 ]);
 } else {
 // Create new schedule
 const newSchedule = {
 ...scheduleData,
 id: Date.now(),
 createdAt: new Date().toISOString(),
 };
 schedules.push(newSchedule);
 await AsyncStorage.setItem('schedules', JSON.stringify(schedules));
 Alert.alert('Success', 'Schedule created successfully', [
 { text: 'OK', onPress: () => navigation.goBack() },
 ]);
 }
 } catch (error) {
 console.error('Error saving schedule:', error);
 Alert.alert('Error', 'Failed to save schedule');
 }
 };

 return (
 <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }} style={styles.container}>
 <View style={styles.form}>
 <Text style={styles.headerTitle}>
 {isEditing ? ' Edit Schedule' : ' Create New Schedule'}
 </Text>

 <Text style={styles.label}>Work Site *</Text>
 <View style={styles.pickerContainer}>
 <Picker
 selectedValue={site}
 onValueChange={(itemValue) => setSite(itemValue)}
 style={styles.picker}
 dropdownIconColor="#fff"
 mode="dropdown">
 {WORK_SITES.map((siteName, index) => (
 <Picker.Item 
 key={index} 
 label={siteName} 
 value={siteName}
 color={Platform.OS === 'android' ? '#000' : '#000'}
 />
 ))}
 </Picker>
 </View>

 <Text style={styles.label}>Date *</Text>
 <TouchableOpacity 
 style={styles.dateTimeButton}
 onPress={() => setShowDatePicker(true)}>
 <Text style={styles.dateTimeButtonText}>
 {formatDisplayDate(date)}
 </Text>
 </TouchableOpacity>
 {showDatePicker && (
 <DateTimePicker
 value={date}
 mode="date"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={onDateChange}
 minimumDate={new Date()}
 />
 )}

 <Text style={styles.label}>Start Time *</Text>
 <TouchableOpacity 
 style={styles.dateTimeButton}
 onPress={() => setShowStartTimePicker(true)}>
 <Text style={styles.dateTimeButtonText}>
 {formatDisplayTime(startTime)}
 </Text>
 </TouchableOpacity>
 {showStartTimePicker && (
 <DateTimePicker
 value={startTime}
 mode="time"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={onStartTimeChange}
 />
 )}
 <Text style={styles.label}>End Time *</Text>
 <TouchableOpacity 
 style={styles.dateTimeButton}
 onPress={() => setShowEndTimePicker(true)}>
 <Text style={styles.dateTimeButtonText}>
 {formatDisplayTime(endTime)}
 </Text>
 </TouchableOpacity>
 {showEndTimePicker && (
 <DateTimePicker
 value={endTime}
 mode="time"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={onEndTimeChange}
 />
 )}

 <Text style={styles.label}>Assign To *</Text>
 <View style={styles.pickerContainer}>
 <Picker
 selectedValue={assignedTo}
 onValueChange={(itemValue) => setAssignedTo(itemValue)}
 style={styles.picker}
 dropdownIconColor="#fff"
 mode="dropdown">
 {EMPLOYEES.map((employee, index) => (
 <Picker.Item 
 key={index} 
 label={employee} 
 value={employee}
 color={Platform.OS === 'android' ? '#000' : '#000'}
 />
 ))}
 </Picker>
 </View>

 <Text style={styles.label}>Notes (Optional)</Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={notes}
 onChangeText={setNotes}
 placeholder="Add any additional notes..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={4}
 />

 <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
 <Text style={styles.submitButtonText}>
 {isEditing ? ' Update Schedule' : ' Create Schedule'}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={styles.cancelButton}
 onPress={() => navigation.goBack()}>
 <Text style={styles.cancelButtonText}>Cancel</Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: '#000000',
 },
 form: {
 padding: 20,
 },
 headerTitle: {
 fontSize: 24,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 20,
 textAlign: 'center',
 },
 label: {
 fontSize: 16,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 8,
 marginTop: 15,
 },
 input: {
 backgroundColor: '#1a1a1a',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 padding: 12,
 fontSize: 16,
 color: '#fff',
 },
 textArea: {
 height: 100,
 textAlignVertical: 'top',
 },
 pickerContainer: {
 backgroundColor: '#fff',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 overflow: 'hidden',
 },
 picker: {
 color: '#000',
 backgroundColor: '#fff',
 height: 50,
 },
 dateTimeButton: {
 backgroundColor: '#1a1a1a',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 padding: 15,
 alignItems: 'center',
 },
 dateTimeButtonText: {
 color: '#fff',
 fontSize: 16,
 fontWeight: '500',
 },
 submitButton: {
 backgroundColor: '#4CAF50',
 padding: 15,
 borderRadius: 8,
 alignItems: 'center',
 marginTop: 30,
 },
 submitButtonText: {
 color: '#fff',
 fontSize: 18,
 fontWeight: 'bold',
 },
 cancelButton: {
 backgroundColor: '#666',
 padding: 15,
 borderRadius: 8,
 alignItems: 'center',
 marginTop: 10,
 marginBottom: 30,
 },
 cancelButtonText: {
 color: '#fff',
 fontSize: 16,
 },
});

export default CreateSchedule;
 