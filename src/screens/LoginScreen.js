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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login } from '../services/api';

 const LoginScreen = ({ navigation, onLogin }) => {
 const insets = useSafeAreaInsets();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);

 

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
 style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
 behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
 keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
 


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
 <Text style={styles.forgotText}>Forgot password? Contact your manager.</Text>
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
 forgotText: {
 color: '#999',
 fontSize: 13,
 textAlign: 'center',
 marginTop: 15,
 },
});

export default LoginScreen;
