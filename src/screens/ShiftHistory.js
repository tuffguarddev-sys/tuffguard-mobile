import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';

const API = 'https://tuffguardsecurityms.com/api';

const ShiftHistory = () => {
  const insets = useSafeAreaInsets();
  const [shifts, setShifts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/shifts`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      const sorted = (data.data || []).sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime));
      setShifts(sorted);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadShifts(); };

  const getDuration = (shift) => {
    if (!shift.clockOutTime) return { text: 'Ongoing', mins: 0 };
    const mins = Math.floor((new Date(shift.clockOutTime) - new Date(shift.clockInTime)) / 60000);
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return { text: `${hours}h ${remaining}m`, mins, isOT: hours >= 8 };
  };

  const getWeekStats = () => {
    const now = new Date();
    const day = now.getDay();
    const daysSinceFriday = (day + 2) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceFriday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    let totalMins = 0;
    let shiftCount = 0;
    shifts.forEach(shift => {
      if (!shift.clockInTime || !shift.clockOutTime) return;
      const clockIn = new Date(shift.clockInTime);
      if (clockIn >= weekStart && clockIn <= weekEnd) {
        const mins = Math.floor((new Date(shift.clockOutTime) - clockIn) / 60000);
        if (mins > 0) { totalMins += mins; shiftCount++; }
      }
    });

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return { hours, mins, shiftCount, weekStart, weekEnd, isOT: hours >= 40 };
  };

  const statusConfig = {
    active: { color: colors.primary, bg: colors.primaryBg, label: 'ACTIVE' },
    completed: { color: colors.blue, bg: colors.blueBg, label: 'COMPLETED' },
    missed: { color: colors.danger, bg: colors.dangerBg, label: 'MISSED' },
  };

  const renderShift = ({ item }) => {
    const dur = getDuration(item);
    const status = statusConfig[item.status] || statusConfig.completed;
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.siteName}>{item.site?.name || 'Unknown Site'}</Text>
            <Text style={styles.dateText}>
              {new Date(item.clockInTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.color }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>IN</Text>
            <Text style={styles.timeValue}>
              {new Date(item.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.timeLine} />
          <View style={styles.durationCenter}>
            <Text style={[styles.durationText, dur.isOT && styles.durationOT]}>{dur.text}</Text>
            {dur.isOT && <Text style={styles.otBadge}>OT</Text>}
          </View>
          <View style={styles.timeLine} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>OUT</Text>
            <Text style={styles.timeValue}>
              {item.clockOutTime
                ? new Date(item.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>
          </View>
        </View>
        {item.site?.address && (
          <Text style={styles.address} numberOfLines={1}>
            {[item.site.address, item.site.city].filter(Boolean).join(', ')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const stats = getWeekStats();

  return (
    <View style={styles.container}>
      {/* Week Summary */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Shift History</Text>
            <Text style={styles.headerSub}>{shifts.length} total shifts</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeNum}>{shifts.length}</Text>
            <Text style={styles.totalBadgeLabel}>shifts</Text>
          </View>
        </View>
        <View style={[styles.weekCard, stats.isOT && styles.weekCardOT]}>
          <View>
            <Text style={styles.weekLabel}>THIS WEEK</Text>
            <Text style={styles.weekRange}>
              {stats.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {stats.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.weekShifts}>{stats.shiftCount} shift{stats.shiftCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.weekHoursBox}>
            <Text style={[styles.weekHours, stats.isOT && styles.weekHoursOT]}>
              {stats.hours}<Text style={styles.weekHoursUnit}>h</Text> {stats.mins}<Text style={styles.weekHoursUnit}>m</Text>
            </Text>
            {stats.isOT && <Text style={styles.otLabel}>OVERTIME</Text>}
          </View>
        </View>
      </View>

      {shifts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name='assignment' size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No shifts yet</Text>
          <Text style={styles.emptyText}>Your completed shifts will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={item => item.id}
          renderItem={renderShift}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            {selected && (() => {
              const dur = getDuration(selected);
              const status = statusConfig[selected.status] || statusConfig.completed;
              return (
                <ScrollView>
                  <Text style={styles.modalTitle}>{selected.site?.name || 'Unknown Site'}</Text>
                  <Text style={styles.modalDate}>
                    {new Date(selected.clockInTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.color, alignSelf: 'flex-start', marginBottom: 16 }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Clock In</Text>
                    <Text style={styles.detailValue}>{new Date(selected.clockInTime).toLocaleTimeString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Clock Out</Text>
                    <Text style={styles.detailValue}>{selected.clockOutTime ? new Date(selected.clockOutTime).toLocaleTimeString() : 'Still active'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={[styles.detailValue, dur.isOT && { color: colors.warning }]}>{dur.text} {dur.isOT ? 'OT' : ''}</Text>
                  </View>
                  {selected.site && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{[selected.site.address, selected.site.city, selected.site.state].filter(Boolean).join(', ')}</Text>
                    </View>
                  )}
                  {selected.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesText}>{selected.notes}</Text>
                    </View>
                  )}
                </ScrollView>
              );
            })()}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  listContent: { padding: 16 },

  header: { backgroundColor: colors.bgHeader, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  totalBadge: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  totalBadgeNum: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  totalBadgeLabel: { color: colors.textSecondary, fontSize: 11 },

  weekCard: { backgroundColor: colors.primaryBg, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  weekCardOT: { backgroundColor: colors.warningBg, borderColor: colors.warning },
  weekLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  weekRange: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  weekShifts: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  weekHoursBox: { alignItems: 'flex-end' },
  weekHours: { color: colors.primary, fontSize: 28, fontWeight: '700' },
  weekHoursOT: { color: colors.warning },
  weekHoursUnit: { fontSize: 16 },
  otLabel: { color: colors.warning, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardLeft: { flex: 1 },
  siteName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  dateText: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderRadius: 12, padding: 12, marginBottom: 8 },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  timeValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  timeLine: { width: 1, height: 30, backgroundColor: colors.border },
  durationCenter: { flex: 1, alignItems: 'center' },
  durationText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  durationOT: { color: colors.warning },
  otBadge: { color: colors.warning, fontSize: 9, fontWeight: '700', backgroundColor: colors.warningBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
  address: { color: colors.textMuted, fontSize: 12 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalDate: { color: colors.textSecondary, fontSize: 14, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textSecondary, fontSize: 14 },
  detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  notesBox: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 14, marginTop: 14 },
  notesLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  notesText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  closeBtn: { backgroundColor: colors.bgInput, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});

export default ShiftHistory;
