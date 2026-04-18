import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://tuffguardsecurityms.com/api';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '2548f570-f2c9-4635-9e4f-486e1981081a'
    });
    const pushToken = tokenData.data;
    console.log('Push token:', pushToken);

    // Save token locally
    await AsyncStorage.setItem('pushToken', pushToken);

    // Register token with backend
    await registerTokenWithBackend(pushToken);

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TuffGuard Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1DB954',
        sound: true,
      });
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2979FF',
        sound: true,
      });
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#FF3B30',
        sound: true,
      });
    }

    return pushToken;
  } catch (err) {
    console.error('Push notification setup error:', err);
    return null;
  }
};

const registerTokenWithBackend = async (pushToken) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${API}/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ pushToken, platform: Platform.OS })
    });

    if (res.ok) {
      console.log('Push token registered with backend');
    }
  } catch (err) {
    console.error('Failed to register push token:', err);
  }
};

export const setupNotificationListeners = (navigation) => {
  // Handle notification tap when app is in background/closed
  const subscription1 = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);

    // Navigate based on notification type
    if (data?.type === 'message') {
      navigation?.navigate('Messaging');
    } else if (data?.type === 'incident') {
      navigation?.navigate('Incidents');
    } else if (data?.type === 'schedule') {
      navigation?.navigate('CalendarSchedule');
    } else if (data?.type === 'time_off') {
      navigation?.navigate('TimeOff');
    } else {
      navigation?.navigate('Notifications');
    }
  });

  // Handle notification received when app is in foreground
  const subscription2 = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  return () => {
    subscription1.remove();
    subscription2.remove();
  };
};

export const getBadgeCount = async () => {
  return await Notifications.getBadgeCountAsync();
};

export const setBadgeCount = async (count) => {
  await Notifications.setBadgeCountAsync(count);
};

export const clearBadge = async () => {
  await Notifications.setBadgeCountAsync(0);
};
