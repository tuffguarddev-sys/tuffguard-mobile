import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_VERSION = '1.0.0';
const CURRENT_VERSION_CODE = 2;
const VERSION_URL = 'https://tuffguardsecurityms.com/api/app/version';

export const checkForUpdate = async () => {
  try {
    const res = await fetch(VERSION_URL);
    const data = await res.json();

    if (!data.success) return;

    const serverVersionCode = data.versionCode;
    const hasUpdate = serverVersionCode > CURRENT_VERSION_CODE;

    if (!hasUpdate) return;

    if (data.forceUpdate) {
      // Force update — cannot dismiss
      Alert.alert(
        'Update Required',
        `A required update (v${data.version}) is available.\n\n${data.releaseNotes || ''}\n\nYou must update to continue using the app.`,
        [
          {
            text: 'Update Now',
            onPress: () => Linking.openURL(data.downloadUrl)
          }
        ],
        { cancelable: false }
      );
    } else {
      // Optional update
      Alert.alert(
        'Update Available',
        `Version ${data.version} is available.\n\n${data.releaseNotes || ''}\n\nWould you like to update now?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Update Now',
            onPress: () => Linking.openURL(data.downloadUrl)
          }
        ]
      );
    }
  } catch (err) {
    // Silently fail — don't block the app if update check fails
    console.log('Update check failed:', err.message);
  }
};
