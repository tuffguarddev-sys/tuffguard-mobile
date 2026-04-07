import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

     async connect(token = null) {
    // Prevent duplicate connections
    if (this.socket && this.socket.connected) {
      console.log('⚡ Socket already connected, skipping');
      return true;
    }

      // Clean up any dead socket before reconnecting
    if (this.socket && !this.socket.connected) {
      console.log('🧹 Cleaning up dead socket...');
      this.socket.removeAllListeners();
      this.socket = null;
      this.connected = false;
    }

    try {
      console.log('🔌 Socket.io attempting to connect...');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      console.log('🔑 Token for Socket:', token ? 'YES ✅' : 'NO ❌');

      if (!token) {
        console.error('❌ No auth token found, aborting socket connect');
        return false;
      }


      console.log('🌐 Connecting to http://192.168.0.172:3000...');
      this.socket = io('http://192.168.0.172:3000', {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.io connected:', this.socket.id);
        this.connected = true;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.io connection error:', error.message);
        this.connected = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket.io disconnected:', reason);
        this.connected = false;
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconnected after ${attemptNumber} attempts`);
        this.connected = true;
      });

      return true;
    } catch (error) {
      console.error('❌ Socket connection error:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 Socket disconnected');
    }
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  sendMessage(recipientId, subject, body, priority = 'normal') {
    if (!this.isConnected()) {
      console.error('❌ Socket not connected');
      return false;
    }
    this.socket.emit('message:send', { recipientId, subject, body, priority });
    return true;
  }

  onNewMessage(callback) {
    if (!this.socket) return;
    this.socket.on('message:new', callback);
    this.listeners.set('message:new', callback);
  }

  onMessageSent(callback) {
    if (!this.socket) return;
    this.socket.on('message:sent', callback);
    this.listeners.set('message:sent', callback);
  }

  onMessageError(callback) {
    if (!this.socket) return;
    this.socket.on('message:error', callback);
    this.listeners.set('message:error', callback);
  }

  onUserOnline(callback) {
    if (!this.socket) return;
    this.socket.on('user:online', callback);
    this.listeners.set('user:online', callback);
  }

  onUserOffline(callback) {
    if (!this.socket) return;
    this.socket.on('user:offline', callback);
    this.listeners.set('user:offline', callback);
  }

  onUsersOnline(callback) {
    if (!this.socket) return;
    this.socket.on('users:online', callback);
    this.listeners.set('users:online', callback);
  }

  onTyping(callback) {
    if (!this.socket) return;
    this.socket.on('typing:user', callback);
    this.listeners.set('typing:user', callback);
  }

  startTyping(recipientId) {
    if (!this.isConnected()) return;
    this.socket.emit('typing:start', { recipientId });
  }

  stopTyping(recipientId) {
    if (!this.isConnected()) return;
    this.socket.emit('typing:stop', { recipientId });
  }

  markAsRead(messageId, senderId) {
    if (!this.isConnected()) return;
    this.socket.emit('message:read', { messageId, senderId });
  }

  onMessageRead(callback) {
    if (!this.socket) return;
    this.socket.on('message:read:confirm', callback);
    this.listeners.set('message:read:confirm', callback);
  }

  sendLocationUpdate(shiftId, latitude, longitude) {
    if (!this.isConnected()) {
      console.log('⚠️ Socket not connected, location not sent');
      return false;
    }
    this.socket.emit('location:update', {
      shiftId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  onLocationUpdate(callback) {
    if (!this.socket) return;
    this.socket.on('location:guard', callback);
    this.listeners.set('location:guard', callback);
  }

  removeAllListeners() {
    if (!this.socket) return;
    this.listeners.forEach((callback, event) => {
      this.socket.off(event, callback);
    });
    this.listeners.clear();
  }

  removeListener(event) {
    if (!this.socket) return;
    const callback = this.listeners.get(event);
    if (callback) {
      this.socket.off(event, callback);
      this.listeners.delete(event);
    }
  }
}

export default new SocketService();
