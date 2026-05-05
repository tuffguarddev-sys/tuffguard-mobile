import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const API = 'https://tuffguardsecurityms.com/api';
const APP_VERSION = '1.0.1';

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassSection, setShowPassSection] = useState(false);
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    loadUser();
    loadAppVersion();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        if (parsed.siteId) loadSite(parsed.siteId);
      }
    } catch {}
  };

  const loadSite = async (siteId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/sites/${siteId}`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (data.site) setSite(data.site);
    } catch {}
  };

  const loadAppVersion = async () => {
    try {
      const res = await fetch(`${API.replace('/api', '')}/api/app/version`);
      const data = await res.json();
      if (data.success) setAppVersion(data);
    } catch {}
  };

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
    if (newPassword === currentPassword) {
      return Alert.alert('Error', 'New password must be different from current password');
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('✅ Success', 'Password changed successfully');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setShowPassSection(false);
      } else {
        Alert.alert('Error', data.error || 'Failed to change password');
      }
    } catch {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['token', 'user', 'activeShift', 'locationTracking', 'lastLocation']);
        navigation.replace('Login');
      }}
    ]);
  };

  const getRoleColor = (role) => colors.roleColors[role] || colors.primary;
  const getInitials = (u) => u ? (u.firstName?.[0] || '') + (u.lastName?.[0] || '') : '??';

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }} style={styles.container} contentContainerStyle={{ padding: 16 }}>

      {/* Avatar + Name */}
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: getRoleColor(user?.role) }]}>
          <Text style={styles.avatarText}>{getInitials(user).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user ? `${user.firstName} ${user.lastName}` : 'Loading...'}</Text>
        <View style={[styles.rolePill, { backgroundColor: getRoleColor(user?.role) + '22', borderColor: getRoleColor(user?.role) }]}>
          <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>{user?.role || ''}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT INFO</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="✉️" label="Email" value={user?.email} />
          {user?.phone && <InfoRow icon="📞" label="Phone" value={user.phone} />}
          {site && <InfoRow icon="🏢" label="Site" value={site.name} />}
          {user?.hourlyRate && <InfoRow icon="💵" label="Hourly Rate" value={`$${parseFloat(user.hourlyRate).toFixed(2)}/hr`} />}
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => setShowPassSection(!showPassSection)}>
          <Text style={styles.sectionCardIcon}>🔐</Text>
          <Text style={styles.sectionCardText}>Change Password</Text>
          <Text style={styles.sectionCardArrow}>{showPassSection ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showPassSection && (
          <View style={styles.passForm}>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password (min 8 characters)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP INFO</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="📱" label="App Version" value={APP_VERSION} />
          {appVersion && <InfoRow icon="☁️" label="Latest Version" value={appVersion.version} />}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>TuffGuard Security and Patrol Service</Text>
      <Text style={styles.footerSub}>Meridian, MS</Text>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  profileCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  rolePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  roleText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  section: { marginBottom: 20 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  infoCard: { backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { fontSize: 16, marginRight: 12 },
  infoLabel: { color: colors.textSecondary, fontSize: 14, width: 90 },
  infoValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },

  sectionCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  sectionCardIcon: { fontSize: 20, marginRight: 12 },
  sectionCardText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  sectionCardArrow: { color: colors.textMuted, fontSize: 12 },

  passForm: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  input: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  logoutBtn: { backgroundColor: colors.dangerBg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.danger },
  logoutIcon: { fontSize: 20 },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '700' },

  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 4 },
  footerSub: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 30 },
});

export default ProfileScreen;
