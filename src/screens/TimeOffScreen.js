import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const TimeOffScreen = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(API + '/time-off', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load time off requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) return Alert.alert('Error', 'Please enter start and end dates');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return Alert.alert('Error', 'Date format must be YYYY-MM-DD');
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(API + '/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ startDate, endDate, reason })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Time off request submitted');
        setShowModal(false); setStartDate(''); setEndDate(''); setReason('');
        load();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit request');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusColor = { pending: '#FF9800', approved: '#4CAF50', denied: '#f44336' };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Request Time Off</Text>
      </TouchableOpacity>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No time off requests</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.dates}>{item.startDate} → {item.endDate}</Text>
              <Text style={[styles.status, { color: statusColor[item.status] || '#999' }]}>{item.status?.toUpperCase()}</Text>
            </View>
            {item.reason && <Text style={styles.reason}>{item.reason}</Text>}
            {item.adminNote && <Text style={styles.adminNote}>Admin: {item.adminNote}</Text>}
          </View>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Request Time Off</Text>
            <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor="#999" value={startDate} onChangeText={setStartDate} />
            <TextInput style={styles.input} placeholder="End Date (YYYY-MM-DD)" placeholderTextColor="#999" value={endDate} onChangeText={setEndDate} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Reason (optional)" placeholderTextColor="#999" value={reason} onChangeText={setReason} multiline numberOfLines={3} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  addBtn: { margin: 16, backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  empty: { color: '#999', textAlign: 'center', marginTop: 50, fontSize: 16 },
  item: { backgroundColor: '#1a1a1a', margin: 8, marginHorizontal: 16, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#333' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dates: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  status: { fontSize: 13, fontWeight: 'bold' },
  reason: { color: '#999', fontSize: 13, marginTop: 8 },
  adminNote: { color: '#4CAF50', fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  input: { height: 50, borderWidth: 1, borderColor: '#444', backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 15, marginBottom: 12, fontSize: 16, color: '#fff' },
  textArea: { height: 80, paddingTop: 12 },
  submitBtn: { backgroundColor: '#4CAF50', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#333', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#fff', fontSize: 16 },
});

export default TimeOffScreen;
