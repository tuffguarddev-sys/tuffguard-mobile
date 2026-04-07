import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  INCIDENTS: 'incidents',
  USER_PREFERENCES: 'user_preferences',
  LAST_SYNC: 'last_sync',
  OFFLINE_INCIDENTS: 'offline_incidents',
};

export const saveData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error saving data for key ${key}:`, error);
    return false;
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    return false;
  }
};

export const clearAllStorage = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all storage:', error);
    return false;
  }
};

export const saveToken = async (token) => {
  return saveData(STORAGE_KEYS.TOKEN, token);
};

export const getToken = async () => {
  return getData(STORAGE_KEYS.TOKEN);
};

export const removeToken = async () => {
  return removeData(STORAGE_KEYS.TOKEN);
};

export const saveUser = async (user) => {
  return saveData(STORAGE_KEYS.USER, user);
};

export const getUser = async () => {
  return getData(STORAGE_KEYS.USER);
};

export const removeUser = async () => {
  return removeData(STORAGE_KEYS.USER);
};

export const saveIncidents = async (incidents) => {
  return saveData(STORAGE_KEYS.INCIDENTS, incidents);
};

export const getIncidents = async () => {
  return getData(STORAGE_KEYS.INCIDENTS);
};

export const removeIncidents = async () => {
  return removeData(STORAGE_KEYS.INCIDENTS);
};

export const saveUserPreferences = async (preferences) => {
  return saveData(STORAGE_KEYS.USER_PREFERENCES, preferences);
};

export const getUserPreferences = async () => {
  return getData(STORAGE_KEYS.USER_PREFERENCES);
};

export const removeUserPreferences = async () => {
  return removeData(STORAGE_KEYS.USER_PREFERENCES);
};

export const saveLastSyncTime = async () => {
  const timestamp = new Date().toISOString();
  return saveData(STORAGE_KEYS.LAST_SYNC, timestamp);
};

export const getLastSyncTime = async () => {
  return getData(STORAGE_KEYS.LAST_SYNC);
};

export const saveOfflineIncident = async (incident) => {
  try {
    const offlineIncidents = await getData(STORAGE_KEYS.OFFLINE_INCIDENTS) || [];
    offlineIncidents.push({
      ...incident,
      offlineId: Date.now(),
      synced: false,
    });
    return saveData(STORAGE_KEYS.OFFLINE_INCIDENTS, offlineIncidents);
  } catch (error) {
    console.error('Error saving offline incident:', error);
    return false;
  }
};

export const getOfflineIncidents = async () => {
  return getData(STORAGE_KEYS.OFFLINE_INCIDENTS) || [];
};

export const removeOfflineIncident = async (offlineId) => {
  try {
    const offlineIncidents = await getOfflineIncidents();
    const filteredIncidents = offlineIncidents.filter(incident => incident.offlineId !== offlineId);
    return saveData(STORAGE__KEYS.OFFLINE_INCIDENTS, filteredIncidents);
  } catch (error) {
    console.error('Error removing offline incident:', error);
    return false;
  }
};

export const hasOfflineIncidents = async () => {
  const offlineIncidents = await getOfflineIncidents();
  return offlineIncidents.length > 0;
};

export const getAllOfflineIncidents = async () => {
  return getOfflineIncidents();
};

export const markOfflineIncidentAsSynced = async (offlineId) => {
  try {
    const offlineIncidents = await getOfflineIncidents();
    const updatedIncidents = offlineIncidents.map(incident => {
      if (incident.offlineId === offlineId) {
        return { ...incident, synced: true };
      }
      return incident;
    });
    return saveData(STORAGE_KEYS.OFFLINE_INCIDENTS, updatedIncidents);
  } catch (error) {
    console.error('Error marking offline incident as synced:', error);
    return false;
  }
};

export const clearAllOfflineIncidents = async () => {
  try {
    await removeData(STORAGE_KEYS.OFFLINE_INCIDENTS);
    return true;
  } catch (error) {
    console.error('Error clearing all offline incidents:', error);
    return false;
  }
};
