// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Force clear all storage (for debugging)
export const clearAllStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('🗑️ All storage cleared');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

// Backend API URL
const API_BASE_URL = 'http://192.168.0.172:3000/api';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to make API requests
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const token = await getAuthToken();
    console.log(
      '🔑 API request to:',
      endpoint,
      'with token:',
      token ? 'YES ✅' : 'NO ❌',
    );
    if (token) {
      console.log('🔑 Token preview:', token.substring(0, 30) + '...');
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    console.log('📤 Sending request:', {
      url: `${API_BASE_URL}${endpoint}`,
      method,
      hasToken: !!token,
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error Response:', errorData);
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();
    console.log('✅ API Response successful');
    return data;
  } catch (error) {
    console.error('❌ API request error:', error);
    throw error;
  }
};

// Login function - backend only (no local fallback)
export const login = async (email, password) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    console.log('🔐 Attempting backend login with:', normalizedEmail);

    const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalizedEmail, password: trimmedPassword }),
    });

    console.log('🔄 Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      console.error('❌ Backend auth failed:', errorData);
      throw new Error(errorData.error || 'Backend authentication failed');
    }

    const data = await backendResponse.json();
    console.log('✅ Backend authentication successful');
    console.log('🔑 Received token:', data.token ? 'YES' : 'NO');

    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify({
      ...data.user,
      displayName: `${data.user.firstName} ${data.user.lastName}`,
    }));

    console.log('💾 Token and user data saved');

    return {
      token: data.token,
      user: {
        ...data.user,
        displayName: `${data.user.firstName} ${data.user.lastName}`,
      },
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

// Submit new incident with images
export const submitIncident = async incidentData => {
  try {
    const token = await getAuthToken();

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('title', incidentData.title);
    formData.append('description', incidentData.description);
    formData.append('severity', incidentData.severity || 'low');

    if (incidentData.location) {
      formData.append(
        'location',
        JSON.stringify({ address: incidentData.location }),
      );
    }

    // Add images if any
    if (incidentData.images && incidentData.images.length > 0) {
      incidentData.images.forEach((imageUri, index) => {
        const uriParts = imageUri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('images', {
          uri: imageUri,
          name: `incident_${Date.now()}_${index}.${fileType}`,
          type: `image/${fileType}`,
        });
      });
    }

    // Add videos if any
    if (incidentData.videos && incidentData.videos.length > 0) {
      incidentData.videos.forEach((videoUri, index) => {
        if (!videoUri) return;
        const uriParts = videoUri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'mp4';
        formData.append('images', {
          uri: videoUri,
          name: `incident_video_${Date.now()}_${index}.${fileType}`,
          type: `video/${fileType}`,
        });
      });
    }

    const response = await fetch(`${API_BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit incident');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting incident:', error);
    throw error;
  }
};

// Update incident status
export const updateIncidentStatus = async (incidentId, status) => {
  try {
    return await apiRequest(`/incidents/${incidentId}`, 'PUT', { status });
  } catch (error) {
    console.error('Error updating incident status:', error);
    throw error;
  }
};

// Get incident by ID
export const getIncidentById = async incidentId => {
  try {
    const response = await apiRequest(`/incidents/${incidentId}`, 'GET');
    return response.incident;
  } catch (error) {
    console.error('Error fetching incident:', error);
    throw error;
  }
};

// Get all sites
export const getSites = async () => {
  try {
    const response = await apiRequest('/sites', 'GET');
    return response.sites || response.data || [];
  } catch (error) {
    console.error('Error fetching sites:', error);
    return [];
  }
};

// Create site (admin only)
export const createSite = async siteData => {
  try {
    return await apiRequest('/sites', 'POST', siteData);
  } catch (error) {
    console.error('Error creating site:', error);
    throw error;
  }
};

// Clock in

// Logout function
export const logout = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    console.log('✅ Logout successful - cleared token and user data');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// ==================== MESSAGES API ====================

// Get all messages (inbox)
export const getMessagesFromAPI = async () => {
  try {
    return await apiRequest('/messages', 'GET');
  } catch (error) {
    console.error('Error fetching messages from API:', error);
    throw error;
  }
};

// Get conversation with specific user
export const getConversationFromAPI = async otherUserId => {
  try {
    return await apiRequest(`/messages/conversation/${otherUserId}`, 'GET');
  } catch (error) {
    console.error('Error fetching conversation from API:', error);
    throw error;
  }
};

// Send message via API
export const sendMessageToAPI = async (
  recipientId,
  content,
  subject = '',
  priority = 'normal',
) => {
  try {
    return await apiRequest('/messages', 'POST', {
      recipientId,
      content,
      subject,
      priority,
    });
  } catch (error) {
    console.error('Error sending message to API:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsReadAPI = async messageId => {
  try {
    return await apiRequest(`/messages/${messageId}/read`, 'PUT');
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Get unread count
export const getUnreadCountAPI = async () => {
  try {
    const response = await apiRequest('/messages/unread', 'GET');
    return response.count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Get all users (for sending messages)
export const getAllUsers = async () => {
  try {
    const response = await apiRequest('/auth/users', 'GET');
    return response.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const clockIn = async ({ siteId, latitude, longitude }) => {
  try {
    console.log('📤 Clock in API request...');
    const response = await apiRequest('/shifts/clock-in', 'POST', {
      siteId,
      location: { latitude, longitude },
    });
    console.log('✅ Clock in response:', response);
    return response;
  } catch (error) {
    console.error('❌ Clock in error:', error);
    throw error;
  }
};

export const clockOut = async (shiftId, { latitude, longitude }) => {
  try {
    console.log('📤 Clock out API request for shift:', shiftId);
    const response = await apiRequest(`/shifts/${shiftId}/clock-out`, 'PUT', {
      endLocation: { latitude, longitude },
    });
    console.log('✅ Clock out response:', response);
    return response;
  } catch (error) {
    console.error('❌ Clock out error:', error);
    throw error;
  }
};

export const getActiveShift = async () => {
  try {
    const response = await apiRequest('/shifts/active', 'GET');
    return response;
  } catch (error) {
    console.error('❌ Get active shift error:', error);
    return null;
  }
};

// ─── Schedules ────────────────────────────────────────────────────────────────

export const getSchedules = async () => {
  try {
    const response = await apiRequest('/schedules', 'GET');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
};
