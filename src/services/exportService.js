import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const exportShiftReportCSV = async (shifts, username) => {
  try {
    let csvContent = 'Date,Clock In,Clock Out,Duration,Site,Location\n';
    
    shifts.forEach(shift => {
      const duration = shift.clockOut 
        ? calculateDuration(shift.clockIn, shift.clockOut)
        : 'In Progress';
      
      csvContent += `${shift.date},${shift.clockIn},${shift.clockOut || 'N/A'},${duration},${shift.site || 'N/A'},"${shift.location || 'N/A'}"\n`;
    });
    
    const fileName = `shift_report_${username}_${new Date().getTime()}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Success', `Report saved to: ${fileUri}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting report:', error);
    Alert.alert('Error', 'Failed to export shift report');
    return false;
  }
};

export const exportScheduleReportCSV = async (schedules) => {
  try {
    let csvContent = 'Date,Site,Start Time,End Time,Assigned To,Notes\n';
    
    schedules.forEach(schedule => {
      csvContent += `${schedule.date},${schedule.site},${schedule.startTime},${schedule.endTime},${schedule.assignedTo},"${schedule.notes || ''}"\n`;
    });
    
    const fileName = `schedule_report_${new Date().getTime()}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Success', `Report saved to: ${fileUri}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting schedule report:', error);
    Alert.alert('Error', 'Failed to export schedule report');
    return false;
  }
};

const calculateDuration = (clockIn, clockOut) => {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diff = end - start;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};
