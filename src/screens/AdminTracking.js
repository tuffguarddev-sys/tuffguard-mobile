import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://tuffguardsecurityms.com';

const AdminTracking = () => {
  const [guards, setGuards] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [mapView, setMapView] = useState(true);
  const socketRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    connect();
    return () => { socketRef.current?.disconnect(); };
  }, []);

  const connect = async () => {
    const token = await AsyncStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('location:guard', (data) => {
      setGuards(prev => {
        const idx = prev.findIndex(g => g.userId === data.userId);
        const updated = { ...data, lastUpdate: new Date() };
        if (idx >= 0) {
          const arr = [...prev];
          arr[idx] = updated;
          return arr;
        }
        return [...prev, updated];
      });
    });
  };

  const focusGuard = (guard) => {
    setSelectedGuard(guard);
    const lat = guard.latitude ?? guard.lat;
    const lng = guard.longitude ?? guard.lng;
    if (lat && lng && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat, longitude: lng,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const initialRegion = {
    latitude: guards[0]?.latitude ?? guards[0]?.lat ?? 32.3697,
    longitude: guards[0]?.longitude ?? guards[0]?.lng ?? -88.6737,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>{connected ? 'Live' : 'Disconnected'} · {guards.length} guard{guards.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setMapView(!mapView)}>
          <Text style={styles.viewToggleText}>{mapView ? 'List View' : 'Map View'}</Text>
        </TouchableOpacity>
      </View>

      {mapView ? (
        <View style={styles.mapContainer}>
          {guards.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#00BCD4" />
              <Text style={styles.emptyText}>Waiting for guard locations...</Text>
              <Text style={styles.emptySub}>Guards appear here when clocked in</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation={false}
              showsMyLocationButton={false}
            >
              {guards.map(guard => {
                const lat = guard.latitude ?? guard.lat;
                const lng = guard.longitude ?? guard.lng;
                if (!lat || !lng) return null;
                return (
                  <Marker
                    key={guard.userId}
                    coordinate={{ latitude: lat, longitude: lng }}
                    onPress={() => focusGuard(guard)}
                    pinColor="#00BCD4"
                  >
                    <Callout>
                      <View style={styles.callout}>
                        <Text style={styles.calloutName}>{guard.firstName} {guard.lastName}</Text>
                        <Text style={styles.calloutTime}>Updated: {formatTime(guard.lastUpdate)}</Text>
                        <Text style={styles.calloutCoords}>{lat?.toFixed(5)}, {lng?.toFixed(5)}</Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          )}

          {/* Guard list overlay at bottom */}
          {guards.length > 0 && (
            <View style={styles.guardListOverlay}>
              <FlatList
                data={guards}
                horizontal
                keyExtractor={g => g.userId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ padding: 8, gap: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.guardChip, selectedGuard?.userId === item.userId && styles.guardChipActive]}
                    onPress={() => focusGuard(item)}
                  >
                    <View style={styles.activeDot} />
                    <Text style={styles.guardChipText}>{item.firstName} {item.lastName}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      ) : (
        // List view
        <FlatList
          data={guards}
          keyExtractor={g => g.userId}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#00BCD4" />
              <Text style={styles.emptyText}>Waiting for guard locations...</Text>
            </View>
          }
          renderItem={({ item }) => {
            const lat = item.latitude ?? item.lat;
            const lng = item.longitude ?? item.lng;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.activeDot} />
                  <Text style={styles.guardName}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.updateTime}>{formatTime(item.lastUpdate)}</Text>
                </View>
                <Text style={styles.coords}>{lat?.toFixed(6)}, {lng?.toFixed(6)}</Text>
                <TouchableOpacity style={styles.focusBtn} onPress={() => { setMapView(true); setTimeout(() => focusGuard(item), 300); }}>
                  <Text style={styles.focusBtnText}>Show on Map</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { backgroundColor: '#1a1a1a', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: '#aaa', fontSize: 13 },
  viewToggle: { backgroundColor: '#00BCD4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  viewToggleText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyText: { color: '#fff', fontSize: 16, marginTop: 12 },
  emptySub: { color: '#555', fontSize: 13, textAlign: 'center' },
  guardListOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)' },
  guardChip: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#333' },
  guardChipActive: { borderColor: '#00BCD4' },
  guardChipText: { color: '#fff', fontSize: 13 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#00BCD4' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  guardName: { color: '#fff', fontSize: 15, fontWeight: 'bold', flex: 1 },
  updateTime: { color: '#555', fontSize: 11 },
  coords: { color: '#00BCD4', fontSize: 13, marginBottom: 8 },
  focusBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#00BCD4', borderRadius: 8, padding: 8, alignItems: 'center' },
  focusBtnText: { color: '#00BCD4', fontSize: 13 },
  callout: { padding: 8, minWidth: 160 },
  calloutName: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutTime: { fontSize: 12, color: '#666' },
  calloutCoords: { fontSize: 11, color: '#888', marginTop: 2 },
});

export default AdminTracking;
