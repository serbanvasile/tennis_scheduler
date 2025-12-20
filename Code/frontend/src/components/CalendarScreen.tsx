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
  Platform
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { commonStyles } from '../ui/commonStyles';
import { TennisEvent, Venue, System } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';
import { SearchWithChips } from './SearchWithChips';
import { filterItemsByChips, formatDateForSearch, formatTimeForSearch } from '../utils/searchUtils';

// Form state interface for event creation/editing
interface EventFormState {
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  // xref selections
  eventTypeIds: number[];
  systemIds: number[];
  venueIds: number[];
  courtIds: number[];
  fieldIds: number[];
  teamIds: number[];
  memberIds: number[];
  // Series options
  isSeriesEvent: boolean;
  repeatPeriod: 'hours' | 'days' | 'weeks';
  repeatInterval: number;
  totalEvents?: number; // Optional if lastEventDate provided
  lastEventDate?: string; // Optional end boundary for series
  lastEventTime?: string; // Time component for last event
}

const defaultFormState: EventFormState = {
  name: '',
  description: '',
  startDate: '',
  startTime: '09:00',
  endTime: '',
  eventTypeIds: [],
  systemIds: [],
  venueIds: [],
  courtIds: [],
  fieldIds: [],
  teamIds: [],
  memberIds: [],
  isSeriesEvent: false,
  repeatPeriod: 'weeks',
  repeatInterval: 1,
  totalEvents: 8
};

