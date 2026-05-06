import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import socketService from './services/socketService';
import { checkForUpdate, startPeriodicUpdateCheck, stopPeriodicUpdateCheck } from './services/updateService';
import { registerForPushNotifications, setupNotificationListeners } from './services/notificationService';

// Import screens - FIXED: Added ./src/ prefix to all imports
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import IncidentScreen from './src/screens/IncidentScreen';
import ReportIncident from './src/components/ReportIncident';
import ClockInOut from './src/components/ClockInOut';
import ShiftHistory from './src/screens/ShiftHistory';
import Schedule from './src/screens/Schedule';
import CreateSchedule from './src/screens/CreateSchedule';
import CreateRecurringSchedule from './src/screens/CreateRecurringSchedule';
import CalendarSchedule from './src/screens/CalendarSchedule';
import MessagingScreen from './src/screens/MessagingScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import NewMessageScreen from './src/screens/NewMessageScreen';
import ShiftReportsScreen from './src/screens/ShiftReportsScreen';
import SitesScreen from './src/screens/SitesScreen';
import AdminScreen from './src/screens/AdminScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TimeOffScreen from './src/screens/TimeOffScreen';
import AdminUsers from './src/screens/AdminUsers';
import AdminSites from './src/screens/AdminSites';
import AdminSchedule from './src/screens/AdminSchedule';
import AdminIncidents from './src/screens/AdminIncidents';
import AdminShiftReports from './src/screens/AdminShiftReports';
import AdminShiftHistory from './src/screens/AdminShiftHistory';
import EventsScreen from './src/screens/EventsScreen';

const Stack = createStackNavigator();

const App = () => {
  console.log('🚀 APP COMPONENT RENDERING');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
    checkForUpdate();
    startPeriodicUpdateCheck();
    return () => stopPeriodicUpdateCheck();
  }, []);

  useEffect(() => {
  console.log('🔄 isLoggedIn changed:', isLoggedIn);
  if (isLoggedIn) {
    socketService.connect().then((result) => {
      console.log('✅ Socket initialization complete, result:', result);
    }).catch(err => {
      console.error('❌ Socket initialization failed:', err);
    });
    // Register for push notifications
    registerForPushNotifications();
  } else {
    console.log('🔌 Calling disconnect because isLoggedIn is false');
    socketService.disconnect();
  }
}, [isLoggedIn]);

  const checkLoginStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('🔍 checkLoginStatus - token found:', !!token);
    if (token) {
      setIsLoggedIn(true);
    }
  } catch (error) {
    console.error('Error checking login status:', error);
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#888" />
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#888',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ 
            title: 'Security Dashboard',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Incidents" 
          component={IncidentScreen}
          options={{ title: 'Incident Reports' }}
        />
        <Stack.Screen 
          name="Report" 
          component={ReportIncident}
          options={{ title: 'Report Incident' }}
        />
        <Stack.Screen 
          name="ClockInOut" 
          component={ClockInOut}
          options={{ 
            title: 'Clock In/Out',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="ShiftHistory" 
          component={ShiftHistory}
          options={{ 
            title: 'Shift History',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Schedule" 
          component={CalendarSchedule}
          options={{ 
            title: 'Schedule',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="CalendarSchedule" 
          component={CalendarSchedule}
          options={{ 
            title: 'Schedule',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="CreateSchedule" 
          component={CreateSchedule}
          options={{ 
            title: 'Create Schedule',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="CreateRecurringSchedule" 
          component={CreateRecurringSchedule}
          options={{ 
            title: 'Recurring Schedule',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Messaging" 
          component={MessagingScreen}
          options={{ 
            title: 'Messages',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Conversation" 
          component={ConversationScreen}
          options={{ 
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="NewMessage" 
          component={NewMessageScreen}
          options={{ 
            title: 'New Message',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="ShiftReports" 
          component={ShiftReportsScreen}
          options={{ 
            title: 'Shift Reports',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Sites" 
          component={SitesScreen}
          options={{ 
            title: 'Security Sites',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ 
            title: 'Admin Panel',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="CheckIn" 
          component={CheckInScreen}
          options={{ 
            title: 'Check In',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ 
            title: 'My Profile',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{ 
            title: 'Notifications',
            headerTitleStyle: {
              color: '#000000',
              fontWeight: 'bold',
            }
          }}
        />
        <Stack.Screen 
          name="TimeOff" 
          component={TimeOffScreen}
          options={{ title: 'Time Off Requests', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }}
        />
        <Stack.Screen name="AdminUsers" component={AdminUsers} options={{ title: 'Manage Users', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminSites" component={AdminSites} options={{ title: 'Manage Sites', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminSchedule" component={AdminSchedule} options={{ title: 'Schedules', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminIncidents" component={AdminIncidents} options={{ title: 'All Incidents', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminShiftReports" component={AdminShiftReports} options={{ title: 'Shift Reports', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminShiftHistory" component={AdminShiftHistory} options={{ title: 'Shift History', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'My Events', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
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
});

export default App;

