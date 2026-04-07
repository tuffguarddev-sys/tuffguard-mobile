import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 TextInput,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
 sendMessage,
 getMessages,
 clearAllMessages,
 getUnreadCount,
 searchMessages,
} from '../services/messagingService';

const TestMessaging = ({ navigation }) => {
 const [fromUser, setFromUser] = useState('Jacob Mcclinton');
 const [toUser, setToUser] = useState('Joe Roberts');
 const [message, setMessage] = useState('');
 const [priority, setPriority] = useState('normal');
 const [allMessages, setAllMessages] = useState([]);
 const [stats, setStats] = useState({});

 useEffect(() => {
 loadStats();
 }, []);

 const loadStats = async () => {
 try {
 const messagesData = await AsyncStorage.getItem('messages');
 const messages = messagesData ? JSON.parse(messagesData) : [];
 
 const unreadCount = messages.filter(m => !m.read).length;
 const withAttachments = messages.filter(m => m.attachment).length;
 const priorityCount = messages.filter(m => m.priority !== 'normal').length;
 
 setStats({
 total: messages.length,
 unread: unreadCount,
 attachments: withAttachments,
 priority: priorityCount,
 });
 
 setAllMessages(messages.slice(0, 10)); // Show last 10
 } catch (error) {
 console.error('Error loading stats:', error);
 }
 };

 const handleSendTest = async () => {
 if (!message.trim()) {
 Alert.alert('Error', 'Please enter a message');
 return;
 }

 try {
 await sendMessage(fromUser, toUser, message, false, null, priority);
 Alert.alert('Success', 'Test message sent!');
 setMessage('');
 await loadStats();
 } catch (error) {
 Alert.alert('Error', 'Failed to send message: ' + error.message);
 }
 };

 const handleClearAll = () => {
 Alert.alert(
 'Clear All Messages',
 'Are you sure you want to delete ALL messages? This cannot be undone!',
 [
 { text: 'Cancel', style: 'cancel' },
 {
 text: 'Delete All',
 style: 'destructive',
 onPress: async () => {
 try {
 await AsyncStorage.removeItem('messages');
 await AsyncStorage.removeItem('typingStatus');
 await AsyncStorage.removeItem('messageQueue');
 Alert.alert('Success', 'All messages cleared!');
 await loadStats();
 } catch (error) {
 Alert.alert('Error', 'Failed to clear messages');
 }
 },
 },
 ]
 );
 };

 const handleSendBulkTest = async () => {
 try {
 const testMessages = [
 { from: 'Jacob Mcclinton', to: 'Joe Roberts', msg: 'Test message 1', priority: 'normal' },
 { from: 'Joe Roberts', to: 'Jacob Mcclinton', msg: 'Test reply 1', priority: 'normal' },
 { from: 'Rodriques Williams', to: 'Jacob Mcclinton', msg: 'Urgent test!', priority: 'urgent' },
 { from: 'Jacob Mcclinton', to: 'All Employees', msg: 'Broadcast test', priority: 'high' },
 { from: 'Brandon Abercrombie', to: 'Jacob Mcclinton', msg: 'Regular message', priority: 'normal' },
 ];

 for (const test of testMessages) {
 await sendMessage(test.from, test.to, test.msg, test.to === 'All Employees', null, test.priority);
 }

 Alert.alert('Success', `${testMessages.length} test messages created!`);
 await loadStats();
 } catch (error) {
 Alert.alert('Error', 'Failed to create test messages');
 }
 };

 return (
 <ScrollView style={styles.container}>
 <View style={styles.header}>
 <Text style={styles.title}> Messaging Test Console</Text>
 </View>

 {/* Statistics */}
 <View style={styles.statsContainer}>
 <Text style={styles.sectionTitle}> Statistics</Text>
 <View style={styles.statsGrid}>
 <View style={styles.statCard}>
 <Text style={styles.statValue}>{stats.total || 0}</Text>
 <Text style={styles.statLabel}>Total Messages</Text>
 </View>
 <View style={styles.statCard}>
 <Text style={styles.statValue}>{stats.unread || 0}</Text>
 <Text style={styles.statLabel}>Unread</Text>
 </View>
 <View style={styles.statCard}>
 <Text style={styles.statValue}>{stats.attachments || 0}</Text>
 <Text style={styles.statLabel}>Attachments</Text>
 </View>
 <View style={styles.statCard}>
 <Text style={styles.statValue}>{stats.priority || 0}</Text>
 <Text style={styles.statLabel}>Priority</Text>
 </View>
 </View>
 </View>

 {/* Send Test Message */}
 <View style={styles.section}>
 <Text style={styles.sectionTitle}> Send Test Message</Text>
 
 <Text style={styles.label}>From:</Text>
 <TextInput
 style={styles.input}
 value={fromUser}
 onChangeText={setFromUser}
 placeholder="From user"
 placeholderTextColor="#666"
 />

 <Text style={styles.label}>To:</Text>
 <TextInput
 style={styles.input}
 value={toUser}
 onChangeText={setToUser}
 placeholder="To user"
 placeholderTextColor="#666"
 />

 <Text style={styles.label}>Message:</Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={message}
 onChangeText={setMessage}
 placeholder="Type test message..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={4}
 />

 <Text style={styles.label}>Priority:</Text>
 <View style={styles.priorityButtons}>
 {['normal', 'high', 'urgent'].map((p) => (
 <TouchableOpacity
 key={p}
 style={[
 styles.priorityButton,
 priority === p && styles.priorityButtonActive,
 ]}
 onPress={() => setPriority(p)}>
 <Text style={styles.priorityButtonText}>
 {p === 'urgent' ? '' : p === 'high' ? '' : ''} {p.toUpperCase()}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 <TouchableOpacity style={styles.button} onPress={handleSendTest}>
 <Text style={styles.buttonText}>Send Test Message</Text>
 </TouchableOpacity>
 </View>

 {/* Quick Actions */}
 <View style={styles.section}>
 <Text style={styles.sectionTitle}> Quick Actions</Text>
 
 <TouchableOpacity
 style={[styles.button, styles.secondaryButton]}
 onPress={handleSendBulkTest}>
 <Text style={styles.buttonText}>Create 5 Test Messages</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[styles.button, styles.infoButton]}
 onPress={loadStats}>
 <Text style={styles.buttonText}>Refresh Statistics</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[styles.button, styles.dangerButton]}
 onPress={handleClearAll}>
 <Text style={styles.buttonText}>Clear All Messages</Text>
 </TouchableOpacity>
 </View>

 {/* Recent Messages */}
 <View style={styles.section}>
 <Text style={styles.sectionTitle}> Recent Messages (Last 10)</Text>
 {allMessages.length === 0 ? (
 <Text style={styles.emptyText}>No messages yet</Text>
 ) : (
 allMessages.map((msg, index) => (
 <View key={msg.id} style={styles.messageCard}>
 <View style={styles.messageHeader}>
 <Text style={styles.messageFrom}>{msg.from} → {msg.to}</Text>
 <Text style={styles.messageTime}>
 {new Date(msg.timestamp).to
LocaleTimeString()}
 </Text>
 </View>
 <Text style={styles.messageText}>{msg.message}</Text>
 <View style={styles.messageFooter}>
 <Text style={styles.messageMeta}>
 {msg.priority !== 'normal' && `${msg.priority === 'urgent' ? '' : ''} ${msg.priority.toUpperCase()} `}
 {msg.read ? ' Read' : ' Unread'}
 {msg.attachment && ' '}
 {msg.reactions && msg.reactions.length > 0 && ` ${msg.reactions.map(r => r.emoji).join(' ')}`}
 </Text>
 </View>
 </View>
 ))
 )}
 </View>

 {/* Navigation */}
 <View style={styles.section}>
 <TouchableOpacity
 style={[styles.button, styles.navButton]}
 onPress={() => navigation.navigate('Messaging')}>
 <Text style={styles.buttonText}>Go to Messages</Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: '#000000',
 },
 header: {
 backgroundColor: '#1a1a1a',
 padding: 20,
 borderBottomWidth: 1,
 borderBottomColor: '#333',
 },
 title: {
 fontSize: 24,
 fontWeight: 'bold',
 color: '#fff',
 textAlign: 'center',
 },
 statsContainer: {
 padding: 15,
 backgroundColor: '#0a0a0a',
 },
 sectionTitle: {
 fontSize: 18,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 15,
 },
 statsGrid: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: 10,
 },
 statCard: {
 flex: 1,
 minWidth: '45%',
 backgroundColor: '#1a1a1a',
 padding: 15,
 borderRadius: 10,
 alignItems: 'center',
 borderWidth: 1,
 borderColor: '#333',
 },
 statValue: {
 fontSize: 32,
 fontWeight: 'bold',
 color: '#4CAF50',
 },
 statLabel: {
 fontSize: 12,
 color: '#999',
 marginTop: 5,
 },
 section: {
 padding: 15,
 borderBottomWidth: 1,
 borderBottomColor: '#1a1a1a',
 },
 label: {
 fontSize: 14,
 fontWeight: 'bold',
 color: '#fff',
 marginBottom: 8,
 marginTop: 10,
 },
 input: {
 backgroundColor: '#1a1a1a',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 padding: 12,
 fontSize: 16,
 color: '#fff',
 marginBottom: 10,
 },
 textArea: {
 height: 100,
 textAlignVertical: 'top',
 },
 priorityButtons: {
 flexDirection: 'row',
 gap: 10,
 marginBottom: 15,
 },
 priorityButton: {
 flex: 1,
 backgroundColor: '#1a1a1a',
 borderWidth: 2,
 borderColor: '#333',
 borderRadius: 8,
 padding: 10,
 alignItems: 'center',
 },
 priorityButtonActive: {
 borderColor: '#4CAF50',
 backgroundColor: '#1a3a1a',
 },
 priorityButtonText: {
 color: '#fff',
 fontSize: 12,
 fontWeight: 'bold',
 },
 button: {
 backgroundColor: '#4CAF50',
 padding: 15,
 borderRadius: 8,
 alignItems: 'center',
 marginTop: 10,
 },
 secondaryButton: {
 backgroundColor: '#2196F3',
 },
 infoButton: {
 backgroundColor: '#ff9800',
 },
 dangerButton: {
 backgroundColor: '#f44336',
 },
 navButton: {
 backgroundColor: '#9C27B0',
 },
 buttonText: {
 color: '#fff',
 fontSize: 16,
 fontWeight: 'bold',
 },
 messageCard: {
 backgroundColor: '#1a1a1a',
 borderWidth: 1,
 borderColor: '#333',
 borderRadius: 8,
 padding: 12,
 marginBottom: 10,
 },
 messageHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 marginBottom: 8,
 },
 messageFrom: {
 fontSize: 14,
 fontWeight: 'bold',
 color: '#4CAF50',
 },
 messageTime: {
 fontSize: 12,
 color: '#999',
 },
 messageText: {
 fontSize: 14,
 color: '#fff',
 marginBottom: 8,
 },
 messageFooter: {
 borderTopWidth: 1,
 borderTopColor: '#333',
 paddingTop: 8,
 },
 messageMeta: {
 fontSize: 12,
 color: '#999',
 },
 emptyText: {
 fontSize: 14,
 color: '#666',
 textAlign: 'center',
 padding: 20,
 },
});

export default TestMessaging;