// DateInput component - uses HTML5 date picker on web
const DateInput = ({ value, onChange, style, theme }: { value: string; onChange: (v: string) => void; style?: any; theme: any }) => {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 12,
          borderRadius: 8,
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.inputBackground || theme.colors.surface,
          color: theme.colors.text,
          fontSize: 14,
          width: '100%',
          boxSizing: 'border-box',
          ...style
        }}
      />
    );
  }
  // Native fallback
  return (
    <TextInput
      style={[{ padding: 12, borderRadius: 8, borderWidth: 1 }, style, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={theme.colors.muted}
    />
  );
};

// TimeInput component - uses HTML5 time picker on web
const TimeInput = ({ value, onChange, style, theme }: { value: string; onChange: (v: string) => void; style?: any; theme: any }) => {
  if (Platform.OS === 'web') {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 12,
          borderRadius: 8,
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.inputBackground || theme.colors.surface,
          color: theme.colors.text,
          fontSize: 14,
          width: '100%',
          boxSizing: 'border-box',
          ...style
        }}
      />
    );
  }
  // Native fallback
  return (
    <TextInput
      style={[{ padding: 12, borderRadius: 8, borderWidth: 1 }, style, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor={theme.colors.muted}
    />
  );
};

// Tab Component
const Tabs = ({ activeTab, onChange }: { activeTab: string, onChange: (tab: string) => void }) => {
  const { theme } = useTheme();
  return (
    <View style={commonStyles.tabContainer}>
      <TouchableOpacity
        style={[commonStyles.tab, activeTab === 'General' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
        onPress={() => onChange('General')}
      >
        <Text style={[commonStyles.tabText, { color: theme.colors.text }]}>General</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[commonStyles.tab, activeTab === 'Venues' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
        onPress={() => onChange('Venues')}
      >
        <Text style={[commonStyles.tabText, { color: theme.colors.text }]}>Venues</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[commonStyles.tab, activeTab === 'Participants' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
        onPress={() => onChange('Participants')}
      >
        <Text style={[commonStyles.tabText, { color: theme.colors.text }]}>Participants</Text>
      </TouchableOpacity>
    </View>
  );
};


export default function CalendarScreen() {
  const [events, setEvents] = useState<TennisEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formState, setFormState] = useState<EventFormState>(defaultFormState);

  // Preview configuration
  const [previewFirstCount, setPreviewFirstCount] = useState(4);
  const [previewLastCount, setPreviewLastCount] = useState(4);

  // Confirmation modal for delete all
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, onCancel: () => { }, isDestructive: false, confirmLabel: undefined as string | undefined, cancelLabel: undefined as string | undefined });

  // Search State
  const [searchChips, setSearchChips] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('AND');

  // Active Tab for Event Form
  const [activeTab, setActiveTab] = useState('General');


  // Court selection - available courts based on selected venues
  const [availableCourts, setAvailableCourts] = useState<any[]>([]);
  const [courtSelectionMode, setCourtSelectionMode] = useState<'all' | 'select' | 'count'>('all');
  const [courtCount, setCourtCount] = useState('4');

  // Teams and Members
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  // Search state for form fields
  const [venueSearchChips, setVenueSearchChips] = useState<string[]>([]);
  const [venueSearchMode, setVenueSearchMode] = useState<'AND' | 'OR'>('OR');
  const [teamSearchChips, setTeamSearchChips] = useState<string[]>([]);
  const [teamSearchMode, setTeamSearchMode] = useState<'AND' | 'OR'>('OR');
  const [memberSearchChips, setMemberSearchChips] = useState<string[]>([]);
  const [memberSearchMode, setMemberSearchMode] = useState<'AND' | 'OR'>('OR');

  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, venuesData, lookups, teamsData, membersData, prefs] = await Promise.all([
        databaseService.getAllEvents(),
        databaseService.getVenues(),
        databaseService.getLookups(),
        databaseService.getTeams(),
        databaseService.getMembers(),
        databaseService.getPreferences()
      ]);
      setEvents(eventsData);
      setVenues(venuesData);
      setTeams(teamsData);
      setMembers(membersData);
      if (lookups) {
        setEventTypes(lookups.eventTypes || []);
        setSystems(lookups.systems || []);
      }
      if (prefs) {
        setPreviewFirstCount(prefs.preview_first_count || 4);
        setPreviewLastCount(prefs.preview_last_count || 4);
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load courts when venues are selected
  React.useEffect(() => {
    const loadCourts = async () => {
      if (formState.venueIds.length === 0) {
        setAvailableCourts([]);
        return;
      }
      try {
        const allCourts: any[] = [];
        for (const venueId of formState.venueIds) {
          const courts = await databaseService.getVenueCourts(venueId);
          const venue = venues.find(v => v.venue_id === venueId);
          courts.forEach((c: any) => allCourts.push({ ...c, venueName: venue?.name }));
        }
        setAvailableCourts(allCourts);
        // Reset court selection when venues change
        if (courtSelectionMode === 'all') {
          setFormState(prev => ({ ...prev, courtIds: allCourts.map(c => c.court_id) }));
        }
      } catch (e) {
        console.error('Failed to load courts:', e);
      }
    };
    loadCourts();
  }, [formState.venueIds]);

  // Save preferences when they change
  React.useEffect(() => {
    const savePrefs = async () => {
      await databaseService.updatePreferences(previewFirstCount, previewLastCount);
    };
    // Only save if values have been loaded (not initial render)
    if (previewFirstCount !== 4 || previewLastCount !== 4) {
      savePrefs();
    }
  }, [previewFirstCount, previewLastCount]);

  const handleAddStart = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setFormState({
      ...defaultFormState,
      startDate: dateStr
    });
    setEditingEventId(null);
    setActiveTab('General');
    setShowModal(true);
  };

  const handleEditStart = (event: TennisEvent) => {
    const start = new Date(event.start_date);
    // Extract local time components instead of UTC (toISOString)
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    const startDate = `${year}-${month}-${day}`;
    const startTime = `${hours}:${minutes}`;

    // Helper to parse comma-separated ID strings into number arrays
    const parseIds = (idStr: string | null | undefined): number[] => {
      if (!idStr) return [];
      return idStr.split(',').map(id => parseInt(id.trim())).filter(n => !isNaN(n));
    };

    const venueIds = parseIds((event as any).venue_ids);
    const courtIds = parseIds((event as any).court_ids);
    const fieldIds = parseIds((event as any).field_ids);
    // Single-select: take only first value
    const eventTypeIds = parseIds((event as any).event_type_ids).slice(0, 1);
    const systemIds = parseIds((event as any).system_ids).slice(0, 1);

    setFormState({
      name: event.name,
      description: event.description || '',
      startDate,
      startTime,
      endTime: '',
      eventTypeIds,
      systemIds,
      venueIds,
      courtIds,
      fieldIds,
      teamIds: parseIds((event as any).team_ids),
      memberIds: parseIds((event as any).member_ids),
      isSeriesEvent: false, // When editing, always treat as single event
      repeatPeriod: event.repeat_period || 'weeks',
      repeatInterval: event.repeat_interval || 1,
      totalEvents: event.total_events || 8
    });

    // Set court selection mode based on existing data
    if (courtIds.length > 0) {
      setCourtSelectionMode('select');
    }

    // Auto-show teams/members by populating search with wildcard
    const parsedTeamIds = parseIds((event as any).team_ids);
    const parsedMemberIds = parseIds((event as any).member_ids);
    if (parsedTeamIds.length > 0) {
      setTeamSearchChips(['*']);
    }
    if (parsedMemberIds.length > 0) {
      setMemberSearchChips(['*']);
    }

    setEditingEventId(event.event_id);
    setActiveTab('General');
    setShowModal(true);
  };

  // Form validation
  const isFormValid = (): boolean => {
    if (!formState.name?.trim()) return false;
    if (!formState.startDate) return false;
    if (!formState.startTime) return false;
    if (formState.isSeriesEvent) {
      if (!formState.repeatInterval || formState.repeatInterval < 1) return false;
      // If last event date/time provided, totalEvents is optional
      if (!formState.lastEventDate || !formState.lastEventTime) {
        if (!formState.totalEvents || formState.totalEvents < 2) return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const dateTimeStr = `${formState.startDate}T${formState.startTime || '09:00'}:00`;
      const startDate = new Date(dateTimeStr).getTime();

      const eventData = {
        name: formState.name,
        startDate: startDate,
        description: formState.description || undefined,
        venueIds: formState.venueIds,
        eventTypeIds: formState.eventTypeIds,
        systemIds: formState.systemIds,
        courtIds: formState.courtIds,
        fieldIds: formState.fieldIds,
        teamIds: formState.teamIds,
        memberIds: formState.memberIds
      };

      console.log('💾 Saving event with data:', eventData);

      if (editingEventId) {
        // Update existing event
        await databaseService.updateEvent(editingEventId, eventData);
      } else {
        // Create new event (with optional series)
        await databaseService.createEvent({
          ...eventData,
          isSeriesEvent: formState.isSeriesEvent,
          repeatPeriod: formState.isSeriesEvent ? formState.repeatPeriod : undefined,
          repeatInterval: formState.isSeriesEvent ? formState.repeatInterval : undefined,
          totalEvents: formState.isSeriesEvent ? formState.totalEvents : undefined,
          lastEventDate: formState.isSeriesEvent && formState.lastEventDate && formState.lastEventTime
            ? new Date(`${formState.lastEventDate}T${formState.lastEventTime}:00`).getTime()
            : undefined,
          lastEventTime: formState.isSeriesEvent ? formState.lastEventTime : undefined
        });
      }

      setShowModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const handleDelete = async () => {
    if (!editingEventId) return;

    const event = events.find(e => e.event_id === editingEventId);
    if (event?.is_series_event && event?.series_id) {
      // For series events, use two-step confirmation to give user choice
      // Step 1: Ask if they want to delete entire series
      setConfirmConfig({
        title: 'Delete This Event?',
        message: `This event is part of a series (${event.name}). Do you want to delete the ENTIRE series?`,
        isDestructive: true,
        confirmLabel: 'Yes, Delete Series',
        cancelLabel: 'No',
        onConfirm: async () => {
          // User chose to delete entire series
          await doDeleteEvent(true);
          setConfirmVisible(false);
        },
        onCancel: () => {
          // User said no to deleting series, show confirmation for single event delete
          setConfirmVisible(false);
          // Use setTimeout to avoid modal transition issues
          setTimeout(() => {
            setConfirmConfig({
              title: 'Delete This Event Only?',
              message: `Delete only this single event from the series?`,
              isDestructive: true,
              confirmLabel: 'Yes, Delete Event',
              cancelLabel: 'Cancel',
              onConfirm: async () => {
                await doDeleteEvent(false);
                setConfirmVisible(false);
              },
              onCancel: () => {
                setConfirmVisible(false);
              }
            });
            setConfirmVisible(true);
          }, 100);
        }
      });
      setConfirmVisible(true);
    } else {
      // Regular single event delete
      setConfirmConfig({
        title: 'Delete Event?',
        message: `Delete "${event?.name}"?`,
        isDestructive: true,
        confirmLabel: undefined,
        cancelLabel: undefined,
        onConfirm: async () => {
          await doDeleteEvent(false);
          setConfirmVisible(false);
        },
        onCancel: () => {
          setConfirmVisible(false);
        }
      });
      setConfirmVisible(true);
    }
  };

  const doDeleteEvent = async (deleteSeries: boolean) => {
    if (!editingEventId) return;
    try {
      await databaseService.deleteEvent(editingEventId, deleteSeries);
      setShowModal(false);
      loadData();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const promptDeleteAll = () => {
    // Get filtered events based on current search chips
    const filteredEvents = filterItemsByChips(
      events,
      searchChips,
      (event) => {
        const dateStr = formatDateForSearch(event.start_date);
        const timeStr = formatTimeForSearch(event.start_date);
        const seriesBadge = event.is_series_event ? 'SERIES' : '';
        return `
          ${event.name}
          ${event.description || ''}
          ${dateStr}
          ${timeStr}
          ${event.event_type_names || ''}
          ${event.system_names || ''}
          ${event.venue_names || ''}
          ${seriesBadge}
        `;
      },
      searchMode
    );

    const isFiltered = searchChips.length > 0;
    setConfirmConfig({
      title: isFiltered ? `Delete ${filteredEvents.length} Filtered Event${filteredEvents.length !== 1 ? 's' : ''}?` : 'Delete All Events?',
      message: isFiltered
        ? `This will permanently delete the ${filteredEvents.length} event(s) that match your current search filters (${searchChips.join(', ')}). Other events will not be affected. This cannot be undone.`
        : 'This will permanently remove ALL events from the database. This action cannot be undone.',
      isDestructive: true,
      confirmLabel: undefined,
      cancelLabel: undefined,
      onConfirm: async () => {
        try {
          if (isFiltered) {
            // Delete each filtered event individually
            for (const event of filteredEvents) {
              await databaseService.deleteEvent(event.event_id, false);
            }
          } else {
            // Delete all events
            await databaseService.deleteAllEvents();
          }
          setConfirmVisible(false);
          loadData();
        } catch (e: any) {
          console.error('Delete events error:', e);
          Alert.alert('Error', e?.message || 'Failed to delete events');
          setConfirmVisible(false);
        }
      },
      onCancel: () => {
        setConfirmVisible(false);
      }
    });
    setConfirmVisible(true);
  };

  const toggleArrayItem = (arr: number[], item: number): number[] => {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  };

  // Generate preview dates for series with rich formatting and first/last split
  const getSeriesPreviewDates = (): {
    first: { dayOfWeek: string; dateStr: string; timeStr: string; fullDate: Date }[];
    last: { dayOfWeek: string; dateStr: string; timeStr: string; fullDate: Date }[];
    total: number;
  } => {
    if (!formState.isSeriesEvent || !formState.startDate) return { first: [], last: [], total: 0 };

    const dates: { dayOfWeek: string; dateStr: string; timeStr: string; fullDate: Date }[] = [];
    const baseDate = new Date(`${formState.startDate}T${formState.startTime || '09:00'}:00`);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Calculate end boundary if provided
    const lastEventDateTime = formState.lastEventDate && formState.lastEventTime
      ? new Date(`${formState.lastEventDate}T${formState.lastEventTime}:00`)
      : null;

    // Generate all dates
    let i = 0;
    const maxIterations = formState.totalEvents || 1000; // Fallback limit

    while (i < maxIterations) {
      let nextDate = new Date(baseDate);
      switch (formState.repeatPeriod) {
        case 'hours':
          nextDate.setHours(nextDate.getHours() + (i * formState.repeatInterval));
          break;
        case 'days':
          nextDate.setDate(nextDate.getDate() + (i * formState.repeatInterval));
          break;
        case 'weeks':
          nextDate.setDate(nextDate.getDate() + (i * formState.repeatInterval * 7));
          break;
      }

      // Stop if we've passed the last event date/time
      if (lastEventDateTime && nextDate > lastEventDateTime) break;

      dates.push({
        dayOfWeek: dayNames[nextDate.getDay()],
        dateStr: `${monthNames[nextDate.getMonth()]} ${nextDate.getDate()}, ${nextDate.getFullYear()}`,
        timeStr: nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullDate: nextDate
      });

      i++;
    }

    // Split into first/last
    const total = dates.length;
    const first = dates.slice(0, Math.min(previewFirstCount, total));
    const last = total > previewFirstCount + previewLastCount
      ? dates.slice(-previewLastCount)
      : [];

    return { first, last, total };
  };

  const renderEventCard = ({ item }: { item: TennisEvent }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleEditStart(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>{item.name}</Text>
          {!!item.is_series_event && (
            <View style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600' }}>SERIES</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardDate, { color: theme.colors.text }]}>
          {new Date(item.start_date || Date.now()).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardDetail, { color: theme.colors.muted }]}>
          {new Date(item.start_date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {item.event_type_names && (
          <Text style={[styles.cardDetail, { color: theme.colors.muted }]}>{item.event_type_names}</Text>
        )}
        {item.system_names && (
          <Text style={[styles.cardDetail, { color: theme.colors.muted }]}>{item.system_names}</Text>
        )}
        {item.venue_names && (
          <Text style={[styles.cardDetail, { color: theme.colors.muted }]}>📍 {item.venue_names}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderForm = () => (
    <ScrollView style={styles.formScroll}>
      {/* General Tab */}
      {activeTab === 'General' && (
        <>
          {/* Event Type */}
          <View style={[styles.section, { borderBottomColor: theme.colors.border }, editingEventId ? { opacity: 0.5 } : undefined]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Event Type</Text>
            <Text style={[styles.helpText, { color: theme.colors.muted }]}>
              {editingEventId ? 'Event type cannot be changed when editing' : 'Create a single event or a recurring series'}
            </Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { borderColor: theme.colors.border },
                  !formState.isSeriesEvent && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => !editingEventId && setFormState(prev => ({ ...prev, isSeriesEvent: false }))}
                disabled={!!editingEventId}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: theme.colors.text },
                  !formState.isSeriesEvent && { color: 'black', fontWeight: 'bold' }
                ]}>Single Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { borderColor: theme.colors.border },
                  formState.isSeriesEvent && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => !editingEventId && setFormState(prev => ({ ...prev, isSeriesEvent: true }))}
                disabled={!!editingEventId}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: theme.colors.text },
                  formState.isSeriesEvent && { color: 'black', fontWeight: 'bold' }
                ]}>Event Series</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Event Details */}
          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Event Details</Text>

            <Text style={[styles.labelFirst, { color: theme.colors.text }]}>Event Name</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              value={formState.name}
              onChangeText={t => setFormState(prev => ({ ...prev, name: t }))}
              placeholder={formState.isSeriesEvent ? "e.g. Weekly Round Robin" : "e.g. Saturday Doubles"}
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>Event Category</Text>
            <View style={styles.chipContainer}>
              {eventTypes.map(et => (
                <TouchableOpacity
                  key={et.eventType_id}
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border },
                    formState.eventTypeIds.includes(et.eventType_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setFormState(prev => ({
                    ...prev,
                    eventTypeIds: prev.eventTypeIds.includes(et.eventType_id) ? [] : [et.eventType_id]
                  }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: theme.colors.text },
                    formState.eventTypeIds.includes(et.eventType_id) && { color: 'black', fontWeight: 'bold' }
                  ]}>{et.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.colors.text }]}>System Type</Text>
            <View style={styles.chipContainer}>
              {systems.map(s => (
                <TouchableOpacity
                  key={s.system_id}
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border },
                    formState.systemIds.includes(s.system_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setFormState(prev => ({
                    ...prev,
                    systemIds: prev.systemIds.includes(s.system_id) ? [] : [s.system_id]
                  }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: theme.colors.text },
                    formState.systemIds.includes(s.system_id) && { color: 'black', fontWeight: 'bold' }
                  ]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date & Time */}
          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date & Time</Text>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.labelFirst, { color: theme.colors.text }]}>
                  {formState.isSeriesEvent ? 'First Event Date' : 'Date'}
                </Text>
                <DateInput
                  value={formState.startDate}
                  onChange={t => setFormState(prev => ({ ...prev, startDate: t }))}
                  theme={theme}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.labelFirst, { color: theme.colors.text }]}>Time</Text>
                <TimeInput
                  value={formState.startTime}
                  onChange={t => setFormState(prev => ({ ...prev, startTime: t }))}
                  theme={theme}
                />
              </View>
            </View>
          </View>

          {/* Section 4: Series Options (conditional) */}
          {formState.isSeriesEvent && (
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Series Options</Text>

              <Text style={[styles.labelFirst, { color: theme.colors.text }]}>Repeat Every</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 60, marginRight: 8, textAlign: 'center' }]}
                  value={formState.repeatInterval.toString()}
                  onChangeText={t => setFormState(prev => ({ ...prev, repeatInterval: parseInt(t) || 1 }))}
                  keyboardType="numeric"
                />
                <View style={[styles.chipContainer, { flex: 1 }]}>
                  {(['hours', 'days', 'weeks'] as const).map(period => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.chip,
                        { borderColor: theme.colors.border },
                        formState.repeatPeriod === period && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => setFormState(prev => ({ ...prev, repeatPeriod: period }))}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: theme.colors.text, textTransform: 'capitalize' },
                        formState.repeatPeriod === period && { color: 'black', fontWeight: 'bold' }
                      ]}>{period}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={[styles.label, { color: theme.colors.text, marginTop: 12 }]}>Total Events {formState.lastEventDate ? '(Optional)' : ''}</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 80 }]}
                value={formState.totalEvents?.toString() || ''}
                onChangeText={t => setFormState(prev => ({ ...prev, totalEvents: parseInt(t) || undefined }))}
                keyboardType="numeric"
                placeholder={formState.lastEventDate ? "Optional" : "Required"}
                placeholderTextColor={theme.colors.muted}
              />
              <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>
                {formState.lastEventDate ? 'Leave empty to generate until Last Event Date/Time' : 'Minimum 2 events required'}
              </Text>

              {/* Last Event Date/Time */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Last Event Date</Text>
                  <DateInput
                    value={formState.lastEventDate || ''}
                    onChange={t => setFormState(prev => ({ ...prev, lastEventDate: t }))}
                    theme={theme}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Last Event Time</Text>
                  <TimeInput
                    value={formState.lastEventTime || ''}
                    onChange={t => setFormState(prev => ({ ...prev, lastEventTime: t }))}
                    theme={theme}
                  />
                </View>
              </View>
              <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>
                If provided, series will not generate events beyond this date/time
              </Text>

              {/* Preview Configuration */}
              <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Preview Configuration</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>Show First:</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 50, textAlign: 'center', padding: 8 }]}
                  value={previewFirstCount.toString()}
                  onChangeText={t => {
                    const num = parseInt(t) || 0;
                    if (num >= 0 && num <= 20) setPreviewFirstCount(num);
                  }}
                  keyboardType="numeric"
                />
                <Text style={{ color: theme.colors.text, fontSize: 14, marginLeft: 4 }}>Last:</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 50, textAlign: 'center', padding: 8 }]}
                  value={previewLastCount.toString()}
                  onChangeText={t => {
                    const num = parseInt(t) || 0;
                    if (num >= 0 && num <= 20) setPreviewLastCount(num);
                  }}
                  keyboardType="numeric"
                />
              </View>

              {/* Preview */}
              {(() => {
                const preview = getSeriesPreviewDates();
                return (
                  <>
                    <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>
                      Event Preview ({preview.total} event{preview.total !== 1 ? 's' : ''} total)
                    </Text>
                    <View style={[styles.previewContainer, { borderColor: theme.colors.border }]}>
                      {preview.first.map((date: any, idx: number) => (
                        <View key={idx} style={styles.previewRow}>
                          <View style={[styles.previewEventNum, { backgroundColor: theme.colors.primary }]}>
                            <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>#{idx + 1}</Text>
                          </View>
                          <View style={styles.previewDayCol}>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 }}>{date.dayOfWeek}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 14 }}>{date.dateStr}</Text>
                          </View>
                          <View style={styles.previewTimeCol}>
                            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>🕐 {date.timeStr}</Text>
                          </View>
                        </View>
                      ))}
                      {preview.last.length > 0 && (
                        <>
                          <Text style={{ color: theme.colors.muted, textAlign: 'center', marginVertical: 8, fontSize: 13 }}>
                            ... {preview.total - preview.first.length - preview.last.length} more event{preview.total - preview.first.length - preview.last.length !== 1 ? 's' : ''} ...
                          </Text>
                          {preview.last.map((date: any, idx: number) => (
                            <View key={`last-${idx}`} style={styles.previewRow}>
                              <View style={[styles.previewEventNum, { backgroundColor: theme.colors.primary }]}>
                                <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>
                                  #{preview.total - preview.last.length + idx + 1}
                                </Text>
                              </View>
                              <View style={styles.previewDayCol}>
                                <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 }}>{date.dayOfWeek}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 14 }}>{date.dateStr}</Text>
                              </View>
                              <View style={styles.previewTimeCol}>
                                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>🕐 {date.timeStr}</Text>
                              </View>
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  </>
                );
              })()}
            </View>
          )}
        </>
      )}

      {/* Venues Tab */}
      {activeTab === 'Venues' && (
        <>
          {/* Venues */}
          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Venues
            </Text>
            <SearchWithChips
              chips={venueSearchChips}
              onChipsChange={setVenueSearchChips}
              mode={venueSearchMode}
              onModeChange={setVenueSearchMode}
              placeholder="Type venue name and press ENTER..."
              resultCount={filterItemsByChips(
                venues,
                venueSearchChips,
                (v) => `${v.name} ${v.address || ''}`,
                venueSearchMode
              ).length}
              totalCount={venues.length}
            />
            <View style={styles.chipContainer}>
              {filterItemsByChips(
                venues,
                venueSearchChips,
                (v) => `${v.name} ${v.address || ''}`,
                venueSearchMode
              ).map(v => (
                <TouchableOpacity
                  key={v.venue_id}
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border },
                    formState.venueIds.includes(v.venue_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setFormState(prev => ({ ...prev, venueIds: toggleArrayItem(prev.venueIds, v.venue_id) }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: theme.colors.text },
                    formState.venueIds.includes(v.venue_id) && { color: 'black', fontWeight: 'bold' }
                  ]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
              {venues.length === 0 && (
                <Text style={{ color: theme.colors.muted }}>No venues available</Text>
              )}
            </View>
          </View>

          {/* Courts (if venues selected) */}
          {formState.venueIds.length > 0 && availableCourts.length > 0 && (
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Courts ({availableCourts.length} available)
              </Text>

              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[styles.modeButton, { borderColor: theme.colors.border }, courtSelectionMode === 'all' && { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    setCourtSelectionMode('all');
                    setFormState(prev => ({ ...prev, courtIds: availableCourts.map(c => c.court_id) }));
                  }}
                >
                  <Text style={[styles.modeButtonText, { color: theme.colors.text }, courtSelectionMode === 'all' && { color: 'black' }]}>All Courts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, { borderColor: theme.colors.border }, courtSelectionMode === 'count' && { backgroundColor: theme.colors.primary }]}
                  onPress={() => setCourtSelectionMode('count')}
                >
                  <Text style={[styles.modeButtonText, { color: theme.colors.text }, courtSelectionMode === 'count' && { color: 'black' }]}>Number</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, { borderColor: theme.colors.border }, courtSelectionMode === 'select' && { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    setCourtSelectionMode('select');
                    setFormState(prev => ({ ...prev, courtIds: [] })); // Clear for manual selection
                  }}
                >
                  <Text style={[styles.modeButtonText, { color: theme.colors.text }, courtSelectionMode === 'select' && { color: 'black' }]}>Select</Text>
                </TouchableOpacity>
              </View>

              {/* Count mode */}
              {courtSelectionMode === 'count' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>How many courts? (max {availableCourts.length})</Text>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 80, textAlign: 'center' }]}
                      value={courtCount}
                      onChangeText={text => {
                        setCourtCount(text);
                        const count = Math.min(parseInt(text) || 0, availableCourts.length);
                        setFormState(prev => ({ ...prev, courtIds: availableCourts.slice(0, count).map(c => c.court_id) }));
                      }}
                      keyboardType="numeric"
                    />
                    <Text style={{ color: theme.colors.muted, marginLeft: 12, alignSelf: 'center' }}>
                      Using: {formState.courtIds.length} courts
                    </Text>
                  </View>
                </View>
              )}

              {/* Select mode */}
              {courtSelectionMode === 'select' && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.chipContainer}>
                    {availableCourts.map(c => (
                      <TouchableOpacity
                        key={c.court_id}
                        style={[
                          styles.chip,
                          { borderColor: theme.colors.border },
                          formState.courtIds.includes(c.court_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => setFormState(prev => ({ ...prev, courtIds: toggleArrayItem(prev.courtIds, c.court_id) }))}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: theme.colors.text },
                          formState.courtIds.includes(c.court_id) && { color: 'black', fontWeight: 'bold' }
                        ]}>{c.name}{c.venueName ? ` (${c.venueName})` : ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ color: theme.colors.muted, marginTop: 8, fontSize: 13 }}>
                    Selected: {formState.courtIds.length} of {availableCourts.length}
                  </Text>
                </View>
              )}

              {courtSelectionMode === 'all' && (
                <Text style={{ color: theme.colors.muted, marginTop: 8, fontSize: 13 }}>
                  All {availableCourts.length} courts selected
                </Text>
              )}
            </View>
          )}
        </>
      )}

      {/* Participants Tab */}
      {activeTab === 'Participants' && (
        <>
          {/* Teams */}
          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Teams
            </Text>

            <SearchWithChips
              chips={teamSearchChips}
              onChipsChange={setTeamSearchChips}
              mode={teamSearchMode}
              onModeChange={setTeamSearchMode}
              placeholder="Type team name and press ENTER..."
              resultCount={filterItemsByChips(
                teams,
                teamSearchChips,
                (t) => `${t.name} ${t.sport_name || ''}`,
                teamSearchMode
              ).length}
              totalCount={teams.length}
            />

            {/* Teams List */}
            {teamSearchChips.length > 0 && (
              <View style={styles.chipContainer}>
                {filterItemsByChips(
                  teams,
                  teamSearchChips,
                  (t) => `${t.name} ${t.sport_name || ''}`,
                  teamSearchMode
                ).map(team => (
                  <TouchableOpacity
                    key={team.team_id}
                    style={[
                      styles.chip,
                      { borderColor: theme.colors.border },
                      formState.teamIds.includes(team.team_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => {
                      if (formState.teamIds.includes(team.team_id)) {
                        // Removing team - check for confirmation if editing existing event
                        const handleRemove = () => {
                          const teamMembers = members.filter(m =>
                            (m as any).teams?.some((t: any) => t.team_id === team.team_id)
                          ).map(m => m.member_id);
                          setFormState(prev => ({
                            ...prev,
                            teamIds: prev.teamIds.filter(id => id !== team.team_id),
                            memberIds: prev.memberIds.filter(mid => !teamMembers.includes(mid))
                          }));
                        };

                        if (editingEventId) {
                          const associatedMembers = formState.memberIds.filter(mid => {
                            const member = members.find(m => m.member_id === mid);
                            return (member as any).teams?.some((t: any) => t.team_id === team.team_id);
                          });
                          if (associatedMembers.length > 0) {
                            setConfirmConfig({
                              title: `Remove ${team.name}?`,
                              message: `This will also remove ${associatedMembers.length} member(s) from this team. Continue?`,
                              isDestructive: true,
                              confirmLabel: undefined,
                              cancelLabel: undefined,
                              onConfirm: () => {
                                handleRemove();
                                setConfirmVisible(false);
                              },
                              onCancel: () => {
                                setConfirmVisible(false);
                              }
                            });
                            setConfirmVisible(true);
                          } else {
                            handleRemove();
                          }
                        } else {
                          handleRemove();
                        }
                      } else {
                        // Adding team
                        setFormState(prev => ({ ...prev, teamIds: [...prev.teamIds, team.team_id] }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.text },
                        formState.teamIds.includes(team.team_id) && { color: 'black', fontWeight: 'bold' }
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {team.name} {team.sport_name ? `(${team.sport_name})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Members (only if teams selected) */}
          {formState.teamIds.length > 0 && (
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Members
              </Text>

              <SearchWithChips
                chips={memberSearchChips}
                onChipsChange={setMemberSearchChips}
                mode={memberSearchMode}
                onModeChange={setMemberSearchMode}
                placeholder="Type member name and press ENTER..."
                resultCount={filterItemsByChips(
                  members.filter(m => {
                    const memberTeams = (m as any).teams || [];
                    return formState.teamIds.some(teamId =>
                      memberTeams.some((t: any) => t.team_id === teamId)
                    );
                  }),
                  memberSearchChips,
                  (m) => {
                    const name = `${m.first_name} ${m.last_name}`;
                    const memberTeamsInEvent = (m as any).teams?.filter((t: any) =>
                      formState.teamIds.includes(t.team_id)
                    ) || [];
                    const roles = memberTeamsInEvent.map((t: any) => t.role_names || '').join(' ');
                    const positions = memberTeamsInEvent.map((t: any) => t.position_names || '').join(' ');
                    return `${name} ${roles} ${positions}`;
                  },
                  memberSearchMode
                ).length}
                totalCount={members.filter(m => {
                  const memberTeams = (m as any).teams || [];
                  return formState.teamIds.some(teamId =>
                    memberTeams.some((t: any) => t.team_id === teamId)
                  );
                }).length}
              />

              {/* Members List */}
              <View style={styles.chipContainer}>
                {filterItemsByChips(
                  members.filter(m => {
                    const memberTeams = (m as any).teams || [];
                    return formState.teamIds.some(teamId =>
                      memberTeams.some((t: any) => t.team_id === teamId)
                    );
                  }),
                  memberSearchChips,
                  (m) => {
                    const name = `${m.first_name} ${m.last_name}`;
                    const memberTeamsInEvent = (m as any).teams?.filter((t: any) =>
                      formState.teamIds.includes(t.team_id)
                    ) || [];
                    const roles = memberTeamsInEvent.map((t: any) => t.role_names || '').join(' ');
                    const positions = memberTeamsInEvent.map((t: any) => t.position_names || '').join(' ');
                    return `${name} ${roles} ${positions}`;
                  },
                  memberSearchMode
                ).map(member => (
                  <TouchableOpacity
                    key={member.member_id}
                    style={[
                      styles.chip,
                      { borderColor: theme.colors.border },
                      formState.memberIds.includes(member.member_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => {
                      if (formState.memberIds.includes(member.member_id)) {
                        // Remove member
                        const handleRemove = () => {
                          setFormState(prev => ({
                            ...prev,
                            memberIds: prev.memberIds.filter(id => id !== member.member_id)
                          }));
                        };

                        if (editingEventId) {
                          setConfirmConfig({
                            title: 'Remove Member?',
                            message: `Remove ${member.first_name} ${member.last_name} from this event?`,
                            isDestructive: true,
                            confirmLabel: undefined,
                            cancelLabel: undefined,
                            onConfirm: () => {
                              handleRemove();
                              setConfirmVisible(false);
                            },
                            onCancel: () => {
                              setConfirmVisible(false);
                            }
                          });
                          setConfirmVisible(true);
                        } else {
                          handleRemove();
                        }
                      } else {
                        // Add member
                        setFormState(prev => ({ ...prev, memberIds: [...prev.memberIds, member.member_id] }));
                      }
                    }}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: theme.colors.text },
                      formState.memberIds.includes(member.member_id) && { color: 'black', fontWeight: 'bold' }
                    ]}>
                      {member.first_name} {member.last_name}
                      {(() => {
                        const memberTeamsInEvent = (member as any).teams?.filter((t: any) =>
                          formState.teamIds.includes(t.team_id)
                        ) || [];
                        const roles = memberTeamsInEvent.map((t: any) => t.role_names).filter(Boolean).join(', ');
                        const positions = memberTeamsInEvent.map((t: any) => t.position_names).filter(Boolean).join(', ');
                        const details = [roles, positions].filter(Boolean).join(' • ');
                        return details ? ` (${details})` : '';
                      })()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Events"
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: '#d9534f' }]} onPress={promptDeleteAll}>
              <Text style={styles.buttonTextWhite}>
                {searchChips.length > 0
                  ? `Delete Filtered (${filterItemsByChips(
                    events,
                    searchChips,
                    (event) => {
                      const dateStr = formatDateForSearch(event.start_date);
                      const timeStr = formatTimeForSearch(event.start_date);
                      const seriesBadge = event.is_series_event ? 'SERIES' : '';
                      return `${event.name} ${event.description || ''} ${dateStr} ${timeStr} ${event.event_type_names || ''} ${event.system_names || ''} ${event.venue_names || ''} ${seriesBadge}`;
                    },
                    searchMode
                  ).length})`
                  : `Delete All (${events.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddStart}>
              <Text style={styles.addButtonText}>New Event</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      ) : (
        <>
          {/* Search with Chips */}
          <SearchWithChips
            chips={searchChips}
            onChipsChange={setSearchChips}
            mode={searchMode}
            onModeChange={setSearchMode}
            placeholder="Search events by name, date, time, type..."
            topSpacing={true}
            resultCount={filterItemsByChips(
              events,
              searchChips,
              (event) => {
                const dateStr = formatDateForSearch(event.start_date);
                const timeStr = formatTimeForSearch(event.start_date);
                const seriesBadge = event.is_series_event ? 'SERIES' : '';
                return `${event.name} ${event.description || ''} ${dateStr} ${timeStr} ${event.event_type_names || ''} ${event.system_names || ''} ${event.venue_names || ''} ${seriesBadge}`;
              },
              searchMode
            ).length}
            totalCount={events.length}
          />
          <FlatList
            data={filterItemsByChips(
              events,
              searchChips,
              (event) => {
                const dateStr = formatDateForSearch(event.start_date);
                const timeStr = formatTimeForSearch(event.start_date);
                const seriesBadge = event.is_series_event ? 'SERIES' : '';
                return `${event.name} ${event.description || ''} ${dateStr} ${timeStr} ${event.event_type_names || ''} ${event.system_names || ''} ${event.venue_names || ''} ${seriesBadge}`;
              },
              searchMode
            )}
            keyExtractor={item => item.event_id?.toString() || Math.random().toString()}
            renderItem={renderEventCard}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>No events found.</Text>
            }
          />
        </>
      )}

      {/* Event Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {editingEventId ? 'Edit Event' : 'New Event'}
            </Text>
            <Tabs activeTab={activeTab} onChange={setActiveTab} />
            {renderForm()}
            <View style={styles.modalButtons}>
              {editingEventId && (
                <TouchableOpacity style={[styles.deleteButton, { backgroundColor: '#d9534f' }]} onPress={handleDelete}>
                  <Text style={styles.buttonTextWhite}>Delete</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.muted }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: isFormValid() ? theme.colors.primary : theme.colors.muted },
                  !isFormValid() && { opacity: 0.5 }
                ]}
                onPress={handleSave}
                disabled={!isFormValid()}
              >
                <Text style={[styles.saveButtonText, !isFormValid() && { color: theme.colors.text }]}>
                  {(() => {
                    if (formState.isSeriesEvent) {
                      const preview = getSeriesPreviewDates();
                      return `Create ${preview.total} Event${preview.total !== 1 ? 's' : ''}`;
                    }
                    return editingEventId ? 'Save' : 'Create';
                  })()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={confirmVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel={confirmConfig.cancelLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
        isDestructive={confirmConfig.isDestructive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 15 },
  card: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardDate: { fontSize: 14 },
  cardBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardDetail: { fontSize: 14 },
  seriesBadge: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  addButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { color: 'black', fontWeight: 'bold' },
  deleteButtonHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { maxWidth: MAX_CONTENT_WIDTH, maxHeight: '90%', borderRadius: 12, borderWidth: 1, padding: 20, display: 'flex', flexDirection: 'column', alignSelf: 'center', width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  formScroll: { flexGrow: 1, paddingRight: 16 },

  // Sections
  section: { paddingBottom: 16, marginBottom: 8, marginTop: 8, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  helpText: { fontSize: 14, marginBottom: 12 },

  // Form elements (use commonStyles for most, keep screen-specific ones here)
  formGroup: commonStyles.formGroup,
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  label: commonStyles.label,
  labelFirst: commonStyles.labelFirst,
  input: commonStyles.input,

  // Chips (use common styles)
  chipContainer: commonStyles.chipContainer,
  chip: commonStyles.chip,
  chipText: commonStyles.chipText,

  // Mode selector
  modeSelector: { flexDirection: 'row', gap: 12 },
  modeButton: { flex: 1, padding: 16, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  modeButtonText: { fontSize: 14, fontWeight: '600' },

  // Preview
  previewContainer: { padding: 12, borderWidth: 1, borderRadius: 8, marginTop: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
  previewEventNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  previewDayCol: { width: 40, marginRight: 8 },
  previewTimeCol: { minWidth: 70, alignItems: 'flex-end' },
  previewDate: { fontSize: 14, marginBottom: 4 },
  previewMore: { fontSize: 12, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },

  // Modal buttons
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  cancelButton: { padding: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  saveButton: { padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  deleteButton: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  buttonText: { fontWeight: '600' },
  buttonTextWhite: { color: 'white', fontWeight: 'bold' },
  saveButtonText: { color: 'black', fontWeight: 'bold' },

  // Tab styles
  tabContainer: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  tab: { paddingVertical: 10, paddingHorizontal: 20 },
  tabText: { fontWeight: '600' }
});
