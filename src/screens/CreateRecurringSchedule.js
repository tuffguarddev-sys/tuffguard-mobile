import React, { useState } from 'react';
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

const RECURRENCE_TYPES = [
 { label: 'Daily', value: 'daily' },
 { label: 'Weekly', value: 'weekly' },
 { label: 'Bi-Weekly', value: 'biweekly' },
 { label: 'Monthly', value: 'monthly' },
];

const DAYS_OF_WEEK = [
 { label: 'Sunday', value: 0, short: 'Sun' },
 { label: 'Monday', value: 1, short: 'Mon' },
 { label: 'Tuesday', value: 2, short: 'Tue' },
 { label: 'Wednesday', value: 3, short: 'Wed' },
 { label: 'Thursday', value: 4, short: 'Thu' },
 { label: 'Friday', value: 5, short: 'Fri' },
 { label: 'Saturday', value: 6, short: 'Sat' },
];

const CreateRecurringSchedule = ({ navigation }) => {
  const insets = useSafeAreaInsets();
 const [site, setSite] = useState('Select a site...');
 const [startDate, setStartDate] = useState(new Date());
 const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
 const [startTime, setStartTime] = useState(new Date());
 const [endTime, setEndTime] = useState(new Date());
 const [assignedTo, setAssignedTo] = useState('Select employee...');
 const [notes, setNotes] = useState('');
 const [recurrenceType, setRecurrenceType] = useState('weekly');
 const [selectedDays, setSelectedDays] = useState();

 const [showStartDatePicker, setShowStartDatePicker] = useState(false);
 const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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

 const onStartDateChange = (event, selectedDate) => {
 setShowStartDatePicker(Platform.OS === 'ios');
 if (selectedDate) {
 setStartDate(selectedDate);
 }
 };

 const onEndDateChange = (event, selectedDate) => {
 setShowEndDatePicker(Platform.OS === 'ios');
 if (selectedDate) {
 setEndDate(selectedDate);
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

 const toggleDaySelection = (dayValue) => {
 if (selectedDays.includes(dayValue)) {
 setSelectedDays(selectedDays.filter(d => d !== dayValue));
 } else {
 setSelectedDays([...selectedDays, dayValue].sort());
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
 if (startTime >= endTime) {
 Alert.alert('Error', 'End time must be after start time');
 return false;
 }
 if (startDate >= endDate) {
 Alert.alert('Error', 'End date must be after start date');
 return false;
 }
 if ((recurrenceType === 'weekly' || recurrenceType === 'biweekly') && selectedDays.length === 0) {
 Alert.alert('Error', 'Please select at least one day of the week');
 return false;
 }
 return true;
 };

 const generateRecurringSchedules = () => {
 const schedules = [];
 const current = new Date(startDate);
 const end = new Date(endDate);
 
 while (current <= end) {
 let shouldCreate = false;

 switch (recurrenceType) {
 case 'daily':
 shouldCreate = true;
 break;
 
 case 'weekly':
 shouldCreate = selectedDays.includes(current.getDay());
 break;
 
 case 'biweekly':
 const weeksDiff = Math.floor((current - startDate) / (7 * 24 * 60 * 60 * 1000));
 shouldCreate = weeksDiff % 2 === 0 && selectedDays.includes(current.getDay());
 break;
 
 case 'monthly':
 shouldCreate = current.getDate() === startDate.getDate();
 break;
 }

 if (shouldCreate) {
 schedules.push({
 id: Date.now() + schedules.length,
 site,
 date: formatDate(current),
 startTime: formatTime(startTime),
 endTime: formatTime(endTime),
 assignedTo,
 notes: notes + (notes ? ' ' : '') + '(Recurring)',
 createdAt: new Date().toISOString(),
 recurring: true,
 });
 }

 current.setDate(current.getDate() + 1);
 }

 return schedules;
 };

 const handleSubmit = async () => {
 if (!validateForm()) {
 return;
 }

 try {
 const newSchedules = generateRecurringSchedules();
 
 if (newSchedules.length === 0) {
 Alert.alert('No Schedules', 'No schedules were generated with the selected criteria');
 return;
 }

 Alert.alert(
 'Confirm Creation',
 `This will create ${newSchedules.length} schedules. Continue?`,
 [
 { text: 'Cancel', style: 'cancel' },
 {
 text: 'Create',
 onPress: async () => {
 try {
 const schedulesData = await AsyncStorage.getItem('schedules');
 const existingSchedules = schedulesData ? JSON.parse(schedulesData) : [];
 const allSchedules = [...existingSchedules, ...newSchedules];
 await AsyncStorage.setItem('schedules', JSON.stringify(allSchedules));
 Alert.alert(
 'Success',
 `${newSchedules.length} recurring schedules created successfully`,
 [{ text: 'OK', onPress: () => navigation.goBack() }]
 );
 } catch (error) {
 console.error('Error saving recurring schedules:', error);
 Alert.alert('Error', 'Failed to create recurring schedules');
 }
 },
 },
 ]
 );
 } catch (error) {
 console.error('Error creating recurring schedules:', error);
 Alert.alert('Error', 'Failed to generate schedules');
 }
 };

 return (
 <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }} style={styles.container}>
 <View style={styles.form}>
 <Text style={styles.headerTitle}> Create Recurring Schedule</Text>
 <Text style={styles.subtitle}>
 Create multiple schedules at once with a repeating pattern
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

 <Text style={styles.label}>Recurrence Pattern *</Text>
 <View style={styles.pickerContainer}>
 <Picker
 selectedValue={recurrenceType}
 onValueChange={(itemValue) => setRecurrenceType(itemValue)}
 style={styles.picker}
 dropdownIconColor="#fff"
 mode="dropdown">
 {RECURRENCE_TYPES.map((type, index) => (
 <Picker.Item 
 key={index} 
 label={type.label} 
 value={type.value}
 color={Platform.OS === 'android' ? '#000' : '#000'}
 />
 ))}
 </Picker>
 </View>

 {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
 <>
 <Text style={styles.label}>Select Days *</Text>
 <View style={styles.daysContainer}>
 {DAYS_OF_WEEK.map((day) => (
 <TouchableOpacity
 key={day.value}
 style={[
 styles.dayButton,
 selectedDays.includes(day.value) && styles.dayButtonSelected,
 ]}
 onPress={() => toggleDaySelection(day.value)}>
 <Text
 style={[
 styles.dayButtonText,
 selectedDays.includes(day.value) && styles.dayButtonTextSelected,
 ]}>
 {day.short}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </>
 )}

 <Text style={styles.label}>Start Date *</Text>
 <TouchableOpacity 
 style={styles.dateTimeButton}
 onPress={() => setShowStartDatePicker(true)}>
 <Text style={styles.dateTimeButtonText}>
 {formatDisplayDate(startDate)}
 </Text>
 </TouchableOpacity>
 {showStartDatePicker && (
 <DateTimePicker
 value={startDate}
 mode="date"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={onStartDateChange}
 minimumDate={new Date()}
 />
 )}

 <Text style={styles.label}>End Date *</Text>
 <TouchableOpacity 
 style={styles.dateTimeButton}
 onPress={() => setShowEndDatePicker(true)}>
 <Text style={styles.dateTimeButtonText}>
 {formatDisplayDate(endDate)}
 </Text>
 </TouchableOpacity>
 {showEndDatePicker && (
 <DateTimePicker
 value={endDate}
 mode="date"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={onEndDateChange}
 minimumDate={startDate}
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
 <Text style={styles.submitButtonText}> Create Recurring Schedules</Text>
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
 marginBottom: 10,
 textAlign: 'center',
 },
 subtitle: {
 fontSize: 14,
 color: '#999',
 textAlign: 'center',
 marginBottom: 20,
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
 daysContainer: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: 10,
 marginTop: 5,
 },
 dayButton: {
 backgroundColor: '#1a1a1a',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 padding: 12,
 minWidth: 50,
 alignItems: 'center',
 },
 dayButtonSelected: {
 backgroundColor: '#2196F3',
 borderColor: '#2196F3',
 },
 dayButtonText: {
 color: '#999',
 fontSize: 14,
 fontWeight: '600',
 },
 dayButtonTextSelected: {
 color: '#fff',
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

export default CreateRecurringSchedule;

