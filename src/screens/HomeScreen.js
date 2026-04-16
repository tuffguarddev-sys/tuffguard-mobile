import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../services/api';
import { getUnreadCountAPI } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftSite, setShiftSite] = useState('');

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCountAPI();
      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
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
    } catch (err) {
      console.error('Clock status check failed:', err);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadUnreadCount();
    checkClockStatus();
    const interval = setInterval(loadUnreadCount, 60000); // Every 60 seconds
    return () => clearInterval(interval);
  }, [loadUser, loadUnreadCount]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    await loadUnreadCount();
    await checkClockStatus();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try {
          await logout();
          navigation.replace('Login');
        } catch (error) {
          Alert.alert('Error', 'Failed to logout');
        }
      }},
    ]);
  };

  const canAccessManagement = () => {
    return user && ['DEV', 'BOSS', 'MANAGER', 'Management'].includes(user.role || user.category);
  };

  const menuItems = [
    {
      title: 'Clock In / Out',
      subtitle: 'Track your work hours',
      image: require('../../assets/images/clock-scene.jpg'),
      screen: 'ClockInOut',
    },
    {
      title: 'Schedule',
      subtitle: 'View your upcoming shifts',
      image: require('../../assets/images/schedule-scene.jpg'),
      screen: 'Schedule',
    },
    {
      title: 'Shift History',
      subtitle: 'View your past shifts',
      image: require('../../assets/images/shift-history-scene.jpg'),
      screen: 'ShiftHistory',
    },
    {
      title: 'Incident Reports',
      subtitle: 'Report and view incidents',
      image: require('../../assets/images/police-scene.jpg'),
      screen: 'Incidents',
    },
    {
      title: 'Messages',
      subtitle: unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages !== 1 ? 's' : ''}` : 'Team communication',
      image: require('../../assets/images/messages-scene.jpg'),
      screen: 'Messaging',
      badge: unreadMessages,
    },
    {
      title: 'Sites',
      subtitle: 'Locations and directions',
      image: require('../../assets/images/map-scene.jpg'),
      screen: 'Sites',
    },
    {
      title: 'Time Off',
      subtitle: 'Request time off',
      image: require('../../assets/images/schedule-scene.jpg'),
      screen: 'TimeOff',
    },
    {
      title: 'Notifications',
      subtitle: 'View your notifications',
      image: require('../../assets/images/messages-scene.jpg'),
      screen: 'Notifications',
    },
    {
      title: 'My Profile',
      subtitle: 'Account settings & password',
      image: require('../../assets/images/shift-history-scene.jpg'),
      screen: 'Profile',
    },
  ];

  const managementItems = [];

  const adminItem = {
    title: 'Admin Panel',
    subtitle: 'Manage users, sites, reports & more',
    image: require('../../assets/images/create-schedule-scene.jpg'),
    screen: 'Admin',
  };

  const allItems = canAccessManagement() ? [...menuItems, ...managementItems, adminItem] : menuItems;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user ? `${user.firstName} ${user.lastName}` : 'User'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Security Officer'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Clock Status Banner */}
      <TouchableOpacity
        style={[styles.clockBanner, clockedIn ? styles.clockBannerIn : styles.clockBannerOut]}
        onPress={() => navigation.navigate('ClockInOut')}
      >
        <Text style={styles.clockBannerText}>
          {clockedIn ? '🟢 CLOCKED IN' : '🔴 CLOCKED OUT'}
        </Text>
        {clockedIn && shiftSite ? (
          <Text style={styles.clockBannerSite}>{shiftSite} — Tap to manage</Text>
        ) : (
          <Text style={styles.clockBannerSite}>Tap to clock in</Text>
        )}
      </TouchableOpacity>

      {/* Menu Items */}
      <View style={styles.menuList}>
        {allItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuCard}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.85}
          >
            <ImageBackground
              source={item.image}
              style={styles.imageBackground}
              imageStyle={styles.imageStyle}
              resizeMode="cover"
            >
              <View style={styles.cardOverlay}>
                <View style={styles.cardContent}>
                  <View style={styles.textContainer}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.arrow}>›</Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>TuffGuard Security</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: { fontSize: 14, color: '#999' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  userRole: { fontSize: 13, color: '#4CAF50', marginTop: 2 },
  logoutButton: { backgroundColor: '#f44336', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  logoutButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  menuList: { padding: 16, gap: 12 },
  menuCard: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  imageBackground: { width: '100%', height: '100%' },
  imageStyle: { borderRadius: 12 },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: { flex: 1 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  menuSubtitle: { fontSize: 13, color: '#bbb', marginTop: 2 },
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  arrow: { color: '#fff', fontSize: 28, fontWeight: '300' },
  footer: { padding: 20, alignItems: 'center' },
  clockBanner: { marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 14, alignItems: 'center' },
  clockBannerIn: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#4CAF50' },
  clockBannerOut: { backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: '#f44336' },
  clockBannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clockBannerSite: { color: '#999', fontSize: 12, marginTop: 3 },
  footerText: { color: '#444', fontSize: 12 },
});

export default HomeScreen;
