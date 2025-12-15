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
import { TennisEvent, Venue, System } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';

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
  // Series options
  isSeriesEvent: boolean;
  repeatPeriod: 'hours' | 'days' | 'weeks';
  repeatInterval: number;
  totalEvents: number;
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

export default function CalendarScreen() {
  const [events, setEvents] = useState<TennisEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formState, setFormState] = useState<EventFormState>(defaultFormState);

  // Confirmation modal for delete all
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, isDestructive: false });

  // Court selection - available courts based on selected venues
  const [availableCourts, setAvailableCourts] = useState<any[]>([]);
  const [courtSelectionMode, setCourtSelectionMode] = useState<'all' | 'select' | 'count'>('all');
  const [courtCount, setCourtCount] = useState('4');

  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, venuesData, lookups] = await Promise.all([
        databaseService.getAllEvents(),
        databaseService.getVenues(),
        databaseService.getLookups()
      ]);
      setEvents(eventsData);
      setVenues(venuesData);
      if (lookups) {
        setEventTypes(lookups.eventTypes || []);
        setSystems(lookups.systems || []);
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

  const handleAddStart = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setFormState({
      ...defaultFormState,
      startDate: dateStr
    });
    setEditingEventId(null);
    setShowModal(true);
  };

  const handleEditStart = (event: TennisEvent) => {
    const start = new Date(event.start_date);
    const startDate = start.toISOString().split('T')[0];
    const startTime = start.toISOString().split('T')[1].substring(0, 5);

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
      isSeriesEvent: false, // When editing, always treat as single event
      repeatPeriod: event.repeat_period || 'weeks',
      repeatInterval: event.repeat_interval || 1,
      totalEvents: event.total_events || 8
    });

    // Set court selection mode based on existing data
    if (courtIds.length > 0) {
      setCourtSelectionMode('select');
    }

    setEditingEventId(event.event_id);
    setShowModal(true);
  };

  // Form validation
  const isFormValid = (): boolean => {
    if (!formState.name?.trim()) return false;
    if (!formState.startDate) return false;
    if (!formState.startTime) return false;
    if (formState.isSeriesEvent) {
      if (!formState.repeatInterval || formState.repeatInterval < 1) return false;
      if (!formState.totalEvents || formState.totalEvents < 2) return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const dateTimeStr = `${formState.startDate}T${formState.startTime || '09:00'}:00.000Z`;
      const startDate = new Date(dateTimeStr).getTime();

      const eventData = {
        name: formState.name,
        startDate: startDate,
        description: formState.description || undefined,
        venueIds: formState.venueIds,
        eventTypeIds: formState.eventTypeIds,
        systemIds: formState.systemIds,
        courtIds: formState.courtIds,
        fieldIds: formState.fieldIds
      };

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
          totalEvents: formState.isSeriesEvent ? formState.totalEvents : undefined
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
      // For series, use confirmation modal with series options
      setConfirmConfig({
        title: 'Delete Series Event?',
        message: 'This event is part of a series. Delete entire series or just this one?',
        isDestructive: true,
        onConfirm: async () => {
          await doDeleteEvent(true); // Delete entire series
          setConfirmVisible(false);
        }
      });
      setConfirmVisible(true);
    } else {
      // Regular single event delete
      setConfirmConfig({
        title: 'Delete Event?',
        message: `Delete "${event?.name}"?`,
        isDestructive: true,
        onConfirm: async () => {
          await doDeleteEvent(false);
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
    setConfirmConfig({
      title: 'Delete All Events?',
      message: 'This will permanently remove ALL events. This cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        await databaseService.deleteAllEvents();
        setConfirmVisible(false);
        loadData();
      }
    });
    setConfirmVisible(true);
  };

  const toggleArrayItem = (arr: number[], item: number): number[] => {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  };

  // Generate preview dates for series with rich formatting
  const getSeriesPreviewDates = (): { dayOfWeek: string; dateStr: string; timeStr: string; fullDate: Date }[] => {
    if (!formState.isSeriesEvent || !formState.startDate) return [];

    const dates: { dayOfWeek: string; dateStr: string; timeStr: string; fullDate: Date }[] = [];
    const baseDate = new Date(`${formState.startDate}T${formState.startTime || '09:00'}:00`);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < Math.min(formState.totalEvents, 10); i++) {
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
      dates.push({
        dayOfWeek: dayNames[nextDate.getDay()],
        dateStr: `${monthNames[nextDate.getMonth()]} ${nextDate.getDate()}, ${nextDate.getFullYear()}`,
        timeStr: nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullDate: nextDate
      });
    }
    return dates;
  };

  const renderEventCard = ({ item }: { item: TennisEvent }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleEditStart(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>{item.name}</Text>
          {item.is_series_event && (
            <Text style={[styles.seriesBadge, { color: theme.colors.muted }]}>Series Event</Text>
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
      {/* Section 1: Single or Series */}
      <View style={[styles.section, { borderBottomColor: theme.colors.border }, editingEventId ? { opacity: 0.5 } : undefined]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Event Type</Text>
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

      {/* Section 2: Event Details */}
      <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Event Details</Text>

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

      {/* Section 3: Date & Time */}
      <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Date & Time</Text>

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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Series Options</Text>

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

          <Text style={[styles.label, { color: theme.colors.text, marginTop: 12 }]}>Total Events</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, width: 80 }]}
            value={formState.totalEvents.toString()}
            onChangeText={t => setFormState(prev => ({ ...prev, totalEvents: parseInt(t) || 1 }))}
            keyboardType="numeric"
          />

          {/* Preview */}
          <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Preview (first {Math.min(formState.totalEvents, 10)} events)</Text>
          <View style={[styles.previewContainer, { borderColor: theme.colors.border }]}>
            {getSeriesPreviewDates().map((date, idx) => (
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
            {formState.totalEvents > 10 && (
              <Text style={[styles.previewMore, { color: theme.colors.muted }]}>
                ...and {formState.totalEvents - 10} more events
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Section 5: Venues */}
      <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {formState.isSeriesEvent ? '5' : '4'}. Venues
        </Text>
        <View style={styles.chipContainer}>
          {venues.map(v => (
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

      {/* Section 6: Courts (if venues selected) */}
      {formState.venueIds.length > 0 && availableCourts.length > 0 && (
        <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {formState.isSeriesEvent ? '6' : '5'}. Courts ({availableCourts.length} available)
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
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Calendar"
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: '#d9534f' }]} onPress={promptDeleteAll}>
              <Text style={styles.buttonTextWhite}>Delete All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddStart}>
              <Text style={styles.addButtonText}>+ New Event</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.event_id?.toString() || Math.random().toString()}
          renderItem={renderEventCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>No events found.</Text>
          }
        />
      )}

      {/* Event Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {editingEventId ? 'Edit Event' : 'New Event'}
            </Text>
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
                  {formState.isSeriesEvent ? `Create ${formState.totalEvents} Events` : (editingEventId ? 'Save' : 'Create')}
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
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmVisible(false)}
        isDestructive={confirmConfig.isDestructive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
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
  modalContent: { width: '90%', maxWidth: MAX_CONTENT_WIDTH, maxHeight: '90%', borderRadius: 12, borderWidth: 1, padding: 20, display: 'flex', flexDirection: 'column' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  formScroll: { flexGrow: 1, paddingRight: 16 },

  // Sections
  section: { paddingBottom: 16, marginBottom: 8, marginTop: 8, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  helpText: { fontSize: 14, marginBottom: 12 },

  // Form elements
  formGroup: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  label: { marginBottom: 6, marginTop: 12, fontWeight: '500', fontSize: 14 },
  labelFirst: { marginBottom: 6, marginTop: 0, fontWeight: '500', fontSize: 14 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1 },

  // Chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12 },

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
  saveButtonText: { color: 'black', fontWeight: 'bold' }
});
