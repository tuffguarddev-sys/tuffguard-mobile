import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 TextInput,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 Alert,
 Platform,
 Modal,
 Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, queueOfflineMessage } from '../services/messagingService';
import { sendImmediateNotification } from '../services/notificationService';

const ALL_USERS = [
 'Select recipient...',
 'Jacob Mcclinton',
 'Joe Roberts',
 'Rodriques Williams',
 'Scottie Billie',
 'Brandon Abercrombie',
 'Sharon Bell',
 'Preston Byrd',
 'Richard Embrey',
 'Thomas Hudnalll',
 'Tery Kennedy',
 'Michel Lovelace',
 'Phillip Mckee',
 'Ashley Ray',
 'Russell Trotter',
 'Jessie West',
];

const MESSAGE_TEMPLATES = [
 '10-4 (Acknowledged)',
 'On my way',
 'All clear',
 'Need backup',
 'Situation under control',
 'Checking now',
 'Will report back',
 'Emergency - respond ASAP',
 'Patrol complete',
 'Incident reported',
];

const NewMessageScreen = ({ route, navigation }) => {
 const { currentUser } = route.params;
  const insets = useSafeAreaInsets();
 const [recipient, setRecipient] = useState('Select recipient...');
 const [message, setMessage] = useState('');
 const [sending, setSending] = useState(false);
 const [userCategory, setUserCategory] = useState('');
 const [priority, setPriority] = useState('normal');
 const [selectedImage, setSelectedImage] = useState(null);
 const [showTemplates, setShowTemplates] = useState(false);

 useEffect(() => {
 loadUserCategory();
 }, []);

 const loadUserCategory = async () => {
 try {
 const userData = await AsyncStorage.getItem('user');
 if (userData) {
 const user = JSON.parse(userData);
 setUserCategory(user.category);
 }
 } catch (error) {
 console.error('Error loading user category:', error);
 }
 };

 const canBroadcast = () => {
 return ['DEV', 'BOSS', 'Management'].includes(userCategory);
 };

 const pickImage = async () => {
 try {
 const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
 
 if (status !== 'granted') {
 Alert.alert('Permission Required', 'Please grant camera roll permissions to attach images.');
 return;
 }

 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: ImagePicker.MediaTypeOptions.Images,
 allowsEditing: true,
 aspect: [4, 3],
 quality: 0.7,
 });

 if (!result.canceled) {
 setSelectedImage(result.assets);
 }
 } catch (error) {
 console.error('Error picking image:', error);
 Alert.alert('Error', 'Failed to pick image');
 }
 };

 const takePhoto = async () => {
 try {
 const { status } = await ImagePicker.requestCameraPermissionsAsync();
 
 if (status !== 'granted') {
 Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
 return;
 }

 const result = await ImagePicker.launchCameraAsync({
 allowsEditing: true,
 aspect: [4, 3],
 quality: 0.7,
 });

 if (!result.canceled) {
 setSelectedImage(result.assets);
 }
 } catch (error) {
 console.error('Error taking photo:', error);
 Alert.alert('Error', 'Failed to take photo');
 }
 };

 const handleAttachment = () => {
 Alert.alert(
 'Add Attachment',
 'Choose an option',
 [
 { text: 'Take Photo', onPress: takePhoto },
 { text: 'Choose from Library', onPress: pickImage },
 { text: 'Cancel', style: 'cancel' },
 ]
 );
 };

 const insertTemplate = (template) => {
 setMessage(template);
 setShowTemplates(false);
 };

 const handleSend = async () => {
 if (recipient === 'Select recipient...') {
 Alert.alert('Error', 'Please select a recipient');
 return;
 }
 if (!message.trim() && !selectedImage) {
 Alert.alert('Error', 'Please enter a message or attach an image');
 return;
 }

 setSending(true);
 
 try {
 const attachment = selectedImage ? {
 type: 'image',
 uri: selectedImage.uri,
 name: `image_${Date.now()}.jpg`,
 } : null;

 const messageText = message.trim() || (selectedImage ? ' Photo' : '');

 await sendMessage(
 currentUser,
 recipient,
 messageText,
 recipient === 'All Employees',
 attachment,
 priority
 );

 try {
 const notifMessage = selectedImage 
 ? ' Sent a photo' 
 : messageText;
 
 const priorityPrefix = priority === 'urgent' 
 ? ' URGENT: ' 
 : priority === 'high' 
 ? ' HIGH PRIORITY: ' 
 : '';

 await sendImmediateNotification(
 `${priorityPrefix}New message from ${currentUser}`,
 notifMessage,
 { from: currentUser, to: recipient, priority }
 );
 } catch (notifError) {
 console.log('Notification not sent:', notifError.message);
 }

 Alert.alert(
 'Success',
 'Message sent successfully',
 [{ text: 'OK', onPress: () => navigation.goBack() }]
 );
 } catch (error) {
 console.error('Error sending message:', error);
 
 Alert.alert(
 'Connection Error',
 'Message will be sent when connection is restored',
 [
 {
 text: 'OK',
 onPress: async () => {
 const attachment = selectedImage ? {
 type: 'image',
 uri: selectedImage.uri,
 name: `image_${Date.now()}.jpg`,
 } : null;

 await queueOfflineMessage({
 from: currentUser,
 to: recipient,
 message: message.trim() || ' Photo',
 isGroupMessage: recipient === 'All Employees',
 attachment,
 priority,
 });
 
 navigation.goBack();
 },
 },
 ]
 );
 } finally {
 setSending(false);
 }
 };

 const getAvailableRecipients = () => {
 let recipients = ALL_USERS.filter(user => user !== currentUser);
 if (canBroadcast()) {
 recipients = ['Select recipient...', 'All Employees', ...recipients.slice(1)];
 }
 return recipients;
 };

 const availableRecipients = getAvailableRecipients();

 const getPriorityColor = () => {
 switch (priority) {
 case 'urgent': return '#f44336';
 case 'high': return '#ff9800';
 default: return '#4CAF50';
 }
 };

 const getPriorityLabel = () => {
 switch (priority) {
 case 'urgent': return ' URGENT';
 case 'high': return ' HIGH PRIORITY';
 default: return ' NORMAL';
 }
 };

 return (
 <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }} style={styles.container}>
 <View style={styles.form}>
 <Text style={styles.label}>To: *</Text>
 <View style={styles.pickerContainer}>
 <Picker
 selectedValue={recipient}
 onValueChange={(itemValue) => setRecipient(itemValue)}
 style={styles.picker}
 dropdownIconColor="#fff">
 {availableRecipients.map((user, index) => (
 <Picker.Item
 key={index}
 label={user}
 value={user}
 color={Platform.OS === 'android' ? '#000' : '#000'}
 />
 ))}
 </Picker>
 </View>

 {recipient === 'All Employees' && canBroadcast() && (
 <View style={styles.broadcastNotice}>
 <Text style={styles.broadcastNoticeText}>
 This message will be sent to all employees
 </Text>
 </View>
 )}

 <Text style={styles.label}>Priority:</Text>
 <View style={styles.priorityContainer}>
 <TouchableOpacity
 style={[
 styles.priorityButton,
 priority === 'normal' && styles.priorityButtonActive,
 { borderColor: '#4CAF50' },
 ]}
 onPress={() => setPriority('normal')}>
 <Text style={styles.priorityButtonText}> Normal</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[
 styles.priorityButton,
 priority === 'high' && styles.priorityButtonActive,
 { borderColor: '#ff9800' },
 ]}
 onPress={() => setPriority('high')}>
 <Text style={styles.priorityButtonText}> High</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[
 styles.priorityButton,
 priority === 'urgent' && styles.priorityButtonActive,
 { borderColor: '#f44336' },
 ]}
 onPress={() => setPriority('urgent')}>
 <Text style={styles.priorityButtonText}> Urgent</Text>
 </TouchableOpacity>
 </View>

 <TouchableOpacity
 style={styles.templateButton}
 onPress={() => setShowTemplates(true)}>
 <Text style={styles.templateButtonText}> Quick Messages</Text>
 </TouchableOpacity>

 <Text style={styles.label}>Message: *</Text>
 <TextInput
 style={[styles.input, styles.textArea]}
 value={message}
 onChangeText={setMessage}
 placeholder="Type your message here..."
 placeholderTextColor="#666"
 multiline
 numberOfLines={10}
 maxLength={1000}
 />
 <Text style={styles.characterCount}>{message.length}/1000 characters</Text>

 {selectedImage && (
 <View style={styles.imagePreview}>
 <Image
 source={{ uri: selectedImage.uri }}
 style={styles.previewImage}
 resizeMode="cover"
 />
 <TouchableOpacity
 style={styles.removeImageButton}
 onPress={() => setSelectedImage(null)}>
 <Text style={styles.removeImageText}> Remove</Text>
 </TouchableOpacity>
 </View>
 )}

 <TouchableOpacity
 style={styles.attachmentButton}
 onPress={handleAttachment}>
 <Text style={styles.attachmentButtonText}>
 {selectedImage ? 'Change Attachment' : 'Add Attachment'}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[
 styles.sendButton,
 sending && styles.sendButtonDisabled,
 { backgroundColor: getPriorityColor() },
 ]}
 onPress={handleSend}
 disabled={sending}>
 <Text style={styles.sendButtonText}>
 {sending ? 'Sending...' : `Send ${getPriorityLabel()} Message`}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={styles.cancelButton}
 onPress={() => navigation.goBack()}>
 <Text style={styles.cancelButtonText}>Cancel</Text>
 </TouchableOpacity>
 </View>

 <Modal
 visible={showTemplates}
 transparent={true}
 animationType="slide"
 onRequestClose={() => setShowTemplates(false)}>
 <View style={styles.modalOverlay}>
 <View style={styles.modalContent}>
 <View style={styles.modalHeader}>
 <Text style={styles.modalTitle}>Quick Messages</Text>
 <TouchableOpacity onPress={() => setShowTemplates(false)}>
 <Text style={styles.modalClose}></Text>
 </TouchableOpacity>
 </View>
 
 <ScrollView style={styles.templateList}>
 {MESSAGE_TEMPLATES.map((template, index) => (
 <TouchableOpacity
 key={index}
 style={styles.templateItem}
 onPress={() => insertTemplate(template)}>
 <Text style={styles.templateText}>{template}</Text>
 </TouchableOpacity>
 ))}
 </ScrollView>
 </View>
 </View>
 </Modal>
 </ScrollView>
 );
};

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#000000' },
 form: { padding: 20 },
 label: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8, marginTop: 15 },
 pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 8, overflow: 'hidden' },
 picker: { color: '#000', backgroundColor: '#fff' },
 broadcastNotice: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, marginTop: 10 },
 broadcastNoticeText: { color: '#fff', fontSize: 14, textAlign: 'center' },
 priorityContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
 priorityButton: { flex: 1, backgroundColor: '#1a1a1a', borderWidth: 2, borderRadius: 8, padding: 12, alignItems: 'center' },
 priorityButtonActive: { backgroundColor: '#333' },
 priorityButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
 templateButton: { backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
 templateButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
 input: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, fontSize: 16, color: '#fff' },
 textArea: { height: 200, textAlignVertical: 'top' },
 characterCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 5 },
 imagePreview: { marginTop: 15, position: 'relative' },
 previewImage: { width: '100%', height: 200, borderRadius: 10 },
 removeImageButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f44336', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
 removeImageText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
 attachmentButton: { backgroundColor: '#666', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
 attachmentButtonText: {
 color: '#fff', fontSize: 16, fontWeight: 'bold' },
 sendButton: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
 sendButtonDisabled: { backgroundColor: '#666' },
 sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
 cancelButton: { backgroundColor: '#666', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 30 },
 cancelButtonText: { color: '#fff', fontSize: 16 },
 modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
 modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
 modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
 modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
 modalClose: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
 templateList: { padding: 15 },
 templateItem: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 15, marginBottom: 10 },
 templateText: { color: '#fff', fontSize: 15 },
});

export default NewMessageScreen;
