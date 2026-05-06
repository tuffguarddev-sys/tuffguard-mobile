import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, RefreshControl, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout, getUnreadCountAPI } from '../services/api';
import { colors } from '../theme/colors';

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftSite, setShiftSite] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const checkClockStatus = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://tuffguardsecurityms.com/api/shifts/active', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setClockedIn(true);
        setShiftSite(data.data.site?.name || 'Unknown Site');
      } else {
        setClockedIn(false);
        setShiftSite('');
      }
    } catch {}
  }, []);

  const loadUnreadNotifs = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('https://tuffguardsecurityms.com/api/notifications', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      const unread = (data.data || []).filter(n => !n.isRead).length;
      setUnreadNotifs(unread);
    } catch {}
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCountAPI();
      setUnreadMessages(count || 0);
    } catch {}
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch {}
  }, []);

  useEffect(() => {
    loadUser();
    loadUnreadCount();
    loadUnreadNotifs();
    checkClockStatus();
    const interval = setInterval(() => {
      loadUnreadCount();
      loadUnreadNotifs();
      checkClockStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUser(), loadUnreadCount(), loadUnreadNotifs(), checkClockStatus()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try {
          await logout();
          navigation.replace('Login');
        } catch {
          Alert.alert('Error', 'Failed to logout');
        }
      }},
    ]);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isAdmin = user && ['DEV', 'BOSS', 'MANAGER'].includes(user.role);

  const menuItems = [
    {
      title: 'Check In',
      subtitle: 'Record your patrol check-in',
      icon: '✅',
      screen: 'CheckIn',
      color: colors.blue,
      bg: colors.blueBg,
      badge: null,
    },
    {
      title: 'Schedule',
      subtitle: 'View your upcoming shifts',
      icon: '🗓️',
      screen: 'CalendarSchedule',
      color: colors.warning,
      bg: colors.warningBg,
      badge: null,
    },
    {
      title: 'Shift History',
      subtitle: 'View your past shifts',
      icon: '📊',
      screen: 'ShiftHistory',
      color: colors.blue,
      bg: colors.blueBg,
      badge: null,
    },
    {
      title: 'Incident Reports',
      subtitle: 'Report and view incidents',
      icon: '🚨',
      screen: 'Incidents',
      color: colors.danger,
      bg: colors.dangerBg,
      badge: null,
    },
    {
      title: 'Messages',
      subtitle: unreadMessages > 0 ? unreadMessages + ' unread message' + (unreadMessages !== 1 ? 's' : '') : 'Team communication',
      icon: '💬',
      screen: 'Messaging',
      color: colors.blue,
      bg: colors.blueBg,
      badge: unreadMessages,
    },
    {
      title: 'Sites',
      subtitle: 'Locations and directions',
      icon: '🏢',
      screen: 'Sites',
      color: colors.primary,
      bg: colors.primaryBg,
      badge: null,
    },
    {
      title: 'Time Off',
      subtitle: 'Request time off',
      icon: '📅',
      screen: 'TimeOff',
      color: colors.warning,
      bg: colors.warningBg,
      badge: null,
    },
    {
      title: 'Events',
      subtitle: 'View your assigned events',
      icon: '🎯',
      screen: 'Events',
      color: colors.blue,
      bg: colors.blueBg,
      badge: null,
    },
    {
      title: 'Shift Reports',
      subtitle: 'View your end of shift reports',
      icon: '📋',
      screen: 'ShiftReports',
      color: colors.primary,
      bg: colors.primaryBg,
      badge: null,
    },
    {
      title: 'My Profile',
      subtitle: 'Account settings',
      icon: '👤',
      screen: 'Profile',
      color: colors.textSecondary,
      bg: colors.bgInput,
      badge: null,
    },
  ];

  if (isAdmin) {
    menuItems.push({
      title: 'Admin Panel',
      subtitle: 'Manage users, sites & reports',
      icon: '⚙️',
      screen: 'Admin',
      color: colors.purple,
      bg: '#1A0A2A',
      badge: null,
    });
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgHeader} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user ? user.firstName : 'Officer'}</Text>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          {/* Notification Bell */}
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadNotifs > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Clock Status Banner */}
        <TouchableOpacity
          style={[styles.clockBanner, clockedIn ? styles.clockBannerIn : styles.clockBannerOut]}
          onPress={() => navigation.navigate('ClockInOut')}>
          <View style={styles.clockBannerLeft}>
            <View style={[styles.clockDot, { backgroundColor: clockedIn ? colors.primary : colors.danger }]} />
            <View>
              <Text style={styles.clockBannerStatus}>
                {clockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
              </Text>
              <Text style={styles.clockBannerSite}>
                {clockedIn ? '📍 ' + shiftSite : 'Tap to clock in'}
              </Text>
            </View>
          </View>
          <Text style={styles.clockBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* Menu Grid */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}>
              <View style={[styles.menuIconBox, { backgroundColor: item.bg, borderColor: item.color }]}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                {item.badge > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer with Logout */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TuffGuard Security</Text>
          <Text style={styles.footerVersion}>v1.0.6</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgHeader },
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.bgHeader, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flex: 1 },
  greeting: { color: colors.textSecondary, fontSize: 14 },
  userName: { color: colors.textPrimary, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  dateText: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  bellBtn: { position: 'relative', padding: 8, marginTop: 4 },
  bellIcon: { fontSize: 24 },
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: colors.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bgHeader },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  clockBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  clockBannerIn: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  clockBannerOut: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  clockBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clockDot: { width: 10, height: 10, borderRadius: 5 },
  clockBannerStatus: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  clockBannerSite: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  clockBannerArrow: { color: colors.textMuted, fontSize: 28 },
  menuContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  menuCard: { width: '47%', backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  menuIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, position: 'relative' },
  menuIcon: { fontSize: 22 },
  menuBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bgCard },
  menuBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  menuTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  menuSubtitle: { color: colors.textSecondary, fontSize: 11 },
  footer: { padding: 20, alignItems: 'center', gap: 6 },
  footerText: { color: colors.textMuted, fontSize: 12 },
  footerVersion: { color: colors.textMuted, fontSize: 11 },
  logoutBtn: { marginTop: 8, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
});

export default HomeScreen;
