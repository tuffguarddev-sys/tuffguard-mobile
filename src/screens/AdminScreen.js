import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_SECTIONS = [
  { title: 'Users', subtitle: 'Manage employees & clients', screen: 'AdminUsers', color: '#2196F3' },
  { title: 'Sites', subtitle: 'Manage client sites', screen: 'AdminSites', color: '#4CAF50' },
  { title: 'Schedule', subtitle: 'Create & manage schedules', screen: 'AdminSchedule', color: '#FF9800' },
  { title: 'Incidents', subtitle: 'View & manage all incidents', screen: 'AdminIncidents', color: '#f44336' },
  { title: 'Shift Reports', subtitle: 'View end-of-shift reports', screen: 'AdminShiftReports', color: '#9C27B0' },
  { title: 'Shift History', subtitle: 'View all guard shifts', screen: 'AdminShiftHistory', color: '#607D8B' },
];

const AdminScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then(data => {
      if (data) setUser(JSON.parse(data));
    });
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSub}>Logged in as {user?.firstName} {user?.lastName} · {user?.role}</Text>
      </View>

      <View style={styles.grid}>
        {ADMIN_SECTIONS.map((section, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: section.color }]}
            onPress={() => navigation.navigate(section.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.dot, { backgroundColor: section.color }]} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardSub}>{section.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { backgroundColor: '#1a1a1a', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#666', fontSize: 13, marginTop: 4 },
  grid: { padding: 16, gap: 10 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333', borderLeftWidth: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: '#666', fontSize: 13, marginTop: 2 },
  arrow: { color: '#555', fontSize: 24 },
});

export default AdminScreen;
