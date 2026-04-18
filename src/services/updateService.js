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

const backgroundDownloadAndPrompt = async (versionInfo) => {
  const { version, downloadUrl, releaseNotes, forceUpdate } = versionInfo;
  try {
    const fileUri = FileSystem.documentDirectory + 'tuffguard-update.apk';

    // Delete old cached APK if exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }

    console.log('Downloading update in background...');

    // Download silently
    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      fileUri,
      {},
      (progress) => {
        const percent = Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
        console.log('Download progress: ' + percent + '%');
      }
    );

    await downloadResumable.downloadAsync();
    console.log('Update downloaded, prompting install...');

    // Now show install prompt
    if (forceUpdate) {
      Alert.alert(
        '🔄 Update Required',
        'A required update is ready to install. Tap Install to continue.',
        [{ text: 'Install Now', onPress: () => launchInstaller(fileUri) }],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        '🔄 Update Ready',
        'Version ' + version + ' has been downloaded and is ready to install.

' + (releaseNotes || ''),
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Install Now', onPress: () => launchInstaller(fileUri) }
        ]
      );
    }
  } catch (err) {
    console.error('Background download error:', err.message);
    // Fall back to manual download
    showUpdatePrompt(versionInfo, forceUpdate);
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

export const checkForUpdate = async (silent = false) => {
  try {
    // Check user role - skip update check for CLIENT and ACCOUNTANT
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

    // Pre-download in background then show install prompt
    await backgroundDownloadAndPrompt(versionInfo);
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
