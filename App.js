import React, { useState, useEffect, useRef } from 'react';
import {
 StyleSheet,
 View,
 Text,
 StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Socket service
import socketService from './src/services/socketService';
import { setNavigationRef } from './src/services/api';

// Import screens
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
import CheckInScreen from './src/screens/CheckInScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminUsers from './src/screens/AdminUsers';
import AdminIncidents from './src/screens/AdminIncidents';
import AdminShiftReports from './src/screens/AdminShiftReports';
import AdminShiftHistory from './src/screens/AdminShiftHistory';
import AdminSites from './src/screens/AdminSites';
import AdminSchedule from './src/screens/AdminSchedule';
import AdminTracking from './src/screens/AdminTracking';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TimeOffScreen from './src/screens/TimeOffScreen';

const Stack = createStackNavigator();

const navigationRef = React.createRef();

const App = () => {
 const [isLoggedIn, setIsLoggedIn] = useState(false);
 const [loading, setLoading] = useState(true);

 console.log(' APP COMPONENT RENDERING');

 useEffect(() => {
 checkLoginStatus();
 }, []);

 // Connect socket whenever login state changes to true
 useEffect(() => {
 console.log(' isLoggedIn changed:', isLoggedIn);
 if (isLoggedIn) {
 connectSocket();
 } else {
 socketService.disconnect();
 }
 }, [isLoggedIn]);

 const connectSocket = async () => {
 try {
 const token = await AsyncStorage.getItem('token');
 if (!token) {
 console.warn(' No token found, skipping socket connect');
 return;
 }
 console.log(' Connecting socket with token...');
 socketService.connect(token);
 } catch (err) {
 console.error(' Socket connect error:', err);
 }
 };

 const checkLoginStatus = async () => {
 try {
 const token = await AsyncStorage.getItem('token');
 if (token) {
 setIsLoggedIn(true);
 }
 } catch (error) {
 console.error('Error checking login status:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleLogin = () => {
 console.log(' handleLogin called — setting isLoggedIn true');
 setIsLoggedIn(true);
 };

 const handleLogout = () => {
 console.log(' handleLogout called');
 setIsLoggedIn(false);
 };

 if (loading) {
 return (
 <View style={styles.loadingContainer}>
 <Text style={styles.loadingText}>Loading...</Text>
 </View>
 );
 }

 return (
 <NavigationContainer ref={(ref) => { setNavigationRef({ current: ref }); }}>
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
 options={{ headerShown: false }}
 >
 {props => <LoginScreen {...props} onLogin={handleLogin} />}
 </Stack.Screen>
 <Stack.Screen 
 name="Home"
 options={{ 
 title: 'Security Dashboard',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 >
 {props => <HomeScreen {...props} onLogout={handleLogout} />}
 </Stack.Screen>
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
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="ShiftHistory" 
 component={ShiftHistory}
 options={{ 
 title: 'Shift History',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="Schedule" 
 component={CalendarSchedule}
 options={{ 
 title: 'Schedule',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="CalendarSchedule" 
 component={CalendarSchedule}
 options={{ 
 title: 'Schedule',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="CreateSchedule" 
 component={CreateSchedule}
 options={{ 
 title: 'Create Schedule',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="CreateRecurringSchedule" 
 component={CreateRecurringSchedule}
 options={{ 
 title: 'Recurring Schedule',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="Messaging" 
 component={MessagingScreen}
 options={{ 
 title: 'Messages',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="Conversation" 
 component={ConversationScreen}
 options={{ 
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="NewMessage" 
 component={NewMessageScreen}
 options={{ 
 title: 'New Message',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="ShiftReports" 
 component={ShiftReportsScreen}
 options={{ 
 title: 'Shift Reports',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="Sites" 
 component={SitesScreen}
 options={{ 
 title: 'Security Sites',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
 <Stack.Screen 
 name="CheckIn" 
 component={CheckInScreen}
 options={{ 
 title: 'Check In',
 headerTitleStyle: { color: '#000000', fontWeight: 'bold' }
 }}
 />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Panel', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminUsers" component={AdminUsers} options={{ title: 'Users', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminIncidents" component={AdminIncidents} options={{ title: 'Incidents', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminShiftReports" component={AdminShiftReports} options={{ title: 'Shift Reports', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminShiftHistory" component={AdminShiftHistory} options={{ title: 'Shift History', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminSites" component={AdminSites} options={{ title: 'Sites', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminSchedule" component={AdminSchedule} options={{ title: 'Schedule', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="AdminTracking" component={AdminTracking} options={{ title: 'Live Tracking', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
        <Stack.Screen name="TimeOff" component={TimeOffScreen} options={{ title: 'Time Off Requests', headerTitleStyle: { color: '#000000', fontWeight: 'bold' } }} />
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

