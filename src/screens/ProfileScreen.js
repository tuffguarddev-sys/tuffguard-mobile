import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => { if (u) setUser(JSON.parse(u)); });
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Error', 'Please fill in all fields');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'New passwords do not match');
    }
    if (newPassword.length < 8) {
      return Alert.alert('Error', 'Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(API + '/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Password changed successfully');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        Alert.alert('Error', data.error || 'Failed to change password');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : '??'}</Text>
        </View>
        <Text style={styles.name}>{user ? user.firstName + ' ' + user.lastName : 'Loading...'}</Text>
        <Text style={styles.role}>{user?.role || ''}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <TextInput style={styles.input} placeholder="Current Password" placeholderTextColor="#999" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
        <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#999" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
        <TextInput style={styles.input} placeholder="Confirm New Password" placeholderTextColor="#999" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change Password</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  role: { color: '#4CAF50', fontSize: 14, marginTop: 4 },
  email: { color: '#999', fontSize: 13, marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, alignSelf: 'flex-start' },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#444', backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 15, marginBottom: 12, fontSize: 16, color: '#fff' },
  button: { width: '100%', backgroundColor: '#4CAF50', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
