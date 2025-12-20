import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    Linking,
    ActivityIndicator
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { Venue } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';
import { SearchWithChips } from './SearchWithChips';
import { filterItemsByChips } from '../utils/searchUtils';
import { GeocodingService, GeocodingResult } from '../services/geocoding-service';

interface Court {
    court_id: number;
    guid: string;
    name: string;
    surface?: string;
}

interface Field {
    field_id: number;
    guid: string;
    name: string;
    surface?: string;
}

interface VenueWithResources extends Venue {
    courts: Court[];
    fields: Field[];
}

export default function VenuesScreen() {
    const [venues, setVenues] = useState<VenueWithResources[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVenueModal, setShowVenueModal] = useState(false);
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [editingVenue, setEditingVenue] = useState<Partial<Venue> | null>(null);
    const [editingResource, setEditingResource] = useState<{ type: 'court' | 'field'; venueId: number; item?: Court | Field } | null>(null);

    // Form states
    const [venueName, setVenueName] = useState('');
    const [venueAddress, setVenueAddress] = useState('');
    const [resourceName, setResourceName] = useState('');
    const [resourceSurface, setResourceSurface] = useState('');

    // GPS Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Store geocoded data from selected result
    const [selectedLat, setSelectedLat] = useState<number | undefined>();
    const [selectedLon, setSelectedLon] = useState<number | undefined>();
    const [selectedGeocodedData, setSelectedGeocodedData] = useState<any>();

    // Manual search handler - only called when button is pressed
    const handleSearch = async () => {
        console.log('[VenuesScreen] handleSearch called, query:', searchQuery);

        if (!searchQuery.trim()) {
            console.log('[VenuesScreen] Query is empty, clearing results');
            setSearchResults([]);
            return;
        }

        console.log('[VenuesScreen] Starting search...');
        setSearchLoading(true);
        try {
            const results = await GeocodingService.search(searchQuery);
            console.log('[VenuesScreen] Search results received:', results.length, 'items');
            setSearchResults(results);
        } catch (error) {
            console.error('[VenuesScreen] Search error:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        // Clear results when typing to indicate new search needed
        if (searchResults.length > 0) setSearchResults([]);
    };

    const handleSelectResult = (result: GeocodingResult) => {
        setVenueName(result.name);
        setVenueAddress(result.displayAddress);

        // Store geocoded data
        setSelectedLat(parseFloat(result.lat));
        setSelectedLon(parseFloat(result.lon));
        setSelectedGeocodedData(result.geocodedData);

        setSearchQuery('');
        setSearchResults([]);
    };

    // Bulk creation mode
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkCount, setBulkCount] = useState('4');

    // Confirmation modal
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, isDestructive: false });

    // Venue List Search State (different from GPS searchQuery in venue modal)
    const [searchChips, setSearchChips] = useState<string[]>([]);
    const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('AND');

    // Expanded venue tracking
    const [expandedVenueId, setExpandedVenueId] = useState<number | null>(null);

    const { theme } = useTheme();

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const venuesData = await databaseService.getVenues();
            // Fetch courts and fields for each venue
            const venuesWithResources = await Promise.all(
                venuesData.map(async (v: Venue) => {
                    const [courts, fields] = await Promise.all([
                        databaseService.getVenueCourts(v.venue_id),
                        databaseService.getVenueFields(v.venue_id)
                    ]);
                    return { ...v, courts: courts || [], fields: fields || [] };
                })
            );
            setVenues(venuesWithResources);
        } catch (err) {
            console.error('Failed to load venues:', err);
        } finally {
            setLoading(false);
        }
    };

    // Venue CRUD
    const handleAddVenue = () => {
        setEditingVenue(null);
        setVenueName('');
        setVenueAddress('');
        setSearchQuery('');
        setSearchResults([]);

        // Clear geocoded data
        setSelectedLat(undefined);
        setSelectedLon(undefined);
        setSelectedGeocodedData(undefined);

        setShowVenueModal(true);
    };

    const handleEditVenue = (venue: Venue) => {
        setEditingVenue(venue);
        setVenueName(venue.name);
        setVenueAddress(venue.address || '');
        setSearchQuery('');
        setSearchResults([]);
        setShowVenueModal(true);
    };

    const handleSaveVenue = async () => {
        if (!venueName.trim()) {
            Alert.alert('Error', 'Venue name is required');
            return;
        }

        try {
            if (editingVenue?.venue_id) {
                await databaseService.updateVenue(
                    editingVenue.venue_id,
                    venueName,
                    venueAddress,
                    undefined, // details
                    selectedLat,
                    selectedLon,
                    selectedGeocodedData
                );
            } else {
                await databaseService.createVenue(
                    venueName,
                    venueAddress,
                    undefined, // details
                    selectedLat,
                    selectedLon,
                    selectedGeocodedData
                );
            }
            setShowVenueModal(false);
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to save venue');
        }
    };

    const promptDeleteVenue = (venue: Venue) => {
        setConfirmConfig({
            title: 'Delete Venue?',
            message: `Delete "${venue.name}"? This will also remove all courts and fields associated with it.`,
            isDestructive: true,
            onConfirm: async () => {
                await databaseService.deleteVenue(venue.venue_id);
                setConfirmVisible(false);
                loadData();
            }
        });
        setConfirmVisible(true);
    };

    const promptDeleteAll = () => {
        const filteredVenues = filterItemsByChips(
            venues,
            searchChips,
            (venue) => `${venue.name} ${venue.address || ''}`,
            searchMode
        );

        const isFiltered = searchChips.length > 0;
        setConfirmConfig({
            title: isFiltered ? `Delete ${filteredVenues.length} Filtered Venue${filteredVenues.length !== 1 ? 's' : ''}?` : 'Delete All Venues?',
            message: isFiltered
                ? `This will permanently delete the ${filteredVenues.length} venue(s) that match your current search filters (${searchChips.join(', ')}). Other venues will not be affected. This cannot be undone.`
                : 'This will permanently remove ALL venues from the database. This action cannot be undone.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    // Use batch delete instead of looping
                    const venueIds = filteredVenues.map(v => v.venue_id);
                    await databaseService.deleteVenuesBatch(venueIds);
                    setConfirmVisible(false);
                    loadData();
                } catch (e: any) {
                    console.error('Delete venues error:', e);
                    // Display validation error from backend
                    Alert.alert('Cannot Delete', e.message || 'Failed to delete venues');
                    setConfirmVisible(false);
                }
            }
        });
        setConfirmVisible(true);
    };

    // Resource CRUD
    const handleAddResource = (venueId: number, type: 'court' | 'field') => {
        setEditingResource({ type, venueId });
        setResourceName('');
        setResourceSurface('');
        setBulkMode(false);
        setBulkCount('4');
        setShowResourceModal(true);
    };

    const handleEditResource = (venueId: number, type: 'court' | 'field', item: Court | Field) => {
        setEditingResource({ type, venueId, item });
        setResourceName(item.name);
        setResourceSurface(item.surface || '');
        setShowResourceModal(true);
    };

    const handleSaveResource = async () => {
        if (!editingResource) return;
        const { type, venueId, item } = editingResource;

        // Bulk creation mode
        if (bulkMode && !item) {
            const count = parseInt(bulkCount) || 0;
            if (count < 1 || count > 50) {
                Alert.alert('Error', 'Enter a number between 1 and 50');
                return;
            }
            try {
                const typeLabel = type === 'court' ? 'Court' : 'Field';
                for (let i = 1; i <= count; i++) {
                    const name = `${typeLabel} ${i}`;
                    if (type === 'court') {
                        await databaseService.createCourt(venueId, name, resourceSurface);
                    } else {
                        await databaseService.createField(venueId, name, resourceSurface);
                    }
                }
                setShowResourceModal(false);
                loadData();
            } catch (e) {
                Alert.alert('Error', 'Failed to create');
            }
            return;
        }

        // Single resource mode
        if (!resourceName.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        try {
            if (type === 'court') {
                if (item && 'court_id' in item) {
                    await databaseService.updateCourt(item.court_id, resourceName, resourceSurface);
                } else {
                    await databaseService.createCourt(venueId, resourceName, resourceSurface);
                }
            } else {
                if (item && 'field_id' in item) {
                    await databaseService.updateField(item.field_id, resourceName, resourceSurface);
                } else {
                    await databaseService.createField(venueId, resourceName, resourceSurface);
                }
            }
            setShowResourceModal(false);
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to save');
        }
    };

    const handleDeleteResource = async () => {
        if (!editingResource?.item) return;
        const { type, item } = editingResource;
        try {
            if (type === 'court' && 'court_id' in item) {
                await databaseService.deleteCourt(item.court_id);
            } else if (type === 'field' && 'field_id' in item) {
                await databaseService.deleteField(item.field_id);
            }
            setShowResourceModal(false);
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to delete');
        }
    };

    const handleOpenMap = (venue: Venue) => {
        let mapUrl = '';

        // Try to get URL from geocoded data
        try {
            if (venue.geocoded_data) {
                const geocodedData = typeof venue.geocoded_data === 'string'
                    ? JSON.parse(venue.geocoded_data)
                    : venue.geocoded_data;

                // Google Maps URL from place_id
                if (geocodedData.place_id) {
                    mapUrl = `https://www.google.com/maps/place/?q=place_id:${geocodedData.place_id}`;
                }
            }
        } catch (e) {
            console.warn('Failed to parse geocoded_data:', e);
        }

        // Fallback: generic search with address
        if (!mapUrl && venue.address) {
            mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`;
        }

        if (mapUrl) {
            Linking.openURL(mapUrl).catch(err => {
                console.error('Failed to open map:', err);
                Alert.alert('Error', 'Could not open map');
            });
        } else {
            Alert.alert('No Location', 'This venue has no address or location data.');
        }
    };

    const handleDeleteAllCourts = (venueId: number, courtCount: number) => {
        if (courtCount === 0) return;

        setConfirmConfig({
            title: 'Delete All Courts?',
            message: `This will permanently delete all ${courtCount} court(s) from this venue.`,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const venue = venues.find(v => v.venue_id === venueId);
                    if (venue) {
                        for (const court of venue.courts) {
                            await databaseService.deleteCourt(court.court_id);
                        }
                    }
                    setConfirmVisible(false);
                    loadData();
                } catch (e) {
                    console.error('Failed to delete all courts:', e);
                    Alert.alert('Error', 'Failed to delete all courts');
                }
            }
        });
        setConfirmVisible(true);
    };

    const handleDeleteAllFields = (venueId: number, fieldCount: number) => {
        if (fieldCount === 0) return;

        setConfirmConfig({
            title: 'Delete All Fields?',
            message: `This will permanently delete all ${fieldCount} field(s) from this venue.`,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const venue = venues.find(v => v.venue_id === venueId);
                    if (venue) {
                        for (const field of venue.fields) {
                            await databaseService.deleteField(field.field_id);
                        }
                    }
                    setConfirmVisible(false);
                    loadData();
                } catch (e) {
                    console.error('Failed to delete all fields:', e);
                    Alert.alert('Error', 'Failed to delete all fields');
                }
            }
        });
        setConfirmVisible(true);
    };

    const renderVenueCard = ({ item }: { item: VenueWithResources }) => {
        const isExpanded = expandedVenueId === item.venue_id;
        const totalResources = item.courts.length + item.fields.length;

        return (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setExpandedVenueId(isExpanded ? null : item.venue_id)}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>{item.name}</Text>
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleOpenMap(item);
                                    }}
                                    style={{ padding: 4 }}
                                >
                                    <Text style={{ fontSize: 18 }}>🗺️</Text>
                                </TouchableOpacity>
                            </View>
                            {item.address && (
                                <Text style={[styles.cardSubtitle, { color: theme.colors.muted }]}>📍 {item.address}</Text>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: theme.colors.muted }}>{totalResources} resources</Text>
                            <Text style={{ color: theme.colors.muted, fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: theme.colors.border }]}>
                        {/* Courts Section */}
                        <View style={styles.resourceSection}>
                            <View style={styles.resourceHeader}>
                                <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>🎾 Courts ({item.courts.length})</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {item.courts.length > 0 && (
                                        <TouchableOpacity
                                            style={[styles.deleteAllBtn, { backgroundColor: '#d9534f' }]}
                                            onPress={() => handleDeleteAllCourts(item.venue_id, item.courts.length)}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Delete All</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.addResourceBtn, { backgroundColor: theme.colors.primary }]}
                                        onPress={() => handleAddResource(item.venue_id, 'court')}
                                    >
                                        <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>+ Court</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {item.courts.length === 0 ? (
                                <Text style={{ color: theme.colors.muted, fontStyle: 'italic' }}>No courts</Text>
                            ) : (
                                item.courts.map(c => (
                                    <TouchableOpacity
                                        key={c.court_id}
                                        style={[styles.resourceItem, { borderColor: theme.colors.border }]}
                                        onPress={() => handleEditResource(item.venue_id, 'court', c)}
                                    >
                                        <Text style={{ color: theme.colors.text }}>{c.name}</Text>
                                        {c.surface && <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{c.surface}</Text>}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>

                        {/* Fields Section */}
                        <View style={[styles.resourceSection, { marginTop: 12 }]}>
                            <View style={styles.resourceHeader}>
                                <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>⚽ Fields ({item.fields.length})</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {item.fields.length > 0 && (
                                        <TouchableOpacity
                                            style={[styles.deleteAllBtn, { backgroundColor: '#d9534f' }]}
                                            onPress={() => handleDeleteAllFields(item.venue_id, item.fields.length)}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Delete All</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.addResourceBtn, { backgroundColor: theme.colors.primary }]}
                                        onPress={() => handleAddResource(item.venue_id, 'field')}
                                    >
                                        <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>+ Field</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {item.fields.length === 0 ? (
                                <Text style={{ color: theme.colors.muted, fontStyle: 'italic' }}>No fields</Text>
                            ) : (
                                item.fields.map(f => (
                                    <TouchableOpacity
                                        key={f.field_id}
                                        style={[styles.resourceItem, { borderColor: theme.colors.border }]}
                                        onPress={() => handleEditResource(item.venue_id, 'field', f)}
                                    >
                                        <Text style={{ color: theme.colors.text }}>{f.name}</Text>
                                        {f.surface && <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{f.surface}</Text>}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>

                        {/* Venue Actions */}
                        <View style={styles.venueActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                                onPress={() => handleEditVenue(item)}
                            >
                                <Text style={{ color: 'black', fontWeight: 'bold' }}>Edit Venue</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#d9534f' }]}
                                onPress={() => promptDeleteVenue(item)}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete Venue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScreenHeader
                title="Venues"
                rightAction={
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: '#d9534f' }]} onPress={promptDeleteAll}>
                            <Text style={styles.buttonTextWhite}>
                                {searchChips.length > 0
                                    ? `Delete Filtered (${filterItemsByChips(
                                        venues,
                                        searchChips,
                                        (v) => `${v.name} ${v.address || ''} ${v.courts?.map(c => c.name).join(' ') || ''} ${v.fields?.map(f => f.name).join(' ') || ''}`,
                                        searchMode
                                    ).length})`
                                    : `Delete All (${venues.length})`}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.colors.primary }]} onPress={handleAddVenue}>
                            <Text style={{ color: 'black', fontWeight: 'bold' }}>New Venue</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <>
                    {/* Search with Chips */}
                    <SearchWithChips
                        chips={searchChips}
                        onChipsChange={setSearchChips}
                        mode={searchMode}
                        onModeChange={setSearchMode}
                        placeholder="Search venues by name, address, courts..."
                        topSpacing={true}
                        resultCount={filterItemsByChips(
                            venues,
                            searchChips,
                            (v) => `${v.name} ${v.address || ''} ${v.courts?.map(c => c.name).join(' ') || ''} ${v.fields?.map(f => f.name).join(' ') || ''}`,
                            searchMode
                        ).length}
                        totalCount={venues.length}
                    />
                    <FlatList
                        data={filterItemsByChips(
                            venues,
                            searchChips,
                            (v) => `${v.name} ${v.address || ''} ${v.courts?.map(c => c.name).join(' ') || ''} ${v.fields?.map(f => f.name).join(' ') || ''}`,
                            searchMode
                        )}
                        keyExtractor={item => item.venue_id.toString()}
                        renderItem={renderVenueCard}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                                No venues found
                            </Text>
                        }
                    />
                </>
            )}

            {/* Venue Modal */}
            <Modal visible={showVenueModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                            {editingVenue?.venue_id ? 'Edit Venue' : 'New Venue'}
                        </Text>

                        {/* GPS Search Section */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>🔍 Search Location</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, flex: 1 }]}
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                placeholder="Search by name or address..."
                                placeholderTextColor={theme.colors.muted}
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                            />
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: searchLoading ? 0.6 : 1 }]}
                                onPress={handleSearch}
                                disabled={searchLoading || !searchQuery.trim()}
                            >
                                <Text style={{ color: 'black', fontWeight: 'bold' }}>{searchLoading ? '...' : 'Search'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <View style={[styles.searchResults, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                                    {searchResults.map((result) => (
                                        <TouchableOpacity
                                            key={result.place_id}
                                            style={[styles.searchResultItem, { borderBottomColor: theme.colors.border }]}
                                            onPress={() => handleSelectResult(result)}
                                        >
                                            <Text style={[styles.resultName, { color: theme.colors.text }]}>{result.name}</Text>
                                            <Text style={[styles.resultAddress, { color: theme.colors.muted }]}>{result.displayAddress}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <Text style={[styles.label, { color: theme.colors.text }]}>Venue Name *</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                            value={venueName}
                            onChangeText={setVenueName}
                            placeholder="e.g. Central Park Tennis Center"
                            placeholderTextColor={theme.colors.muted}
                        />

                        <Text style={[styles.label, { color: theme.colors.text }]}>Address</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                            value={venueAddress}
                            onChangeText={setVenueAddress}
                            placeholder="123 Main St, City"
                            placeholderTextColor={theme.colors.muted}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.colors.muted }]} onPress={() => setShowVenueModal(false)}>
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSaveVenue}>
                                <Text style={{ color: 'black', fontWeight: 'bold' }}>{editingVenue?.venue_id ? 'Save' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Resource Modal (Court/Field) */}
            <Modal visible={showResourceModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                            {editingResource?.item ? `Edit ${editingResource.type}` : `New ${editingResource?.type || ''}(s)`}
                        </Text>

                        {/* Bulk mode toggle - only show when creating new */}
                        {!editingResource?.item && (
                            <View style={styles.modeToggle}>
                                <TouchableOpacity
                                    style={[styles.modeBtn, { borderColor: theme.colors.border }, !bulkMode && { backgroundColor: theme.colors.primary }]}
                                    onPress={() => setBulkMode(false)}
                                >
                                    <Text style={[{ color: theme.colors.text }, !bulkMode && { color: 'black', fontWeight: 'bold' }]}>Single</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modeBtn, { borderColor: theme.colors.border }, bulkMode && { backgroundColor: theme.colors.primary }]}
                                    onPress={() => setBulkMode(true)}
                                >
                                    <Text style={[{ color: theme.colors.text }, bulkMode && { color: 'black', fontWeight: 'bold' }]}>Bulk Create</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Single mode or editing */}
                        {(!bulkMode || editingResource?.item) && (
                            <>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Name *</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                                    value={resourceName}
                                    onChangeText={setResourceName}
                                    placeholder={editingResource?.type === 'court' ? 'e.g. Court 1' : 'e.g. North Field'}
                                    placeholderTextColor={theme.colors.muted}
                                />
                            </>
                        )}

                        {/* Bulk mode */}
                        {bulkMode && !editingResource?.item && (
                            <>
                                <Text style={[styles.label, { color: theme.colors.text }]}>How many {editingResource?.type}s?</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 80 }]}
                                    value={bulkCount}
                                    onChangeText={setBulkCount}
                                    keyboardType="numeric"
                                    placeholder="4"
                                    placeholderTextColor={theme.colors.muted}
                                />
                                <Text style={{ color: theme.colors.muted, marginTop: 8, fontSize: 13 }}>
                                    Will create: {editingResource?.type === 'court' ? 'Court' : 'Field'} 1, {editingResource?.type === 'court' ? 'Court' : 'Field'} 2, ... {editingResource?.type === 'court' ? 'Court' : 'Field'} {bulkCount || '?'}
                                </Text>
                            </>
                        )}

                        <Text style={[styles.label, { color: theme.colors.text }]}>Surface (optional)</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                            value={resourceSurface}
                            onChangeText={setResourceSurface}
                            placeholder="e.g. Clay, Grass, Hard"
                            placeholderTextColor={theme.colors.muted}
                        />

                        <View style={styles.modalButtons}>
                            {editingResource?.item && (
                                <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: '#d9534f' }]} onPress={handleDeleteResource}>
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
                                </TouchableOpacity>
                            )}
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.colors.muted }]} onPress={() => setShowResourceModal(false)}>
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSaveResource}>
                                <Text style={{ color: 'black', fontWeight: 'bold' }}>{editingResource?.item ? 'Save' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ConfirmationModal
                visible={confirmVisible}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmVisible(false)}
                isDestructive={confirmConfig.isDestructive}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { paddingHorizontal: 16, paddingBottom: 15 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },

    // Header
    headerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },

    // Card
    card: { borderRadius: 8, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    cardSubtitle: { fontSize: 14, marginTop: 4 },

    // Expanded content
    expandedContent: { padding: 16, paddingTop: 12, borderTopWidth: 1 },
    resourceSection: {},
    resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    resourceTitle: { fontWeight: 'bold', fontSize: 14 },
    addResourceBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
    resourceItem: { padding: 10, borderWidth: 1, borderRadius: 6, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // Venue actions
    venueActions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
    actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },

    // Header button styles (matches other screens)
    deleteButtonHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    buttonTextWhite: { color: 'white', fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: MAX_CONTENT_WIDTH, borderRadius: 12, borderWidth: 1, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    label: { marginBottom: 6, fontWeight: '500', marginTop: 12 },
    input: { padding: 12, borderRadius: 8, borderWidth: 1 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
    cancelBtn: { padding: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
    saveBtn: { padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    deleteBtn: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },

    // Mode toggle for bulk creation
    modeToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    modeBtn: { flex: 1, padding: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center' },

    // Search Results
    searchResults: {
        position: 'relative',
        zIndex: 1000,
        borderWidth: 1,
        borderTopWidth: 0,
        borderRadius: 8,
        marginTop: -10,
        marginBottom: 16,
        overflow: 'hidden'
    },
    searchResultItem: {
        padding: 12,
        borderBottomWidth: 1
    },
    deleteAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center'
    },
    resultName: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 4
    },
    resultAddress: {
        fontSize: 12
    }
});
