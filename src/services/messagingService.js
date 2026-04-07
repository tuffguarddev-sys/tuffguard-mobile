import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './socketService';
import { sendMessageToAPI, getAllUsers } from './api'; // Add this line

// Send message with optional attachment and priority
export const sendMessage = async (
  fromUser,
  toUser,
  message,
  isGroupMessage = false,
  attachment = null,
  priority = 'normal',
) => {
  try {
    console.log('=== SENDING MESSAGE ===');
    console.log('From:', fromUser);
    console.log('To:', toUser);
    console.log('Message:', message);
    console.log('Priority:', priority);
    console.log('Has Attachment:', !!attachment);

    // Get recipient's user ID from backend
    console.log('🔍 Fetching users to find recipient ID...');
    const users = await getAllUsers();
    const recipient = users.find(
      u =>
        `${u.firstName} ${u.lastName}` === toUser ||
        u.email === toUser.toLowerCase().replace(/\s+/g, '') + '@tuffguard.com',
    );

    if (!recipient) {
      console.error('⚠️ Could not find user ID for:', toUser);
      throw new Error(`Recipient ${toUser} not found`);
    }

    console.log(
      '✅ Found recipient:',
      recipient.firstName,
      recipient.lastName,
      '(ID:',
      recipient.id,
      ')',
    );

    // Send message to backend API
    console.log('📤 Sending message to backend API...');
    const apiResponse = await sendMessageToAPI(
      recipient.id,
      message,
      '', // subject (optional)
      priority,
    );

    console.log('✅ Message sent to backend API!');
    console.log('📨 API Response:', apiResponse);

    // Create message object for local storage (backup)
    const newMessage = {
      id: apiResponse.message?.id || Date.now(),
      from: fromUser,
      to: toUser,
      message,
      timestamp: apiResponse.message?.createdAt || new Date().toISOString(),
      read: false,
      isGroupMessage,
      attachment,
      priority,
      reactions: [],
      edited: false,
      editedAt: null,
    };

    // Save to local storage as backup
    const messagesData = await AsyncStorage.getItem('messages');
    const messages = messagesData ? JSON.parse(messagesData) : [];
    messages.push(newMessage);
    await AsyncStorage.setItem('messages', JSON.stringify(messages));

    console.log('💾 Message saved locally! ID:', newMessage.id);

    // Emit via Socket.io for real-time delivery
    if (socketService.socket && socketService.socket.connected) {
      console.log('📡 Emitting message via Socket.io...');
      socketService.socket.emit('send_message', {
        recipientId: recipient.id,
        content: message,
        priority,
      });
      console.log('✅ Message emitted via Socket.io');
    }

    return newMessage;
  } catch (error) {
    console.error('=== ERROR SENDING MESSAGE ===');
    console.error('Error:', error);

    // Queue message for retry if API fails
    await queueOfflineMessage({
      fromUser,
      toUser,
      message,
      isGroupMessage,
      attachment,
      priority,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
};

// Add reaction to message
export const addReaction = async (messageId, userId, emoji) => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const messages = messagesData ? JSON.parse(messagesData) : [];

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const filteredReactions = reactions.filter(r => r.userId !== userId);
        filteredReactions.push({
          userId,
          emoji,
          timestamp: new Date().toISOString(),
        });
        return { ...msg, reactions: filteredReactions };
      }
      return msg;
    });

    await AsyncStorage.setItem('messages', JSON.stringify(updatedMessages));
    return true;
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

// Remove reaction
export const removeReaction = async (messageId, userId) => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const messages = messagesData ? JSON.parse(messagesData) : [];

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = (msg.reactions || []).filter(
          r => r.userId !== userId,
        );
        return { ...msg, reactions };
      }
      return msg;
    });

    await AsyncStorage.setItem('messages', JSON.stringify(updatedMessages));
    return true;
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
};

// Edit message
export const editMessage = async (messageId, newText) => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const messages = messagesData ? JSON.parse(messagesData) : [];

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          message: newText,
          edited: true,
          editedAt: new Date().toISOString(),
        };
      }
      return msg;
    });

    await AsyncStorage.setItem('messages', JSON.stringify(updatedMessages));
    return true;
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};

