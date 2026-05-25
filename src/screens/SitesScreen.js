import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Linking, Platform, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';

const API = 'https://tuffguardsecurityms.com/api';

const SitesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadSites();
    AsyncStorage.getItem('user').then(data => {
      if (data) setUserRole(JSON.parse(data).role || '');
    });
  }, []);

  const loadSites = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/sites`, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      const activeSites = (data.data || data.sites || []).filter(s => s.isActive);
      setSites(activeSites);
    } catch (err) {
      console.error('Error loading sites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadSites(); };

  const openMaps = (site) => {
    const address = [site.address, site.city, site.state, site.zipCode].filter(Boolean).join(', ');
    const encoded = encodeURIComponent(address);
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url);
  };

  const callContact = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
  };

  const isAdmin = ['DEV', 'BOSS', 'MANAGER'].includes(userRole);

  const filtered = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderSite = ({ item }) => {
    const fullAddress = [item.address, item.city, item.state, item.zipCode].filter(Boolean).join(', ');
    const isExpanded = expanded === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpanded(isExpanded ? null : item.id)}
        activeOpacity={0.8}>

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.siteIconBox}>
            <MaterialIcons name='business' size={22} color='#ffffff' />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.siteName}>{item.name}</Text>
            {item.city && <Text style={styles.siteCity}>{item.city}{item.state ? ', ' + item.state : ''}</Text>}
          </View>
          <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
        </View>

        {/* Quick Info Row */}
        <View style={styles.quickInfo}>
          {item.checkInInterval && (
            <View style={styles.quickBadge}>
              <Text style={styles.quickBadgeText}>Check-in every {item.checkInInterval}m</Text>
            </View>
          )}
          {item.guardCount > 0 && (
            <View style={styles.quickBadge}>
              <Text style={styles.quickBadgeText}>{item.guardCount} guard{item.guardCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            {fullAddress ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{fullAddress}</Text>
              </View>
            ) : null}

            {isAdmin && item.contactName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact</Text>
                <Text style={styles.detailValue}>{item.contactName}</Text>
              </View>
            ) : null}

            {isAdmin && item.contactEmail ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{item.contactEmail}</Text>
              </View>
            ) : null}

            {item.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.dirBtn} onPress={() => openMaps(item)}>
                <MaterialIcons name='directions' size={18} color='#fff' />
                <Text style={styles.dirBtnText}>Directions</Text>
              </TouchableOpacity>
              {isAdmin && item.contactPhone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => callContact(item.contactPhone)}>
                  <MaterialIcons name='phone' size={18} color={colors.blue} />
                  <Text style={styles.callBtnText}>{item.contactPhone}</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Banned Individuals Button */}
            <TouchableOpacity
              style={styles.bannedBtn}
              onPress={() => navigation.navigate('BannedIndividuals', { siteId: item.id, siteName: item.name })}>
              <MaterialIcons name='block' size={18} color='#ff4444' />
              <Text style={styles.bannedBtnText}>Banned Individuals</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Sites</Text>
        <Text style={styles.headerSub}>{sites.length} active site{sites.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name='search' size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search sites..."
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderSite}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} tintColor={colors.blue} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name='business' size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No sites found</Text>
            <Text style={styles.emptyText}>Try adjusting your search</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  listContent: { padding: 16 },

  header: { backgroundColor: colors.bgHeader, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgHeader, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 15 },
  clearSearch: { color: colors.textMuted, fontSize: 16, padding: 4 },

  card: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.blueBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.blue },
  siteIconText: { fontSize: 20 },
  cardHeaderText: { flex: 1 },
  siteName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  siteCity: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  expandArrow: { color: colors.textMuted, fontSize: 12 },

  quickInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickBadge: { backgroundColor: colors.bgInput, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  quickBadgeText: { color: colors.textSecondary, fontSize: 12 },

  expandedContent: { marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { color: colors.textSecondary, fontSize: 13 },
  detailValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },

  notesBox: { backgroundColor: colors.bgInput, borderRadius: 10, padding: 12, marginBottom: 14 },
  notesLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { color: colors.textPrimary, fontSize: 13, lineHeight: 20 },

  btnRow: { flexDirection: 'row', gap: 10 },
  dirBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dirBtnIcon: { fontSize: 16 },
  dirBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  callBtn: { flex: 1, backgroundColor: colors.blueBg, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.blue },
  callBtnIcon: { fontSize: 16 },
  callBtnText: { color: colors.blue, fontSize: 13, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  bannedBtn: { marginTop: 10, backgroundColor: '#1a0a0a', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#ff4444' },
  bannedBtnIcon: { fontSize: 16 },
  bannedBtnText: { color: '#ff4444', fontSize: 14, fontWeight: '700' },
});

export default SitesScreen;
