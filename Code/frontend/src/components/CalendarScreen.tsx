import React, { useState, useEffect } from 'react';
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
  Platform
} from 'react-native';
import { databaseService } from '../database/sqlite-service';

// Event types
type EventType = 'singles' | 'doubles';
type EventSystem = 'adhoc' | 'round-robin' | 'playoff' | 'swiss' | 'elimination';
type RepeatPeriod = 'hours' | 'days' | 'weeks';

interface TennisEvent {
  id: string;
  title: string;
  startDateTime: string; // ISO string
  endDateTime?: string; // ISO string
  courts: number;
  eventType: EventType;
  system?: EventSystem;
  isSeriesEvent: boolean;
  seriesId?: string; // Links events in a series
  totalMatches?: number;
  repeatPeriod?: RepeatPeriod;
  repeatInterval?: number; // e.g., every 2 weeks
  createdAt: string;
  updatedAt: string;
}

interface CalendarScreenProps {
  // Add any props if needed
}

export default function CalendarScreen({}: CalendarScreenProps) {
  const [events, setEvents] = useState<TennisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'series' | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TennisEvent | null>(null);

  // Form state for new events
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    courts: 1,
    eventType: 'doubles' as EventType,
    system: 'adhoc' as EventSystem,
    totalMatches: 1,
    repeatPeriod: 'weeks' as RepeatPeriod,
    repeatInterval: 1
  });

  useEffect(() => {
    loadEvents();
    initializeDefaultDates();
  }, []);

  const initializeDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const endDate = new Date(tomorrow);
    endDate.setMonth(endDate.getMonth() + 2);
    
    setNewEvent(prev => ({
      ...prev,
      startDate: tomorrow.toISOString().split('T')[0],
      startTime: '09:00',
      endDate: endDate.toISOString().split('T')[0],
      endTime: '17:00'
    }));
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 loadEvents: Starting to load events...');
      
      const eventsData = await databaseService.getAllEvents(true);
      console.log('📅 loadEvents: Raw events from database:', eventsData.length, 'events');
      
      // Update event titles with series numbering
      const processedEvents = eventsData.map(event => {
        if (event.isSeriesEvent && event.seriesEventNumber) {
          // Extract base title (remove any existing " - Event X" suffix)
          const baseTitle = event.title.replace(/ - Event \d+$/, '');
          return {
            ...event,
            title: `${baseTitle} - Event ${event.seriesEventNumber}`
          };
        }
        return event;
      });
      
      console.log('✅ loadEvents: Processed events:', processedEvents.length, 'events');
      console.log('🔍 loadEvents: First 3 processed events:', processedEvents.slice(0, 3).map(e => ({ id: e.id, title: e.title, start: e.startDateTime })));
      setEvents(processedEvents);
      console.log('📊 loadEvents: State should now have', processedEvents.length, 'events');
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };


  const generateEventId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const generateSeriesId = () => {
    return 'series-' + Math.random().toString(36).substr(2, 9);
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      courts: 1,
      eventType: 'doubles',
      system: 'adhoc',
      totalMatches: 1,
      repeatPeriod: 'weeks',
      repeatInterval: 1
    });
    initializeDefaultDates();
  };

  const handleAddEvent = () => {
    if (events.length === 0) {
      // No events exist, go directly to add mode selection
      setShowAddModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleEditEvent = (event: TennisEvent) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleClearAllEvents = () => {
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete all events? This action cannot be undone.')
      : true;
      
    if (confirmed) {
      clearAllEvents();
    }
  };

  const clearAllEvents = async () => {
    try {
      setLoading(true);
      await databaseService.clearAllEvents(true);
      await loadEvents();
    } catch (err) {
      console.error('Failed to clear events:', err);
      setError('Failed to clear events: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.startDate || !newEvent.startTime) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}`).toISOString();
      const endDateTime = newEvent.endDate && newEvent.endTime 
        ? new Date(`${newEvent.endDate}T${newEvent.endTime}`).toISOString()
        : undefined;

      const eventsToCreate: any[] = [];

      if (addMode === 'single') {
        // Create single event
        const event = {
          id: generateEventId(),
          title: newEvent.title,
          startDateTime,
          endDateTime,
          courts: newEvent.courts,
          eventType: newEvent.eventType,
          system: newEvent.system,
          isSeriesEvent: false,
          createdAt: now,
          updatedAt: now
        };
        eventsToCreate.push(event);
      } else if (addMode === 'series') {
        // Create series of events
        const seriesId = generateSeriesId();
        const startDate = new Date(`${newEvent.startDate}T${newEvent.startTime}`);
        const endDate = new Date(`${newEvent.endDate}T${newEvent.endTime || '23:59'}`);
        
        let currentDate = new Date(startDate);
        let eventCount = 0;
        
        while (currentDate <= endDate && eventCount < newEvent.totalMatches) {
          const event = {
            id: generateEventId(),
            title: newEvent.title, // Base title without numbering
            startDateTime: currentDate.toISOString(),
            courts: newEvent.courts,
            eventType: newEvent.eventType,
            system: newEvent.system,
            isSeriesEvent: true,
            seriesId,
            totalMatches: newEvent.totalMatches,
            repeatPeriod: newEvent.repeatPeriod,
            repeatInterval: newEvent.repeatInterval,
            createdAt: now,
            updatedAt: now
          };
          
          eventsToCreate.push(event);
          eventCount++;
          
          // Calculate next date based on repeat period
          switch (newEvent.repeatPeriod) {
            case 'hours':
              currentDate.setHours(currentDate.getHours() + newEvent.repeatInterval);
              break;
            case 'days':
              currentDate.setDate(currentDate.getDate() + newEvent.repeatInterval);
              break;
            case 'weeks':
              currentDate.setDate(currentDate.getDate() + (newEvent.repeatInterval * 7));
              break;
          }
        }
      }

      // Save to database
      console.log('💾 Creating events in database:', eventsToCreate.length, 'events');
      await databaseService.createEvents(eventsToCreate, true);
      console.log('✅ Events created successfully');
      
      // Reset form first
      resetForm();
      setShowAddModal(false);
      setAddMode(null);
      
      // Reload events to get updated list with series numbering
      console.log('🔄 Reloading events after creation...');
      await loadEvents();
      console.log('✅ Events reloaded after creation');
    } catch (err) {
      console.error('Failed to create event(s):', err);
      setError('Failed to create event(s): ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const formatEventDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const renderEvent = ({ item }: { item: TennisEvent }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => handleEditEvent(item)}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.isSeriesEvent && (
          <View style={styles.seriesBadge}>
            <Text style={styles.seriesText}>SERIES</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.eventDateTime}>
        {formatEventDateTime(item.startDateTime)}
      </Text>
      
      <View style={styles.eventDetails}>
        <Text style={styles.eventDetail}>
          Courts: {item.courts} | Type: {item.eventType} | System: {item.system}
        </Text>
      </View>
      
      {item.isSeriesEvent && (
        <Text style={styles.eventSeries}>
          Part of {item.totalMatches} match series (Every {item.repeatInterval} {item.repeatPeriod})
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderAddModeSelection = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Add Tennis Event</Text>
      <Text style={styles.modalSubtitle}>Choose the type of event to create:</Text>
      
      <TouchableOpacity 
        style={styles.modeButton} 
        onPress={() => setAddMode('single')}
      >
        <Text style={styles.modeButtonText}>Single Event</Text>
        <Text style={styles.modeButtonDesc}>Create one standalone tennis event</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.modeButton} 
        onPress={() => setAddMode('series')}
      >
        <Text style={styles.modeButtonText}>Series of Events</Text>
        <Text style={styles.modeButtonDesc}>Create multiple recurring tennis events</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={() => setShowAddModal(false)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEventForm = () => (
    <ScrollView style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        {addMode === 'single' ? 'Add Single Event' : 'Add Event Series'}
      </Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Event Title</Text>
        <TextInput
          style={styles.input}
          value={newEvent.title}
          onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
          placeholder="Tennis Tournament"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Start Date</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={newEvent.startDate}
            onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
            style={{
              padding: 12,
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #e9ecef',
              backgroundColor: '#fff',
              width: '100%',
              boxSizing: 'border-box'
            }}
            min={new Date().toISOString().split('T')[0]}
          />
        ) : (
          <TextInput
            style={styles.input}
            value={newEvent.startDate}
            onChangeText={(text) => setNewEvent({ ...newEvent, startDate: text })}
            placeholder="2024-10-27"
            placeholderTextColor="#999"
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Start Time</Text>
        {Platform.OS === 'web' ? (
          <input
            type="time"
            value={newEvent.startTime}
            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
            style={{
              padding: 12,
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #e9ecef',
              backgroundColor: '#fff',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          <TextInput
            style={styles.input}
            value={newEvent.startTime}
            onChangeText={(text) => setNewEvent({ ...newEvent, startTime: text })}
            placeholder="09:00"
            placeholderTextColor="#999"
          />
        )}
      </View>

      {addMode === 'series' && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>End Date (for series)</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={newEvent.endDate}
                onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #e9ecef',
                  backgroundColor: '#fff',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                min={newEvent.startDate}
              />
            ) : (
              <TextInput
                style={styles.input}
                value={newEvent.endDate}
                onChangeText={(text) => setNewEvent({ ...newEvent, endDate: text })}
                placeholder="2024-12-27"
                placeholderTextColor="#999"
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>End Time (for series)</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #e9ecef',
                  backgroundColor: '#fff',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <TextInput
                style={styles.input}
                value={newEvent.endTime}
                onChangeText={(text) => setNewEvent({ ...newEvent, endTime: text })}
                placeholder="17:00"
                placeholderTextColor="#999"
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Total Matches</Text>
            <TextInput
              style={styles.input}
              value={newEvent.totalMatches.toString()}
              onChangeText={(text) => setNewEvent({ ...newEvent, totalMatches: parseInt(text) || 1 })}
              placeholder="8"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Repeat Every</Text>
            <View style={styles.repeatRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                value={newEvent.repeatInterval.toString()}
                onChangeText={(text) => setNewEvent({ ...newEvent, repeatInterval: parseInt(text) || 1 })}
                placeholder="1"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <View style={styles.pickerContainer}>
                {(['hours', 'days', 'weeks'] as RepeatPeriod[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      newEvent.repeatPeriod === period && styles.periodButtonActive
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, repeatPeriod: period })}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      newEvent.repeatPeriod === period && styles.periodButtonTextActive
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Number of Courts</Text>
        <TextInput
          style={styles.input}
          value={newEvent.courts.toString()}
          onChangeText={(text) => setNewEvent({ ...newEvent, courts: parseInt(text) || 1 })}
          placeholder="4"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Event Type</Text>
        <View style={styles.pickerContainer}>
          {(['singles', 'doubles'] as EventType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                newEvent.eventType === type && styles.typeButtonActive
              ]}
              onPress={() => setNewEvent({ ...newEvent, eventType: type })}
            >
              <Text style={[
                styles.typeButtonText,
                newEvent.eventType === type && styles.typeButtonTextActive
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>System</Text>
        <View style={styles.pickerContainer}>
          {(['round-robin', 'playoff', 'swiss', 'elimination'] as EventSystem[]).map((system) => (
            <TouchableOpacity
              key={system}
              style={[
                styles.systemButton,
                newEvent.system === system && styles.systemButtonActive
              ]}
              onPress={() => setNewEvent({ ...newEvent, system: system })}
            >
              <Text style={[
                styles.systemButtonText,
                newEvent.system === system && styles.systemButtonTextActive
              ]}>
                {system}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formActions}>
        <View style={styles.editModalButtons}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              resetForm();
              setAddMode(null);
              setShowAddModal(false);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateEvent}
          >
            <Text style={styles.createButtonText}>
              {addMode === 'single' ? 'Create Event' : 'Create Series'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderEditModal = () => {
    if (!editingEvent) return null;
    
    return (
      <ScrollView style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Event</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerCancelButton} 
              onPress={() => {
                setEditingEvent(null);
                setShowEditModal(false);
              }}
            >
              <Text style={styles.headerCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerSaveButton} 
              onPress={handleSaveEvent}
            >
              <Text style={styles.headerSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={editingEvent.title}
            onChangeText={(text) => setEditingEvent({ ...editingEvent, title: text })}
            placeholder="Tennis Tournament"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Start Date</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[0] : ''}
              onChange={(e) => {
                const newDateTime = editingEvent.startDateTime 
                  ? editingEvent.startDateTime.split('T')[1] 
                  : '09:00:00.000Z';
                setEditingEvent({ 
                  ...editingEvent, 
                  startDateTime: `${e.target.value}T${newDateTime}` 
                });
              }}
              style={{
                padding: 12,
                fontSize: 16,
                borderRadius: 8,
                border: '1px solid #e9ecef',
                backgroundColor: '#fff',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[0] : ''}
              onChangeText={(text) => {
                const time = editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[1] : '09:00:00.000Z';
                setEditingEvent({ ...editingEvent, startDateTime: `${text}T${time}` });
              }}
              placeholder="2024-10-27"
              placeholderTextColor="#999"
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Start Time</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[1].slice(0, 5) : ''}
              onChange={(e) => {
                const date = editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[0] : new Date().toISOString().split('T')[0];
                setEditingEvent({ 
                  ...editingEvent, 
                  startDateTime: `${date}T${e.target.value}:00.000Z` 
                });
              }}
              style={{
                padding: 12,
                fontSize: 16,
                borderRadius: 8,
                border: '1px solid #e9ecef',
                backgroundColor: '#fff',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[1].slice(0, 5) : ''}
              onChangeText={(text) => {
                const date = editingEvent.startDateTime ? editingEvent.startDateTime.split('T')[0] : new Date().toISOString().split('T')[0];
                setEditingEvent({ ...editingEvent, startDateTime: `${date}T${text}:00.000Z` });
              }}
              placeholder="09:00"
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Number of Courts</Text>
          <TextInput
            style={styles.input}
            value={editingEvent.courts?.toString() || '1'}
            onChangeText={(text) => setEditingEvent({ ...editingEvent, courts: parseInt(text) || 1 })}
            placeholder="4"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.pickerContainer}>
            {(['singles', 'doubles'] as EventType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  editingEvent.eventType === type && styles.typeButtonActive
                ]}
                onPress={() => setEditingEvent({ ...editingEvent, eventType: type })}
              >
                <Text style={[
                  styles.typeButtonText,
                  editingEvent.eventType === type && styles.typeButtonTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>System</Text>
          <View style={styles.pickerContainer}>
            {(['adhoc', 'round-robin', 'playoff', 'swiss', 'elimination'] as EventSystem[]).map((system) => (
              <TouchableOpacity
                key={system}
                style={[
                  styles.systemButton,
                  editingEvent.system === system && styles.systemButtonActive
                ]}
                onPress={() => setEditingEvent({ ...editingEvent, system: system })}
              >
                <Text style={[
                  styles.systemButtonText,
                  editingEvent.system === system && styles.systemButtonTextActive
                ]}>
                  {system}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteEvent}
        >
          <Text style={styles.deleteButtonText}>Delete Event</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const handleSaveEvent = async () => {
    if (!editingEvent) return;

    try {
      setLoading(true);
      
      await databaseService.updateEvent(editingEvent.id, {
        title: editingEvent.title,
        startDateTime: editingEvent.startDateTime,
        endDateTime: editingEvent.endDateTime,
        courts: editingEvent.courts,
        eventType: editingEvent.eventType,
        system: editingEvent.system,
        isSeriesEvent: editingEvent.isSeriesEvent,
        seriesId: editingEvent.seriesId,
        totalMatches: editingEvent.totalMatches,
        repeatPeriod: editingEvent.repeatPeriod,
        repeatInterval: editingEvent.repeatInterval
      }, true);
      
      // Reload events
      await loadEvents();
      
      // Close modal
      setEditingEvent(null);
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update event:', err);
      setError('Failed to update event: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    const confirmed = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete "${editingEvent.title}"?`)
      : true;
      
    if (!confirmed) return;

    try {
      setLoading(true);
      
      await databaseService.deleteEvent(editingEvent.id, true);
      
      // Close modal first
      setEditingEvent(null);
      setShowEditModal(false);
      
      // Then reload events
      await loadEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError('Failed to delete event: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.headerButtons}>
          {events.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAllEvents}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={handleAddEvent}>
            <Text style={styles.addButtonText}>
              {events.length === 0 ? 'Add First Event' : '+ Add Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Events Scheduled</Text>
          <Text style={styles.emptyText}>Get started by creating your first tennis event</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddEvent}>
            <Text style={styles.emptyButtonText}>Add New Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {console.log('🎯 Rendering FlatList with events:', events.length, 'events')}
          {console.log('🎯 FlatList data preview:', events.slice(0, 3).map(e => ({ id: e.id, title: e.title })))}
          <FlatList
            data={events}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            style={styles.eventsList}
          />
        </>
      )}

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {addMode === null ? renderAddModeSelection() : renderEventForm()}
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {renderEditModal()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  eventsList: {
    flex: 1,
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  seriesBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  seriesText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventDateTime: {
    fontSize: 16,
    color: '#3498db',
    marginBottom: 8,
  },
  eventDetails: {
    marginBottom: 4,
  },
  eventDetail: {
    fontSize: 14,
    color: '#6c757d',
  },
  eventSeries: {
    fontSize: 12,
    color: '#e74c3c',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerCancelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  headerSaveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  modeButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  modeButtonDesc: {
    fontSize: 14,
    color: '#6c757d',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  periodButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeButtonActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  systemButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  systemButtonActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  systemButtonText: {
    fontSize: 14,
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  systemButtonTextActive: {
    color: '#fff',
  },
  formActions: {
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});