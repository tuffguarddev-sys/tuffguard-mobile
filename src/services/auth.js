import AsyncStorage from '@react-native-async-storage/async-storage';

export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem('token', token);
    return true;
  } catch (error) {
    console.error('Error saving token:', error);
    return false;
  }
};

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
};

export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};

export const refreshToken = async () => {
  try {
    const currentToken = await getToken();
    
    if (!currentToken) {
      throw new Error('No token found');
    }

    return currentToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

export const isTokenExpired = async () => {
  try {
    const token = await getToken();
    
    if (!token) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

export const validateCredentials = (username, password) => {
  const errors = {};

  if (!username || username.trim().length === 0) {
    errors.username = 'Username is required';
  } else if (username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  if (!password || password.length === 0) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
};
