import React, { useState, useEffect } from 'react';
import {
 View, Text, FlatList, TouchableOpacity, StyleSheet,
 RefreshControl, Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const severityColors = {
 low: '#4CAF50', medium: '#FF9800', high: '#f44336', critical: '#9C27B0'
};
const statusColors = {
 open: '#f44336', in_progress: '#FF9800', resolved: '#4CAF50', closed: '#666'
};

const IncidentScreen = ({ navigation }) => {
 const [incidents, setIncidents] = useState([]);
 const [refreshing, setRefreshing] = useState(false);
 const [loading, setLoading] = useState(true);
 const [selected, setSelected] = useState(null);

 useEffect(() => {
 loadIncidents();
 }, []);

 const loadIncidents = async () => {
 try {
 const token = await AsyncStorage.getItem('token');
 const res = await fetch(`${API}/incidents`, {
 headers: { Authorization: 'Bearer ' + token }
 });
 const data = await res.json();
 setIncidents(data.data || []);
 } catch (error) {
 console.error('Error loading incidents:', error);
 } finally {
 setLoading(false);
 setRefreshing(false);
 }
 };

 const onRefresh = () => {
 setRefreshing(true);
 loadIncidents();
 };

 const renderIncident = ({ item }) => (
 <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
 <View style={styles.cardHeader}>
 <View style={[styles.severityDot, { backgroundColor: severityColors[item.severity?.toLowerCase()] || '#666' }]} />
 <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
 <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status?.toLowerCase()] || '#666' }]}>
 <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
 </View>
 </View>
 <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
 <View style={styles.cardFooter}>
 <Text style={styles.meta}> {item.site?.name || 'Unknown Site'}</Text>
 <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
 </View>
 </TouchableOpacity>
 );

 if (loading) return (
 <View style={styles.loadingContainer}>
 <ActivityIndicator size="large" color="#f44336" />
 <Text style={styles.loadingText}>Loading incidents...</Text>
 </View>
 );

 return (
 <View style={styles.container}>
 <View style={styles.header}>
 <Text style={styles.headerTitle}>Incidents</Text>
 <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('Report')}>
 <Text style={styles.reportBtnText}>+ Report</Text>
 </TouchableOpacity>
 </View>

 {incidents.length === 0 ? (
 <View style={styles.empty}>
 <Text style={styles.emptyIcon}></Text>
 <Text style={styles.emptyText}>No incidents reported</Text>
 <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('Report')}>
 <Text style={styles.reportBtnText}>Report an Incident</Text>
 </TouchableOpacity>
 </View>
 ) : (
 <FlatList
 data={incidents}
 keyExtractor={item => item.id}
 renderItem={renderIncident}
 refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
 contentContainerStyle={{ padding: 16 }}
 />
 )}

 {/* Detail Modal */}
 {selected && (
 <Modal visible={true} animationType="slide" transparent>
 <View style={styles.modalOverlay}>
 <View style={styles.modalContainer}>
 <ScrollView>
 <View style={styles.modalHeader}>
 <Text style={styles.modalTitle}>{selected.title}</Text>
 <TouchableOpacity onPress={() => setSelected(null)}>
 <Text style={styles.closeBtn}></Text>
 </TouchableOpacity>
 </View>
 <View style={styles.modalBody}>
 <View style={styles.badgeRow}>
 <View style={[styles.badge, { backgroundColor: severityColors[selected.severity?.toLowerCase()] || '#666' }]}>
 <Text style={styles.badgeText}>{selected.severity?.toUpperCase()}</Text>
 </View>
 <View style={[styles.badge, { backgroundColor: statusColors[selected.status?.toLowerCase()] || '#666' }]}>
 <Text style={styles.badgeText}>{selected.status?.toUpperCase()}</Text>
 </View>
 </View>
 <Text style={styles.fieldLabel}>Description</Text>
 <Text style={styles.fieldValue}>{selected.description}</Text>
 {selected.site && <>
 <Text style={styles.fieldLabel}>Site</Text>
 <Text style={styles.fieldValue}>{selected.site.name}</Text>
 </>}
 {selected.reporter && <>
 <Text style={styles.fieldLabel}>Reported By</Text>
 <Text style={styles.fieldValue}>{selected.reporter.firstName} {selected.reporter.lastName}</Text>
 </>}
 <Text style={styles.fieldLabel}>Date</Text>
 <Text style={styles.fieldValue}>{new Date(selected.createdAt).toLocaleString()}</Text>
 </View>
 </ScrollView>
 </View>
 </View>
 </Modal>
 )}
 </View>
 );
};

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000' },
 loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
 loadingText: { color: '#fff', marginTop: 12 },
 header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#333' },
 headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
 reportBtn: { backgroundColor: '#f44336', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
 reportBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
 empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
 emptyIcon: { fontSize: 48 },
 emptyText: { color: '#666', fontSize: 16, marginBottom: 8 },
 card: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
 cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
 severityDot: { width: 10, height: 10, borderRadius: 5 },
 title: { flex: 1, color: '#fff', fontSize: 15, fontWeight: 'bold' },
 statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
 statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
 description: { color: '#aaa', fontSize: 13, marginBottom: 8 },
 cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
 meta: { color: '#666', fontSize: 12 },
 modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
 modalContainer: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderWidth: 1, borderColor: '#333' },
 modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
 modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 12 },
 closeBtn: { color: '#666', fontSize: 20 },
 modalBody: { padding: 20, gap: 8 },
 badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
 badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
 badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
 fieldLabel: { color: '#666', fontSize: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
 fieldValue: { color: '#fff', fontSize: 14 },
});

export default IncidentScreen;
