import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://192.168.0.172:3000/api';

const roleColor = { DEV: '#9C27B0', BOSS: '#f44336', MANAGER: '#FF9800', EMPLOYEE: '#4CAF50', CLIENT: '#2196F3' };

const AdminUsers = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/auth/users`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const toggleActive = async (user) => {
    Alert.alert(
      `${user.isActive ? 'Deactivate' : 'Activate'} User`,
      `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          const token = await AsyncStorage.getItem('token');
          await fetch(`${API}/auth/users/${user.id}`, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !user.isActive }),
          });
          loadUsers();
        }},
      ]
    );
  };

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => toggleActive(item)}>
      <View style={[styles.avatar, { backgroundColor: roleColor[item.role] || '#555' }]}>
        <Text style={styles.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: roleColor[item.role] || '#555' }]}>
            <Text style={styles.badgeText}>{item.role}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: item.isActive ? '#1a2a1a' : '#2a1a1a', borderWidth: 1, borderColor: item.isActive ? '#4CAF50' : '#f44336' }]}>
            <Text style={[styles.badgeText, { color: item.isActive ? '#4CAF50' : '#f44336' }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2196F3" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search users..." placeholderTextColor="#666" />
      </View>
      <FlatList data={filtered} keyExtractor={u => u.id} renderItem={renderUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUsers(); }} colors={['#2196F3']} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.count}>{filtered.length} users</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  searchBox: { padding: 10, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#333' },
  searchInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 },
  count: { color: '#555', fontSize: 12, marginBottom: 10 },
  card: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  email: { color: '#666', fontSize: 12, marginTop: 2, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});

export default AdminUsers;
