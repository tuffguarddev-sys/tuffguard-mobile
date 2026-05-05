import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_VERSION_CODE = 8;
const VERSION_URL = 'https://tuffguardsecurityms.com/api/app/version';
let updateCheckInterval = null;

const fetchVersionInfo = async () => {
  try {
    const res = await fetch(VERSION_URL);
    const data = await res.json();
    if (!data.success) return null;
    return data;
  } catch (err) {
    console.log('Version check failed:', err.message);
    return null;
  }
};

const launchInstaller = async (fileUri) => {
  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/vnd.android.package-archive',
      });
    }
  } catch (err) {
    console.error('Install error:', err.message);
    Alert.alert('Install Failed', 'Please contact your manager for assistance.');
  }
};

const backgroundDownloadAndPrompt = async (versionInfo) => {
  const { version, downloadUrl, releaseNotes, forceUpdate } = versionInfo;
  try {
    const fileUri = FileSystem.documentDirectory + 'tuffguard-update.apk';

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }

    console.log('Downloading update in background...');

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      fileUri,
      {
        headers: { 'Cache-Control': 'no-cache' },
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      },
      (progress) => {
        const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
        if (totalBytesExpectedToWrite > 0) {
          const percent = Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100);
          console.log('Download progress: ' + percent + '%');
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (!result || !result.uri) {
      throw new Error('Download returned no URI');
    }

    const downloaded = await FileSystem.getInfoAsync(result.uri);
    if (!downloaded.exists || downloaded.size < 50000000) {
      throw new Error('Downloaded file too small or missing');
    }

    console.log('Update downloaded successfully:', downloaded.size, 'bytes');

    if (forceUpdate) {
      Alert.alert(
        'Update Required',
        'A required update is ready to install. Tap Install to continue.',
        [{ text: 'Install Now', onPress: () => launchInstaller(result.uri) }],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        'Update Ready',
        'Version ' + version + ' has been downloaded and is ready to install.\n' + (releaseNotes || ''),
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Install Now', onPress: () => launchInstaller(result.uri) }
        ]
      );
    }
  } catch (err) {
    console.error('Background download error:', err.message);
    Alert.alert(
      'Download Failed',
      'Failed to download the update. Please check your connection and try again.',
      [{ text: 'OK' }]
    );
  }
};

export const checkForUpdate = async (silent = false) => {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const skipRoles = ['CLIENT', 'ACCOUNTANT'];
      if (skipRoles.includes(user.role)) {
        console.log('Update check skipped for role:', user.role);
        return;
      }
    }

    const versionInfo = await fetchVersionInfo();
    if (!versionInfo) return;

    const hasUpdate = versionInfo.versionCode > CURRENT_VERSION_CODE;
    if (!hasUpdate) {
      if (!silent) console.log('App is up to date');
      return;
    }

    await backgroundDownloadAndPrompt(versionInfo);
  } catch (err) {
    console.log('Update check error:', err.message);
  }
};

export const startPeriodicUpdateCheck = () => {
  if (updateCheckInterval) clearInterval(updateCheckInterval);
  updateCheckInterval = setInterval(() => {
    checkForUpdate(true);
  }, 30 * 60 * 1000);
  console.log('Periodic update check started (every 30 min)');
};

export const stopPeriodicUpdateCheck = () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
};
