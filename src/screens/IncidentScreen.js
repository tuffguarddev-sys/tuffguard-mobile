import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const API = 'https://tuffguardsecurityms.com/api';

const severityConfig = {
  low:      { color: colors.primary,  bg: colors.primaryBg,  icon: '🟢', label: 'LOW' },
  medium:   { color: colors.warning,  bg: colors.warningBg,  icon: '🟡', label: 'MEDIUM' },
  high:     { color: colors.danger,   bg: colors.dangerBg,   icon: '🔴', label: 'HIGH' },
  critical: { color: '#BF5AF2',       bg: '#1A0A2A',         icon: '🚨', label: 'CRITICAL' },
};

const statusConfig = {
  open:        { color: colors.danger,   label: 'OPEN' },
  in_progress: { color: colors.warning,  label: 'IN PROGRESS' },
  resolved:    { color: colors.primary,  label: 'RESOLVED' },
  closed:      { color: colors.textMuted, label: 'CLOSED' },
};

const SEVERITY_FILTERS = ['all', 'low', 'medium', 'high', 'critical'];
const STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed'];

const IncidentScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [incidents, setIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadIncidents(); }, []);

  const loadIncidents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/incidents`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      setIncidents(data.data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadIncidents(); };

  const filtered = incidents.filter(i => {
    const sev = (i.severity || '').toLowerCase();
    const stat = (i.status || '').toLowerCase();
    return (severityFilter === 'all' || sev === severityFilter) &&
           (statusFilter === 'all' || stat === statusFilter);
  });

  const openCount = incidents.filter(i => i.status === 'open').length;
  const criticalCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;

  const renderIncident = ({ item }) => {
    const sev = severityConfig[(item.severity || '').toLowerCase()] || severityConfig.low;
    const stat = statusConfig[(item.status || '').toLowerCase()] || statusConfig.open;
    const photoCount = item.photos?.length || 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={[styles.sevPill, { backgroundColor: sev.bg, borderColor: sev.color }]}>
            <Text style={styles.sevIcon}>{sev.icon}</Text>
            <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
          </View>
          <Text style={[styles.statText, { color: stat.color }]}>● {stat.label}</Text>
        </View>

        <Text style={styles.incidentTitle} numberOfLines={2}>{item.title || item.type || 'Incident Report'}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            🕐 {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          {item.site?.name && <Text style={styles.cardSite}>📍 {item.site.name}</Text>}
          {photoCount > 0 && <Text style={styles.photoCount}>📷 {photoCount}</Text>}
        </View>

        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Reports</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statNum}>{incidents.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBadge, { borderColor: colors.danger }]}>
            <Text style={[styles.statNum, { color: colors.danger }]}>{openCount}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          {criticalCount > 0 && (
            <View style={[styles.statBadge, { borderColor: '#BF5AF2' }]}>
              <Text style={[styles.statNum, { color: '#BF5AF2' }]}>{criticalCount}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </View>
          )}
        </View>
      </View>

      {/* Severity Filter */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }} horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {SEVERITY_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, severityFilter === f && styles.filterChipActive]}
            onPress={() => setSeverityFilter(f)}>
            <Text style={[styles.filterChipText, severityFilter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All Severity' : f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All Status' : f.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report Button */}
      <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('Report')}>
        <Text style={styles.reportBtnText}>+ Report New Incident</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderIncident}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No incidents found</Text>
            <Text style={styles.emptyText}>All clear — no incidents match your filters</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            {selected && (() => {
              const sev = severityConfig[(selected.severity || '').toLowerCase()] || severityConfig.low;
              const stat = statusConfig[(selected.status || '').toLowerCase()] || statusConfig.open;
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeader}>
                    <View style={[styles.sevPill, { backgroundColor: sev.bg, borderColor: sev.color }]}>
                      <Text style={styles.sevIcon}>{sev.icon}</Text>
                      <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
                    </View>
                    <Text style={[styles.statText, { color: stat.color }]}>● {stat.label}</Text>
                  </View>
                  <Text style={styles.modalTitle}>{selected.title || selected.type || 'Incident Report'}</Text>
                  <Text style={styles.modalDate}>
                    {new Date(selected.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                  {selected.site?.name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>📍 Location</Text>
                      <Text style={styles.detailValue}>{selected.site.name}</Text>
                    </View>
                  )}
                  {selected.description && (
                    <View style={styles.descBox}>
                      <Text style={styles.descLabel}>Description</Text>
                      <Text style={styles.descText}>{selected.description}</Text>
                    </View>
                  )}
                  {selected.actionTaken && (
                    <View style={styles.descBox}>
                      <Text style={styles.descLabel}>Action Taken</Text>
                      <Text style={styles.descText}>{selected.actionTaken}</Text>
                    </View>
                  )}
                  {selected.photos?.length > 0 && (
                    <View style={styles.photosSection}>
                      <Text style={styles.descLabel}>Photos ({selected.photos.length})</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selected.photos.map((photo, i) => (
                          <Image key={i} source={{ uri: `${API.replace('/api', '')}/uploads/${photo}` }} style={styles.photo} />
                        ))}
                      </ScrollView>
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
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBadge: { backgroundColor: colors.bgCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.textSecondary, fontSize: 11 },

  filterScroll: { backgroundColor: colors.bgHeader, maxHeight: 48 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  filterChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: colors.primary },

  reportBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  reportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sevPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  sevIcon: { fontSize: 12 },
  sevText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statText: { fontSize: 11, fontWeight: '600' },
  incidentTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardDate: { color: colors.textSecondary, fontSize: 12 },
  cardSite: { color: colors.textSecondary, fontSize: 12 },
  photoCount: { color: colors.blue, fontSize: 12 },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 18 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: colors.border },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalDate: { color: colors.textSecondary, fontSize: 13, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textSecondary, fontSize: 14 },
  detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  descBox: { backgroundColor: colors.bgInput, borderRadius: 12, padding: 14, marginTop: 12 },
  descLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  photosSection: { marginTop: 12 },
  photo: { width: 120, height: 120, borderRadius: 10, marginRight: 10 },
  closeBtn: { backgroundColor: colors.bgInput, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});

export default IncidentScreen;
