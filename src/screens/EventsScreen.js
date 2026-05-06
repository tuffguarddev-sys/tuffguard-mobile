import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const API = 'https://tuffguardsecurityms.com/api';

const EventsScreen = () => {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/events/my`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      const sorted = (data.data || []).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      setEvents(sorted);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadEvents(); };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUpcoming = (dateStr) => new Date(dateStr + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0));

  const renderEvent = ({ item }) => {
    const upcoming = isUpcoming(item.startDate);
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={styles.cardLeft}>
          <View style={[styles.dateBadge, { backgroundColor: upcoming ? colors.blueBg : colors.bgInput, borderColor: upcoming ? colors.blue : colors.border }]}>
            <Text style={[styles.dateBadgeMonth, { color: upcoming ? colors.blue : colors.textMuted }]}>
              {new Date(item.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={[styles.dateBadgeDay, { color: upcoming ? colors.textPrimary : colors.textMuted }]}>
              {new Date(item.startDate + 'T00:00:00').getDate()}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.cardTopRow}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: upcoming ? colors.blueBg : colors.bgInput, borderColor: upcoming ? colors.blue : colors.border }]}>
              <Text style={[styles.statusText, { color: upcoming ? colors.blue : colors.textMuted }]}>
                {upcoming ? 'UPCOMING' : 'PAST'}
              </Text>
            </View>
          </View>
          {item.site && <Text style={styles.locationText}>{item.site.name}</Text>}
          {!item.site && item.address && <Text style={styles.locationText}>{item.address}</Text>}
          {item.startTime && (
            <Text style={styles.timeText}>
              {formatTime(item.startTime)}{item.endTime ? ' - ' + formatTime(item.endTime) : ''}
            </Text>
          )}
          {item.startDate !== item.endDate && (
            <Text style={styles.endDateText}>Through {formatDate(item.endDate)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const upcoming = events.filter(e => isUpcoming(e.startDate));
  const past = events.filter(e => !isUpcoming(e.startDate));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Events</Text>
            <Text style={styles.headerSub}>{upcoming.length} upcoming</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeNum}>{events.length}</Text>
            <Text style={styles.totalBadgeLabel}>total</Text>
          </View>
        </View>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No events assigned</Text>
          <Text style={styles.emptyText}>Events assigned to you will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderEvent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            {selected && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selected.title}</Text>
                <Text style={styles.modalDate}>{formatDate(selected.startDate)}{selected.startDate !== selected.endDate ? ' — ' + formatDate(selected.endDate) : ''}</Text>
                {selected.startTime && (
                  <Text style={styles.modalTime}>
                    {formatTime(selected.startTime)}{selected.endTime ? ' - ' + formatTime(selected.endTime) : ''}
                  </Text>
                )}
                {selected.site && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Site</Text>
                    <Text style={styles.detailValue}>{selected.site.name}</Text>
                  </View>
                )}
                {selected.address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>{selected.address}</Text>
                  </View>
                )}
                {selected.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{selected.notes}</Text>
                  </View>
                )}
                {selected.assignments?.length > 0 && (
                  <View style={styles.guardsBox}>
                    <Text style={styles.notesLabel}>Assigned Guards</Text>
                    {selected.assignments.map((a) => (
                      <Text key={a.id} style={styles.guardName}>
                        {a.guard?.firstName} {a.guard?.lastName}
                      </Text>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  totalBadge: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  totalBadgeNum: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  totalBadgeLabel: { color: colors.textSecondary, fontSize: 11 },
  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 12 },
  cardLeft: { alignItems: 'center' },
  dateBadge: { width: 52, borderRadius: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  dateBadgeMonth: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  dateBadgeDay: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  cardRight: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  locationText: { color: colors.textSecondary, fontSize: 13, marginBottom: 3 },
  timeText: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  endDateText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalDate: { color: colors.textSecondary, fontSize: 14, marginBottom: 4 },
  modalTime: { color: colors.blue, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textSecondary, fontSize: 14 },
  detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  notesBox: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 14, marginTop: 14 },
  guardsBox: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 14, marginTop: 10 },
  notesLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  notesText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  guardName: { color: colors.textPrimary, fontSize: 14, paddingVertical: 3 },
  closeBtn: { backgroundColor: colors.bgInput, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});

export default EventsScreen;
