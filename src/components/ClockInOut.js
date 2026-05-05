import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, FlatList, ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocation, getAddressFromCoordinates, startLocationTracking, stopLocationTracking } from '../services/locationService';
import { clockIn, clockOut, getSites, getMySchedule } from '../services/api';
import EndOfShiftReport from './EndOfShiftReport';
import { colors } from '../theme/colors';

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const ClockInOut = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
  const [currentDuration, setCurrentDuration] = useState('0h 0m');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOvertime, setIsOvertime] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState([]);

  useEffect(() => {
    loadUser();
    checkClockStatus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isClockedIn || !currentShift) return;
    const update = () => {
      const start = new Date(currentShift.clockInTime || currentShift.startTime);
      const diff = new Date() - start;
      const totalMins = Math.floor(diff / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setCurrentDuration(hours + 'h ' + mins + 'm');
      if (hours >= 8 && !isOvertime) {
        setIsOvertime(true);
        Alert.alert('Overtime', 'You have been on shift for 8 hours.');
      }
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [isClockedIn, currentShift]);

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
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://tuffguardsecurityms.com/api/shifts/active', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await response.json();
      if (data.success && data.data) {
        const serverShift = data.data;
        const localShiftData = await AsyncStorage.getItem('activeShift');
        const localShift = localShiftData ? JSON.parse(localShiftData) : {};
        const activeShift = {
          ...serverShift,
          siteName: serverShift.site?.name || localShift.siteName || 'Unknown Site',
          siteAddress: serverShift.site ? [serverShift.site.address, serverShift.site.city, serverShift.site.state].filter(Boolean).join(', ') : '',
          location: localShift.location || '',
          coordinates: localShift.coordinates || null,
        };
        await AsyncStorage.setItem('activeShift', JSON.stringify(activeShift));
        setIsClockedIn(true);
        setCurrentShift(activeShift);
      } else {
        await AsyncStorage.removeItem('activeShift');
        setIsClockedIn(false);
        setCurrentShift(null);
      }
    } catch (error) {
      try {
        const shiftData = await AsyncStorage.getItem('activeShift');
        if (shiftData) { setIsClockedIn(true); setCurrentShift(JSON.parse(shiftData)); }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    if (!user) return false;
    return ['DEV', 'BOSS', 'MANAGER', 'ACCOUNTANT'].includes(user.role);
  };

  const handleClockIn = async () => {
    if (!user) return Alert.alert('Error', 'User not found');
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

      if (isAdmin()) {
        // Admins see all active sites
        const fetchedSites = await getSites();
        setSites(fetchedSites.filter(s => s.isActive));
      } else {
        // Employees see only their scheduled sites for today
        const schedule = await getMySchedule();
        setTodaySchedule(schedule);
        if (schedule.length === 0) {
          setSitesLoading(false);
          Alert.alert(
            'No Schedule Found',
            'You do not have a scheduled shift today. Please contact your manager.',
            [{ text: 'OK' }]
          );
          setPendingLocation(null);
          return;
        }
        // Extract sites from schedule
        const scheduledSites = schedule
          .filter(s => s.site)
          .map(s => s.site);
        setSites(scheduledSites);
      }

      setSitesLoading(false);
      setShowSitePicker(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to prepare clock in: ' + error.message);
      setLocationLoading(false);
      setSitesLoading(false);
    }
  };

  const handleSiteSelect = async (site) => {
    setShowSitePicker(false);
    setLocationLoading(true);
    try {
      // Geofence check for employees
      if (!isAdmin() && site.lat && site.lng && pendingLocation) {
        const distance = getDistanceMeters(
          pendingLocation.latitude, pendingLocation.longitude,
          parseFloat(site.lat), parseFloat(site.lng)
        );
        const radius = site.radius || 200;
        if (distance > radius) {
          setLocationLoading(false);
          Alert.alert(
            'Too Far From Site',
            'You are ' + Math.round(distance) + 'm away from ' + site.name + '. You must be within ' + radius + 'm to clock in.',
            [
              { text: 'Get Directions', onPress: () => openDirections(site) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          setPendingLocation(null);
          return;
        }
      }

      const address = await getAddressFromCoordinates(pendingLocation.latitude, pendingLocation.longitude);
      const response = await clockIn({ siteId: site.id, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude });
      const shift = response.data || response.shift;
      if (!shift) throw new Error('No shift returned from API');

      const activeShift = {
        ...shift,
        siteName: site.name,
        siteAddress: [site.address, site.city, site.state].filter(Boolean).join(', '),
        location: address,
        coordinates: { latitude: pendingLocation.latitude, longitude: pendingLocation.longitude },
      };
      await AsyncStorage.setItem('activeShift', JSON.stringify(activeShift));
      setIsClockedIn(true);
      setCurrentShift(activeShift);
      setIsOvertime(false);
      await startLocationTracking(shift.id);
      Alert.alert('Clocked In', 'Site: ' + site.name + '\nTime: ' + new Date().toLocaleTimeString());
    } catch (error) {
      const errMsg = error.message || 'Failed to clock in';
      Alert.alert('Clock In Failed', errMsg);
    } finally {
      setLocationLoading(false);
      setPendingLocation(null);
    }
  };

  const openDirections = (site) => {
    if (!site.lat || !site.lng) {
      const address = encodeURIComponent(site.address + ', ' + site.city + ', ' + site.state);
      Linking.openURL('https://maps.google.com/?q=' + address);
    } else {
      Linking.openURL('https://maps.google.com/?q=' + site.lat + ',' + site.lng);
    }
  };

  const handleClockOut = async () => {
    if (!currentShift) return Alert.alert('Error', 'No active shift found');
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'Unable to get location. Please enable location services.');
        setLocationLoading(false);
        return;
      }
      const address = await getAddressFromCoordinates(location.latitude, location.longitude);
      setPendingClockOut({ location: address, coordinates: { latitude: location.latitude, longitude: location.longitude } });
      setShowReportModal(true);
      setLocationLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to prepare clock out');
      setLocationLoading(false);
    }
  };

  const completeClockOut = async (report) => {
    try {
      if (!report) {
        try {
          const token = await AsyncStorage.getItem('token');
          await fetch('https://tuffguardsecurityms.com/api/shift-reports/skipped', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ shiftId: currentShift?.id, siteId: currentShift?.siteId }),
          });
        } catch(e) {}
      }
      await clockOut(currentShift.id, { latitude: pendingClockOut.coordinates.latitude, longitude: pendingClockOut.coordinates.longitude });
      await stopLocationTracking();
      await AsyncStorage.removeItem('activeShift');
      const clockInTime = new Date(currentShift.clockInTime || currentShift.startTime);
      const clockOutTime = new Date();
      const duration = Math.floor((clockOutTime - clockInTime) / (1000 * 60));
      setIsClockedIn(false);
      setCurrentShift(null);
      setShowReportModal(false);
      setPendingClockOut(null);
      setIsOvertime(false);
      Alert.alert('Clocked Out', 'Duration: ' + Math.floor(duration / 60) + 'h ' + (duration % 60) + 'm' + (report ? '\nShift report submitted' : ''));
    } catch (error) {
      Alert.alert('Error', 'Failed to complete clock out');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }} style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Live Clock */}
      <View style={styles.clockWidget}>
        <Text style={styles.clockTime}>
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
        <Text style={styles.clockDate}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, isClockedIn ? styles.statusCardIn : styles.statusCardOut]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isClockedIn ? colors.primary : colors.danger }]} />
          <Text style={styles.statusText}>{isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}</Text>
        </View>
        {isClockedIn && currentShift && (
          <View style={styles.shiftDetails}>
            <View style={styles.shiftDetailRow}>
              <Text style={styles.shiftLabel}>Site</Text>
              <Text style={styles.shiftValue}>{currentShift.siteName}</Text>
            </View>
            {currentShift.siteAddress ? (
              <View style={styles.shiftDetailRow}>
                <Text style={styles.shiftLabel}>Address</Text>
                <Text style={styles.shiftValue}>{currentShift.siteAddress}</Text>
              </View>
            ) : null}
            <View style={styles.shiftDetailRow}>
              <Text style={styles.shiftLabel}>Clock In</Text>
              <Text style={styles.shiftValue}>{formatTime(currentShift.clockInTime || currentShift.startTime)}</Text>
            </View>
            <View style={[styles.durationBox, isOvertime && styles.durationBoxOT]}>
              <Text style={styles.durationLabel}>Time on Shift</Text>
              <Text style={[styles.durationValue, isOvertime && styles.durationValueOT]}>
                {currentDuration} {isOvertime ? 'OT' : ''}
              </Text>
            </View>
            <View style={styles.trackingPill}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingText}>GPS Tracking Active</Text>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        {!isClockedIn ? (
          <TouchableOpacity
            style={[styles.btnPrimary, (locationLoading || sitesLoading) && styles.btnDisabled]}
            onPress={handleClockIn}
            disabled={locationLoading || sitesLoading}>
            {locationLoading || sitesLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Clock In</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btnDanger, locationLoading && styles.btnDisabled]}
              onPress={handleClockOut}
              disabled={locationLoading}>
              {locationLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Clock Out</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('CheckIn')}>
              <Text style={styles.btnSecondaryText}>Submit Check-In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {locationLoading && (
        <View style={styles.locationRow}>
          <ActivityIndicator size="small" color={colors.blue} />
          <Text style={styles.locationText}>Getting your location...</Text>
        </View>
      )}

      {/* Site Picker Modal */}
      <Modal visible={showSitePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isAdmin() ? 'Select Your Site' : 'Your Scheduled Site'}</Text>
            <Text style={styles.modalSubtitle}>
              {isAdmin() ? 'Choose the site you are working at today' : 'Your scheduled shift location for today'}
            </Text>
            {sitesLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={sites}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View>
                    <TouchableOpacity style={styles.siteItem} onPress={() => handleSiteSelect(item)}>
                      <View style={styles.siteIcon}>
                        <Text style={styles.siteIconText}>🏢</Text>
                      </View>
                      <View style={styles.siteInfo}>
                        <Text style={styles.siteName}>{item.name}</Text>
                        {item.address && <Text style={styles.siteAddress}>{item.address}, {item.city}</Text>}
                        {item.radius && <Text style={styles.siteRadius}>Geofence: {item.radius}m</Text>}
                      </View>
                      <Text style={styles.siteArrow}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.directionsBtn} onPress={() => openDirections(item)}>
                      <Text style={styles.directionsBtnText}>Get Directions</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowSitePicker(false); setPendingLocation(null); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <EndOfShiftReport
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={completeClockOut}
        shiftData={currentShift}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 15 },
  clockWidget: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  clockTime: { color: colors.textPrimary, fontSize: 48, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  clockDate: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  statusCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1 },
  statusCardIn: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  statusCardOut: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  shiftDetails: { gap: 8 },
  shiftDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shiftLabel: { color: colors.textSecondary, fontSize: 13 },
  shiftValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  durationBox: { backgroundColor: colors.primaryBg, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, marginTop: 4 },
  durationBoxOT: { backgroundColor: colors.warningBg, borderColor: colors.warning },
  durationLabel: { color: colors.textSecondary, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  durationValue: { color: colors.primary, fontSize: 28, fontWeight: '700', marginTop: 4 },
  durationValueOT: { color: colors.warning },
  trackingPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  trackingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  trackingText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  buttonGroup: { gap: 12, marginBottom: 16 },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  btnDanger: { backgroundColor: colors.danger, borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { backgroundColor: colors.bgCard, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnSecondaryText: { color: colors.textPrimary, fontSize: 17, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  locationText: { color: colors.blue, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%', borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  siteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  siteIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bgInput, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  siteIconText: { fontSize: 18 },
  siteInfo: { flex: 1 },
  siteName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  siteAddress: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  siteRadius: { fontSize: 11, color: colors.blue, marginTop: 2 },
  siteArrow: { color: colors.textMuted, fontSize: 24 },
  directionsBtn: { marginLeft: 52, marginBottom: 8, backgroundColor: colors.bgInput, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start' },
  directionsBtnText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  separator: { height: 1, backgroundColor: colors.border },
  cancelButton: { marginTop: 12, backgroundColor: colors.bgInput, padding: 16, borderRadius: 14, alignItems: 'center' },
  cancelButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});

export default ClockInOut;
