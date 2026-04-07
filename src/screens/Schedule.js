import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 StyleSheet,
 TouchableOpacity,
 Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportScheduleReportCSV } from '../services/exportService';

const Schedule = ({ navigation }) => {
 const [user, setUser] = useState(null);
 const [exporting, setExporting] = useState(false);
 const [schedules, setSchedules] = useState([]);

 useEffect(() => {
 loadUser();
 loadSchedules();
 // Automatically navigate to CalendarSchedule
 navigation.replace('CalendarSchedule');
 }, []);

 const loadUser = async () => {
 try {
 const userData = await AsyncStorage.getItem('user');
 if (userData) {
 setUser(JSON.parse(userData));
 }
 } catch (error) {
 console.error('Error loading user:', error);
 }
 };

 const loadSchedules = async () => {
 try {
 const schedulesData = await AsyncStorage.getItem('schedules');
 const allSchedules = schedulesData ? JSON.parse(schedulesData) : [];
 setSchedules(allSchedules);
 } catch (error) {
 console.error('Error loading schedules:', error);
 }
 };

 const handleExport = async () => {
 if (schedules.length === 0) {
 Alert.alert('No Data', 'No schedules to export');
 return;
 }

 setExporting(true);
 try {
 await exportScheduleReportCSV(schedules);
 } catch (error) {
 console.error('Error exporting:', error);
 } finally {
 setExporting(false);
 }
 };

 const canEdit = () => {
 return user && ['DEV', 'BOSS', 'Management'].includes(user.category);
 };

 // This screen now just redirects to CalendarSchedule
 return (
 <View style={styles.container}>
 <Text style={styles.loadingText}>Loading schedule...</Text>
 </View>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 justifyContent: 'center',
 alignItems: 'center',
 backgroundColor: '#000000',
 },
 loadingText: {
 color: '#fff',
 fontSize: 16,
 },
});

export default Schedule;