import React, { useState, useEffect } from 'react';
import {
 View, Text, TouchableOpacity, StyleSheet, Alert,
 ActivityIndicator, Modal, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocation, getAddressFromCoordinates, startLocationTracking, stopLocationTracking } from '../services/locationService';
import { clockIn, clockOut, getSites } from '../services/api';
import EndOfShiftReport from './EndOfShiftReport';

const ClockInOut = ({ navigation }) => {
 const [isClockedIn, setIsClockedIn] = useState(false);
 const [currentShift, setCurrentShift] = useState(null);
 const [loading, setLoading] = useState(true);
 const [user, setUser] = useState(null);
 const [locationLoading, setLocationLoading] = useState(false);
 const [showReportModal, setShowReportModal] = useState(false);
 const [pendingClockOut, setPendingClockOut] = useState(null);
 const [showSitePicker, setShowSitePicker] = useState(false);
 const [sites, setSites] = useState([]);
 const [sitesLoading, setSitesLoading] = useState(false);
 const [pendingLocation, setPendingLocation] = useState(null);

 useEffect(() => {
 loadUser();
 checkClockStatus();
 }, []);

 const loadUser = async () => {
 try {
 const userData = await AsyncStorage.getItem('user');
 if (userData) setUser(JSON.parse(userData));
 } catch (error) {
 console.error('Error loading user:', error);
 }
 };

 const checkClockStatus = async () => {
 try {
 const shiftData = await AsyncStorage.getItem('activeShift');
 if (shiftData) {
 setIsClockedIn(true);
 setCurrentShift(JSON.parse(shiftData));
 }
 } catch (error) {
 console.error('Error checking clock status:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleClockIn = async () => {
 if (!user) {
 Alert.alert('Error', 'User not found');
 return;
 }
 setLocationLoading(true);
 try {
 const location = await getCurrentLocation();
 if (!location) {
 Alert.alert('Error', 'Unable to get location. Please enable location services.');
 setLocationLoading(false);
 return;
 }
 setPendingLocation(location);
 setLocationLoading(false);
 setSitesLoading(true);
 const fetchedSites = await getSites();
 setSites(fetchedSites.filter(s => s.isActive));
 setSitesLoading(false);
 setShowSitePicker(true);
 } catch (error) {
 console.error('Error preparing clock in:', error);
 Alert.alert('Error', `Failed to prepare clock in: ${error.message}`);
 setLocationLoading(false);
 setSitesLoading(false);
 }
 };

 const handleSiteSelect = async (site) => {
 setShowSitePicker(false);
 setLocationLoading(true);
 try {
 const address = await getAddressFromCoordinates(
 pendingLocation.latitude,
 pendingLocation.longitude
 );
 console.log(' Clocking in via API...');
 const response = await clockIn({
 siteId: site.id,
 latitude: pendingLocation.latitude,
 longitude: pendingLocation.longitude,
 });
 const shift = response.data || response.shift;
 if (!shift) throw new Error('No shift returned from API');
 const activeShift = {
 ...shift,
 siteName: site.name,
 location: address,
 coordinates: {
 latitude: pendingLocation.latitude,
 longitude: pendingLocation.longitude,
 },
 };
 await AsyncStorage.setItem('activeShift', JSON.stringify(activeShift));
 setIsClockedIn(true);
 setCurrentShift(activeShift);
 console.log(' Starting GPS tracking for shift:', shift.id);
 await startLocationTracking(shift.id);
 Alert.alert(
 ' Clocked In',
 `Site: ${site.name}\nTime: ${new Date().toLocaleTimeString()}\nLocation: ${address}`
 );
 } catch (error) {
 console.error('Error clocking in:', error);
 Alert.alert('Error', `Failed to clock in: ${error.message}`);
 } finally {
 setLocationLoading(false);
 setPendingLocation(null);
 }
 };

 const handleClockOut = async () => {
 if (!currentShift) {
 Alert.alert('Error', 'No active shift found');
 return;
 }
 setLocationLoading(true);
 try {
 const location = await getCurrentLocation();
 if (!location) {
 Alert.alert('Error', 'Unable to get location. Please enable location services.');
 setLocationLoading(false);
 return;
 }
 const address = await getAddressFromCoordinates(location.latitude, location.longitude);
 setPendingClockOut({
 location: address,
 coordinates: { latitude: location.latitude, longitude: location.longitude },
 });
 setShowReportModal(true);
 setLocationLoading(false);
 } catch (error) {
 console.error('Error preparing clock out:', error);
 Alert.alert('Error', 'Failed to prepare clock out');
 setLocationLoading(false);
 }
 };

 const completeClockOut = async (report) => {
 try {
 console.log(' Clocking out via API...');
 // Notify admin if report was skipped
 if (!report) {
 try {
 const token = await AsyncStorage.getItem('token');
 await fetch('http://192.168.0.172:3000/api/shift-reports/skipped', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
 body: JSON.stringify({ shiftId: currentShift?.id, siteId: currentShift?.siteId }),
 });
 } catch(e) { console.log('Skip notification error:', e.message); }
 }
 await clockOut(currentShift.id, {
 latitude: pendingClockOut.coordinates.latitude,
 longitude: pendingClockOut.coordinates.longitude,
 });
 console.log(' Stopping GPS tracking');
 await stopLocationTracking();
 await AsyncStorage.removeItem('activeShift');
 const clockInTime = new Date(currentShift.clockInTime || currentShift.startTime);
 const clockOutTime = new Date();
 const duration = Math.floor((clockOutTime - clockInTime) / (1000 * 60));
 setIsClockedIn(false);
 setCurrentShift(null);
 setShowReportModal(false);
 setPendingClockOut(null);
 Alert.alert(
 ' Clocked Out',
 `Time: ${clockOutTime.toLocaleTimeString()}\nDuration: ${Math.floor(duration / 60)}h ${duration % 60}m\nLocation: ${pendingClockOut.location}${report ? '\n\n Shift report submitted' : ''}`
 );
 } catch (error) {
 console.error('Error completing clock out:', error);
 Alert.alert('Error', 'Failed to complete clock out');
 }
 };

 const formatTime = (isoString) => {
 if (!isoString) return '--:--';
 return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
 };

 const calculateCurrentDuration = () => {
 if (!currentShift) return '0h 0m';
 const start = new Date(currentShift.clockInTime || currentShift.startTime);
 const diff = new Date() - start;
 const hours = Math.floor(diff / (1000 * 60 * 60));
 const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
 return `${hours}h ${minutes}m`;
 };

 if (loading) {
 return (
 <View style={styles.loadingContainer}>
 <ActivityIndicator size="large" color="#4CAF50" />
 <Text style={styles.loadingText}>Loading...</Text>
 </View>
 );
 }

 return (
 <View style={styles.container}>

 {/* Site Picker Modal */}
 <Modal visible={showSitePicker} transparent animationType="slide">
 <View style={styles.modalOverlay}>
 <View style={styles.modalContainer}>
 <Text style={styles.modalTitle}>Select Your Site</Text>
 <Text style={styles.modalSubtitle}>Choose the site you are working at today</Text>
 {sitesLoading ? (
 <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 30 }} />
 ) : (
 <FlatList
 data={sites}
 keyExtractor={(item) => item.id}
 renderItem={({ item }) => (
 <TouchableOpacity
 style={styles.siteItem}
 onPress={() => handleSiteSelect(item)}>
 <Text style={styles.siteName}>{item.name}</Text>
 {item.address && (
 <Text style={styles.siteAddress}>{item.address}, {item.city}</Text>
 )}
 </TouchableOpacity>
 )}
 ItemSeparatorComponent={() => <View style={styles.separator} />}
 />
 )}
 <TouchableOpacity
 style={styles.cancelButton}
 onPress={() => {
 setShowSitePicker(false);
 setPendingLocation(null);
 }}>
 <Text style={styles.cancelButtonText}>Cancel</Text>
 </TouchableOpacity>
 </View>
 </View>
 </Modal>

 {/* Status Card */}
 <View style={styles.statusCard}>
 <Text style={styles.statusLabel}>Current Status</Text>
 <View style={[styles.statusBadge, isClockedIn ? styles.clockedIn : styles.clockedOut]}>
 <Text style={styles.statusText}>
 {isClockedIn ? ' CLOCKED IN' : ' CLOCKED OUT'}
 </Text>
 </View>

 {isClockedIn && currentShift && (
 <View style={styles.shiftInfo}>
 {currentShift.siteName && (
 <>
 <Text style={styles.infoLabel}>Site:</Text>
 <Text style={styles.infoValue}>{currentShift.siteName}</Text>
 </>
 )}
 <Text style={styles.infoLabel}>Clock In Time:</Text>
 <Text style={styles.infoValue}>
 {formatTime(currentShift.clockInTime || currentShift.startTime)}
 </Text>
 <Text style={styles.infoLabel}>Duration:</Text>
 <Text style={styles.infoValue}>{calculateCurrentDuration()}</Text>
 {currentShift.location && (
 <>
 <Text style={styles.infoLabel}>Location:</Text>
 <Text style={styles.infoValue}>{currentShift.location}</Text>
 </>
 )}
 <View style={styles.trackingBadge}>
 <Text style={styles.trackingText}> GPS Tracking Active</Text>
 </View>
 </View>
 )}
 </View>

 {/* Buttons */}
 <View style={styles.buttonContainer}>
 {!isClockedIn ? (
 <TouchableOpacity
 style={[styles.button, styles.clockInButton]}
 onPress={handleClockIn}
 disabled={locationLoading || sitesLoading}>
 {locationLoading || sitesLoading ? (
 <ActivityIndicator color="#fff" />
 ) : (
 <>
 <Text style={styles.buttonIcon}></Text>
 <Text style={styles.buttonText}>Clock In</Text>
 </>
 )}
 </TouchableOpacity>
 ) : (
 <TouchableOpacity
 style={[styles.button, styles.clockOutButton]}
 onPress={handleClockOut}
 disabled={locationLoading}>
 {locationLoading ? (
 <ActivityIndicator color="#fff" />
 ) : (
 <>
 <Text style={styles.buttonIcon}></Text>
 <Text style={styles.buttonText}>Clock Out</Text>
 </>
 )}
 </TouchableOpacity>
 )}

 <TouchableOpacity
 style={[styles.button, styles.checkInButtonStyle]}
 onPress={() => navigation.navigate('CheckIn')}
 disabled={!isClockedIn}>
 <Text style={styles.buttonIcon}></Text>
 <Text style={styles.buttonText}>Check In</Text>
 </TouchableOpacity>
 </View>

 {locationLoading && (
 <View style={styles.locationInfo}>
 <ActivityIndicator size="small" color="#2196F3" />
 <Text style={styles.locationText}>Getting your location...</Text>
 </View>
 )}

 <EndOfShiftReport
 visible={showReportModal}
 onClose={() => setShowReportModal(false)}
 onSubmit={completeClockOut}
 shiftData={currentShift}
 />
 </View>
 );
};

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000000', padding: 20 },
 loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
 loadingText: { marginTop: 10, color: '#fff', fontSize: 16 },
 statusCard: { backgroundColor: '#1a1a1a', borderRadius: 15, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#333' },
 statusLabel: { fontSize: 16, color: '#999', marginBottom: 15, textAlign: 'center' },
 statusBadge: { padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
 clockedIn: { backgroundColor: '#4CAF50' },
 clockedOut: { backgroundColor: '#f44336' },
 statusText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
 shiftInfo: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 20 },
 infoLabel: { fontSize: 14, color: '#999', marginTop: 10 },
 infoValue: { fontSize: 16, color: '#fff', marginTop: 5, fontWeight: '500' },
 trackingBadge: { marginTop: 15, backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 10, alignItems: 'center' },
 trackingText: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' },
 buttonContainer: { gap: 15 },
 button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 10, gap: 10 },
 clockInButton: { backgroundColor: '#4CAF50' },
 clockOutButton: { backgroundColor: '#f44336' },
 checkInButtonStyle: { backgroundColor: '#FF9800' },
 disabledBtn: { backgroundColor: '#555' },
 buttonIcon: { fontSize: 24 },
 buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
 locationInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 15, backgroundColor: '#1a1a1a', borderRadius: 10, gap: 10 },
 locationText: { color: '#2196F3', fontSize: 14 },
 modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
 modalContainer: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%', borderWidth: 1, borderColor: '#333' },
 modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 5 },
 modalSubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 },
 siteItem: { paddingVertical: 15, paddingHorizontal: 10 },
 siteName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
 siteAddress: { fontSize: 13, color: '#999', marginTop: 3 },
 separator: { height: 1, backgroundColor: '#333' },
 cancelButton: { marginTop: 15, backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center' },
 cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ClockInOut;

