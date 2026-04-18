import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const CURRENT_VERSION_CODE = 6;
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

const downloadAndInstall = async (downloadUrl, version) => {
  try {
    Alert.alert(
      '⬇️ Downloading Update',
      `Downloading v${version}... This may take a moment.`,
      [{ text: 'OK' }]
    );

    const fileUri = FileSystem.documentDirectory + `tuffguard-v${version}.apk`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (progress) => {
          const percent = Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
          console.log(`Download progress: ${percent}%`);
        }
      );
      const { uri } = await downloadResumable.downloadAsync();
      console.log('APK downloaded to:', uri);
    }

    // Launch the installer
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/vnd.android.package-archive',
      });
    }
  } catch (err) {
    console.error('Download/install error:', err);
    Alert.alert(
      'Download Failed',
      'Failed to download the update. Please ask your manager to resend the app download link.',
      [{ text: 'OK' }]
    );
  }
};

const showUpdatePrompt = (versionInfo, isForce) => {
  const { version, downloadUrl, releaseNotes } = versionInfo;

  if (isForce) {
    Alert.alert(
      '🔄 Required Update',
      `Version ${version} is required to continue using TuffGuardMS.\n\n${releaseNotes || ''}`,
      [
        {
          text: 'Update Now',
          onPress: () => downloadAndInstall(downloadUrl, version),
        }
      ],
      { cancelable: false }
    );
  } else {
    Alert.alert(
      '🔄 Update Available',
      `Version ${version} is available.\n\n${releaseNotes || ''}\n\nWould you like to update now?`,
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Update Now',
          onPress: () => downloadAndInstall(downloadUrl, version),
        }
      ]
    );
  }
};

export const checkForUpdate = async (silent = false) => {
  try {
    const versionInfo = await fetchVersionInfo();
    if (!versionInfo) return;

    const hasUpdate = versionInfo.versionCode > CURRENT_VERSION_CODE;
    if (!hasUpdate) {
      if (!silent) console.log('App is up to date');
      return;
    }

    showUpdatePrompt(versionInfo, versionInfo.forceUpdate);
  } catch (err) {
    console.log('Update check error:', err.message);
  }
};

export const startPeriodicUpdateCheck = () => {
  // Check every 30 minutes while app is open
  if (updateCheckInterval) clearInterval(updateCheckInterval);
  updateCheckInterval = setInterval(() => {
    checkForUpdate(true); // silent = true so no console log spam
  }, 30 * 60 * 1000);
  console.log('⏰ Periodic update check started (every 30 min)');
};

export const stopPeriodicUpdateCheck = () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
};
