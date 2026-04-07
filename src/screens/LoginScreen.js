import React, { useState } from 'react';
import {
 View,
 Text,
 TextInput,
 TouchableOpacity,
 StyleSheet,
 Alert,
 ActivityIndicator,
 Image,
 KeyboardAvoidingView,
 ScrollView,
 Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, clearAllStorage } from '../services/api';

 const LoginScreen = ({ navigation, onLogin }) => {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);

 const handleClearStorage = async () => {
 try {
 await clearAllStorage();
 Alert.alert('Success', 'Storage cleared! Please login again with fresh credentials.');
 setEmail('');
 setPassword('');
 } catch (error) {
 Alert.alert('Error', 'Failed to clear storage');
 console.error('Clear storage error:', error);
 }
 };

 const handleLogin = async () => {
 if (!email || !password) {
 Alert.alert('Error', 'Please enter email and password');
 return;
 }

 setLoading(true);
 try {
 const response = await login(email, password);

 if (response.token) {
 await AsyncStorage.setItem('token', response.token);
 await AsyncStorage.setItem('user', JSON.stringify(response.user));
 if (onLogin) onLogin();
 navigation.replace('Home');
 } else {
 Alert.alert('Error', 'Invalid credentials');
 }
 } catch (error) {
 Alert.alert('Error', 'Login failed. Please try again.');
 console.error('Login error:', error);
 } finally {
 setLoading(false);
 }
 };

 return (
 <KeyboardAvoidingView 
 style={styles.container}
 behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
 keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
 
 {/* Debug Clear Storage Button - Top Left */}
 <TouchableOpacity
 style={styles.debugButton}
 onPress={handleClearStorage}>
 <Text style={styles.debugButtonText}></Text>
 </TouchableOpacity>

 <ScrollView 
 contentContainerStyle={styles.scrollContainer}
 keyboardShouldPersistTaps="handled">
 <View style={styles.logoContainer}>
 <Image 
 source={require('../../assets/logo.png')} 
 style={styles.logo}
 resizeMode="contain"
 />
 <Text style={styles.subtitle}>Professional Security Management</Text>
 </View>

 <View style={styles.formContainer}>
 <TextInput
 style={styles.input}
 placeholder="Email"
 placeholderTextColor="#999"
 value={email}
 onChangeText={setEmail}
 autoCapitalize="none"
 autoCorrect={false}
 keyboardType="email-address"
 />

 <TextInput
 style={styles.input}
 placeholder="Password"
 placeholderTextColor="#999"
 value={password}
 onChangeText={setPassword}
 secureTextEntry
 autoCapitalize="none"
 />

 <TouchableOpacity
 style={styles.loginButton}
 onPress={handleLogin}
 disabled={loading}>
 {loading ? (
 <ActivityIndicator color="#fff" />
 ) : (
 <Text style={styles.loginButtonText}>Login</Text>
 )}
 </TouchableOpacity>
 </View>
 </ScrollView>
 </KeyboardAvoidingView>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: '#000000',
 },
 debugButton: {
 position: 'absolute',
 top: 50,
 left: 20,
 width: 50,
 height: 50,
 borderRadius: 25,
 backgroundColor: '#ff5252',
 justifyContent: 'center',
 alignItems: 'center',
 zIndex: 1000,
 elevation: 5,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.3,
 shadowRadius: 3,
 borderWidth: 2,
 borderColor: '#ff1744',
 },
 debugButtonText: {
 fontSize: 24,
 },
 scrollContainer: {
 flexGrow: 1,
 justifyContent: 'center',
 padding: 20,
 },
 logoContainer: {
 alignItems: 'center',
 marginBottom: 50,
 },
 logo: {
 width: 250,
 height: 250,
 marginBottom: 20,
 },
 subtitle: {
 fontSize: 16,
 color: '#fff',
 opacity: 0.8,
 textAlign: 'center',
 },
 formContainer: {
 backgroundColor: '#1a1a1a',
 borderRadius: 10,
 padding: 20,
 borderWidth: 1,
 borderColor: '#333',
 },
 input: {
 height: 50,
 borderWidth: 1,
 borderColor: '#444',
 backgroundColor: '#2a2a2a',
 borderRadius: 8,
 paddingHorizontal: 15,
 marginBottom: 15,
 fontSize: 16,
 color: '#fff',
 },
 loginButton: {
 backgroundColor: '#4CAF50',
 height: 50,
 borderRadius: 8,
 justifyContent: 'center',
 alignItems: 'center',
 marginTop: 10,
 },
 loginButtonText: {
 color: '#fff',
 fontSize: 18,
 fontWeight: 'bold',
 },
});

export default LoginScreen;
