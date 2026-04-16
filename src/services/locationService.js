import * as Location from 'expo-location';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './socketService';

// ─── Permissions ──────────────────────────────────────────────────────────────

export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required for clock in/out verification'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

// ─── Get Current Location ─────────────────────────────────────────────────────

export const getCurrentLocation = async () => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    Alert.alert('Error', 'Failed to get your location');
    return null;
  }
};

// ─── Address Lookup ───────────────────────────────────────────────────────────

export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      return `${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
    }
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch (error) {
    console.error('Error getting address:', error);
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};

// ─── Distance Calculator ──────────────────────────────────────────────────────

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ─── Live Tracking ────────────────────────────────────────────────────────────

let watchSubscription = null;
let trackingIntervalId = null;
let currentShiftId = null;
let isTracking = false;

export const resumeTrackingIfNeeded = async () => {
  try {
    const data = await AsyncStorage.getItem('locationTracking');
    if (!data) return false;
    const { isTracking, shiftId } = JSON.parse(data);
    if (isTracking && shiftId && !isTracking) {
      console.log('📍 Resuming location tracking for shift:', shiftId);
      await startLocationTracking(shiftId);
      return true;
    }
  } catch (err) {
    console.error('Error resuming tracking:', err);
  }
  return false;
};

export const startLocationTracking = async (shiftId) => {
  if (isTracking) {
    console.log('⚠️ Already tracking location');
    return false;
  }

  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return false;

  currentShiftId = shiftId;
  isTracking = true;

  console.log('📍 Starting location tracking for shift:', shiftId);

  // Save tracking state
  await AsyncStorage.setItem('locationTracking', JSON.stringify({
    isTracking: true,
    shiftId,
    startedAt: new Date().toISOString(),
  }));

  // Send location immediately
  await _sendLocation();

  // Send every 30 seconds
  trackingIntervalId = setInterval(async () => {
    await _sendLocation();
  }, 30000);

  // Also watch for movement (10+ meters)
  watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 10,
      timeInterval: 15000,
    },
    (location) => {
      const { latitude, longitude } = location.coords;
      console.log('📍 Position changed:', latitude, longitude);
      socketService.sendLocationUpdate(shiftId, latitude, longitude);
      _saveLastLocation(latitude, longitude);
    }
  );

  return true;
};

export const stopLocationTracking = async () => {
  if (!isTracking) return;

  console.log('🛑 Stopping location tracking');

  if (trackingIntervalId) {
    clearInterval(trackingIntervalId);
    trackingIntervalId = null;
  }

  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }

  isTracking = false;
  currentShiftId = null;

  await AsyncStorage.removeItem('locationTracking');
  await AsyncStorage.removeItem('lastLocation');

  console.log('✅ Location tracking stopped');
};

export const isCurrentlyTracking = async () => {
  try {
    const data = await AsyncStorage.getItem('locationTracking');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const getLastLocation = async () => {
  try {
    const data = await AsyncStorage.getItem('lastLocation');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// ─── Internal Helpers ─────────────────────────────────────────────────────────

const _sendLocation = async () => {
  if (!currentShiftId) return;
  const location = await getCurrentLocation();
  if (!location) return;

  console.log('📡 Sending location update:', location.latitude, location.longitude);
  socketService.sendLocationUpdate(currentShiftId, location.latitude, location.longitude);
  await _saveLastLocation(location.latitude, location.longitude);
};

const _saveLastLocation = async (latitude, longitude) => {
  await AsyncStorage.setItem('lastLocation', JSON.stringify({
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
  }));
};
