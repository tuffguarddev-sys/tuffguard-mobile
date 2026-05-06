import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 FlatList,
 StyleSheet,
 TouchableOpacity,
 RefreshControl,
 Alert,
 Modal,
 ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ShiftReportsScreen = () => {
  const insets = useSafeAreaInsets();
 const [reports, setReports] = useState([]);
 const [refreshing, setRefreshing] = useState(false);
 const [loading, setLoading] = useState(true);
 const [selectedReport, setSelectedReport] = useState(null);
 const [modalVisible, setModalVisible] = useState(false);

 useEffect(() => {
 loadReports();
 }, []);

 const loadReports = async () => {
 try {
 const reportsData = await AsyncStorage.getItem('shiftReports');
 const allReports = reportsData ? JSON.parse(reportsData) : [];
 
 // Sort by date (newest first)
 const sortedReports = allReports.sort(
 (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
 );
 
 setReports(sortedReports);
 } catch (error) {
 console.error('Error loading reports:', error);
 Alert.alert('Error', 'Failed to load shift reports');
 } finally {
 setLoading(false);
 }
 };

 const onRefresh = async () => {
 setRefreshing(true);
 await loadReports();
 setRefreshing(false);
 };

 const calculateDuration = (clockIn, clockOut) => {
 if (!clockIn || !clockOut) return 'N/A';
 
 const start = new Date(clockIn);
 const end = new Date(clockOut);
 const diff = end - start;
 
 const hours = Math.floor(diff / (1000 * 60 * 60));
 const minutes = Math.floor((diff % (1000 * 60 
* 60)) / (1000 * 60));
 
 return `${hours}h ${minutes}m`;
 };

 const formatDate = (isoString) => {
 const date = new Date(isoString);
 return date.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });
 };

 const formatTime = (isoString) => {
 const date = new Date(isoString);
 return date.toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 });
 };

 const renderReport = ({ item }) => (
 <TouchableOpacity
 style={styles.reportCard}
 onPress={() => {
 setSelectedReport(item);
 setModalVisible(true);
 }}>
 <View style={styles.reportHeader}>
 <View>
 <Text style={styles.officerName}> {item.username}</Text>
 <Text style={styles.reportDate}>{formatDate(item.submittedAt)}</Text>
 </View>
 <View style={styles.durationBadge}>
 <Text style={styles.durationText}>
 {calculateDuration(item.clockIn, item.clockOut)}
 </Text>
 </View>
 </View>

 <Text style={styles.activitiesPreview} numberOfLines={2}>
 {item.activities}
 </Text>

 {item.incidents && (
 <View style={styles.incidentIndicator}>
 <Text style={styles.incidentText}> Incidents Reported</Text>
 </View>
 )}

 <Text style={styles.submittedTime}>
 Submitted: {formatTime(item.submittedAt)}
 </Text>
 </TouchableOpacity>
 );

 if (loading) {
 return (
 <View style={styles.loadingContainer}>
 <Text style={styles.loadingText}>Loading shift reports...</Text>
 </View>
 );
 }

 return (
 <View style={styles.container}>
 <View style={styles.headerContainer}>
 <Text style={styles.headerTitle}>Total Reports: {reports.length}</Text>
 </View>

 <FlatList
 data={reports}
 renderItem={renderReport}
 keyExtractor={(item) => item.id.toString()}
 contentContainerStyle={styles.listContainer}
 refreshControl={
 <RefreshControl
 refreshing={refreshing}
 onRefresh={onRefresh}
 colors={['#4CAF50']}
 tintColor="#4CAF50"
 />
 }
 ListEmptyComponent={
 <View style={styles.emptyContainer}>
 <Text style={styles.emptyText}>No shift reports yet</Text>
 <Text style={styles.emptySubtext}>
 Reports will appear here when officers submit them
 </Text>
 </View>
 }
 />

 {/* Report Detail Modal */}
 <Modal
 animationType="slide"
 transparent={false}
 visible={modalVisible}
 onRequestClose={() => setModalVisible(false)}>
 <View style={styles.modalContainer}>
 <View style={styles.modalHeader}>
 <Text style={styles.modalTitle}>Shift Report Details</Text>
 <TouchableOpacity onPress={() => setModalVisible(false)}>
 <Text style={styles.closeButton}></Text>
 </TouchableOpacity>
 </View>

 <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }} style={styles.modalContent}>
 {selectedReport && (
 <>
 <View style={styles.detailSection}>
 <Text style={styles.detailLabel}>Officer:</Text>
 <Text style={styles.detailValue}>{selectedReport.username}</Text>
 </View>

 <View style={styles.detailSection}>
 <Text style={styles.detailLabel}>Date:</Text>
 <Text style={styles.detailValue}>
 {formatDate(selectedReport.submittedAt)}
 </Text>
 </View>

 <View style={styles.detailSection}>
 <Text style={styles.detailLabel}>Shift Duration:</Text>
 <Text style={styles.detailValue}>
 {calculateDuration(selectedReport.clockIn, selectedReport.clockOut)}
 </Text>
 </View>

 <View style={styles.detailSection}>
 <Text style={styles.detailLabel}>Clock In:</Text>
 <Text style={styles.detailValue}>
 {formatTime(selectedReport.clockIn)}
 </Text>
 </View>

 <View style={styles.detailSection}>
 <Text style={styles.detailLabel}>Clock Out:</Text>
 <Text style={styles.detailValue}>
 {formatTime(selectedReport.clockOut)}
 </Text>
 </View>

 <View style={styles.sectionDivider} />

 <View style={styles.detailSection}>
 <Text style={styles.sectionTitle}> Activities Performed</Text>
 <Text style={styles.detailValueLarge}>{selectedReport.activities}</Text>
 </View>

 {selectedReport.incidents && (
 <View style={styles.detailSection}>
 <Text style={styles.sectionTitle}> Incidents/Issues</Text>
 <Text style={styles.detailValueLarge}>{selectedReport.incidents}</Text>
 </View>
 )}

 {selectedReport.equipmentStatus && (
 <View style={styles.detailSection}>
 <Text style={styles.sectionTitle}> Equipment Status</Text>
 <Text style={styles.detailValueLarge}>
 {selectedReport.equipmentStatus}
 </Text>
 </View>
 )}

 {selectedReport.notes && (
 <View style={styles.detailSection}>
 <Text style={styles.sectionTitle}> Additional Notes</Text>
 <Text style={styles.detailValueLarge}>{selectedReport.notes}</Text>
 </View>
 )}

 <View style={styles.sectionDivider} />

 <View style={styles.detailSection}>
 <Text style={styles.detailLabel}>Submitted:</Text>
 <Text style={styles.detailValue}>
 {new Date(selectedReport.submittedAt).toLocaleString()}
 </Text>
 </View>
 </>
 )}
 </ScrollView>
 </View>
 </Modal>
 </View>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: '#000000',
 },
 headerContainer: {
 padding: 15,
 backgroundColor: '#1a1a1a',
 borderBottomWidth: 1,
 borderBottomColor: '#333',
 },
 headerTitle: {
 fontSize: 16,
 fontWeight: 'bold',
 color: '#fff',
 },
 loadingContainer: {
 flex: 1,
 justifyContent: 'center',
 alignItems: 'center',
 backgroundColor: '#000000',
 },
 loadingText: {
 color: '#fff',
 fontSize: 16,
 },
 listContainer: {
 padding: 15,
 },
 reportCard: {
 backgroundColor: '#1a1a1a',
 borderRadius: 10,
 padding: 15,
 marginBottom: 15,
 borderWidth: 1,
 borderColor: '#333',
 borderLeftWidth: 5,
 borderLeftColor: '#4CAF50',
 },
 reportHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'flex-start',
 marginBottom: 10,
 },
 officerName: {
 fontSize: 18,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 5,
 },
 reportDate: {
 fontSize: 14,
 color: '#999',
 },
 durationBadge: {
 backgroundColor: '#2196F3',
 paddingHorizontal: 10,
 paddingVertical: 5,
 borderRadius: 15,
 },
 durationText: {
 color: '#fff',
 fontSize: 12,
 fontWeight: 'bold',
 },
 activitiesPreview: {
 fontSize: 14,
 color: '#ccc',
 marginBottom: 10,
 },
 incidentIndicator: {
 backgroundColor: '#3a1a1a',
 padding: 8,
 borderRadius: 5,
 marginBottom: 10,
 },
 incidentText: {
 color: '#FF9800',
 fontSize: 12,
 fontWeight: 'bold',
 },
 submittedTime: {
 fontSize: 12,
 color: '#666',
 fontStyle: 'italic',
 },
 emptyContainer: {
 flex: 1,
 justifyContent: 'center',
 alignItems: 'center',
 paddingTop: 50,
 },
 emptyText: {
 fontSize: 18,
 color: '#999',
 marginBottom: 10,
 },
 emptySubtext:
 {
 fontSize: 14,
 color: '#666',
 textAlign: 'center',
 },
 modalContainer: {
 flex: 1,
 backgroundColor: '#000000',
 },
 modalHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 padding: 20,
 backgroundColor: '#1a1a1a',
 borderBottomWidth: 1,
 borderBottomColor: '#333',
 },
 modalTitle: {
 fontSize: 20,
 fontWeight: 'bold',
 color: '#fff',
 },
 closeButton: {
 fontSize: 30,
 color: '#fff',
 fontWeight: 'bold',
 },
 modalContent: {
 flex: 1,
 padding: 20,
 },
 detailSection: {
 marginBottom: 20,
 },
 detailLabel: {
 fontSize: 14,
 color: '#999',
 marginBottom: 5,
 },
 detailValue: {
 fontSize: 16,
 color: '#fff',
 },
 detailValueLarge: {
 fontSize: 15,
 color: '#fff',
 lineHeight: 22,
 },
 sectionTitle: {
 fontSize: 16,
 fontWeight: 'bold',
 color: '#4CAF50',
 marginBottom: 10,
 },
 sectionDivider: {
 height: 1,
 backgroundColor: '#333',
 marginVertical: 20,
 },
});

export default ShiftReportsScreen;