// Delete message
export const deleteMessage = async messageId => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const messages = messagesData ? JSON.parse(messagesData) : [];

    const updatedMessages = messages.filter(msg => msg.id !== messageId);

    await AsyncStorage.setItem('messages', JSON.stringify(updatedMessages));
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Search messages
export const searchMessages = async (username, searchTerm) => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const allMessages = messagesData ? JSON.parse(messagesData) : [];

    const userMessages = allMessages.filter(
      msg =>
        msg.from === username ||
        msg.to === username ||
        msg.to === 'All Employees',
    );

    const searchResults = userMessages.filter(
      msg =>
        msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.to.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return searchResults.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
  } catch (error) {
    console.error('Error searching messages:', error);
    return [];
  }
};

// Store typing status
export const setTypingStatus = async (fromUser, toUser, isTyping) => {
  try {
    const typingData = await AsyncStorage.getItem('typingStatus');
    const typingStatus = typingData ? JSON.parse(typingData) : {};

    const key = `${fromUser}-${toUser}`;
    if (isTyping) {
      typingStatus[key] = {
        from: fromUser,
        to: toUser,
        timestamp: Date.now(),
      };
    } else {
      delete typingStatus[key];
    }

    await AsyncStorage.setItem('typingStatus', JSON.stringify(typingStatus));
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};

// Get typing status
export const getTypingStatus = async (fromUser, toUser) => {
  try {
    const typingData = await AsyncStorage.getItem('typingStatus');
    const typingStatus = typingData ? JSON.parse(typingData) : {};

    const key = `${toUser}-${fromUser}`;
    const status = typingStatus[key];

    if (status && Date.now() - status.timestamp < 5000) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error getting typing status:', error);
    return false;
  }
};

// Queue message for offline sending
export const queueOfflineMessage = async messageData => {
  try {
    const queueData = await AsyncStorage.getItem('messageQueue');
    const queue = queueData ? JSON.parse(queueData) : [];

    queue.push({
      ...messageData,
      queuedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem('messageQueue', JSON.stringify(queue));
  } catch (error) {
    console.error('Error queuing message:', error);
  }
};

// Process offline queue
export const processOfflineQueue = async () => {
  try {
    const queueData = await AsyncStorage.getItem('messageQueue');
    const queue = queueData ? JSON.parse(queueData) : [];

    if (queue.length === 0) return 0;

    for (const messageData of queue) {
      await sendMessage(
        messageData.from,
        messageData.to,
        messageData.message,
        messageData.isGroupMessage,
        messageData.attachment,
        messageData.priority,
      );
    }

    await AsyncStorage.setItem('messageQueue', JSON.stringify([]));

    return queue.length;
  } catch (error) {
    console.error('Error processing offline queue:', error);
    return 0;
  }
};

export const getMessages = async username => {
  try {
    console.log('=== GETTING MESSAGES ===');
    console.log('For user:', username);

    const messagesData = await AsyncStorage.getItem('messages');
    const allMessages = messagesData ? JSON.parse(messagesData) : [];

    console.log('Total messages in storage:', allMessages.length);

    const userMessages = allMessages.filter(
      msg =>
        msg.from === username ||
        msg.to === username ||
        msg.to === 'All Employees',
    );

    console.log('Messages for this user:', userMessages.length);

    return userMessages.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
  } catch (error) {
    console.error('=== ERROR GETTING MESSAGES ===');
    console.error('Error:', error);
    return [];
  }
};

export const getConversation = async (user1, user2) => {
  try {
    console.log('=== GETTING CONVERSATION ===');
    console.log('Between:', user1, 'and', user2);

    const messagesData = await AsyncStorage.getItem('messages');
    const allMessages = messagesData ? JSON.parse(messagesData) : [];

    const conversation = allMessages.filter(
      msg =>
        (msg.from === user1 && msg.to === user2) ||
        (msg.from === user2 && msg.to === user1),
    );

    console.log('Conversation messages:', conversation.length);

    return conversation.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );
  } catch (error) {
    console.error('=== ERROR GETTING CONVERSATION ===');
    console.error('Error:', error);
    return [];
  }
};

export const markMessageAsRead = async messageId => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const messages = messagesData ? JSON.parse(messagesData) : [];

    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? { ...msg, read: true } : msg,
    );

    await AsyncStorage.setItem('messages', JSON.stringify(updatedMessages));
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

export const getUnreadCount = async username => {
  try {
    const messagesData = await AsyncStorage.getItem('messages');
    const allMessages = messagesData ? JSON.parse(messagesData) : [];

    const unreadMessages = allMessages.filter(
      msg => (msg.to === username || msg.to === 'All Employees') && !msg.read,
    );

    return unreadMessages.length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};
