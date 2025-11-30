import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';

export default function AnalyticsScreen() {
  const { 
    roster, 
    matches, 
    calculateFairnessMetrics, 
    calculatePlayerStats, 
    playerStats 
  } = useStore();

  // Calculate overall fairness metrics
  const overallMetrics = calculateFairnessMetrics();
  
  // Calculate current week fairness if there are matches
  const currentWeekId = matches.length > 0 ? matches[matches.length - 1].weekId : undefined;
  const weeklyMetrics = currentWeekId ? calculateFairnessMetrics(currentWeekId) : null;

  const renderFairnessCard = (title: string, metrics: any) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Partner Diversity</Text>
          <Text style={styles.metricValue}>{metrics.partnerDiversity.toFixed(1)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Opponent Diversity</Text>
          <Text style={styles.metricValue}>{metrics.opponentDiversity.toFixed(1)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Skill Balance</Text>
          <Text style={styles.metricValue}>{metrics.skillBalance.toFixed(1)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Court Balance</Text>
          <Text style={styles.metricValue}>{metrics.courtBalance.toFixed(1)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Overall Fairness</Text>
          <Text style={[styles.metricValue, styles.overallScore]}>
            {metrics.overallFairness.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPlayerStats = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Player Statistics</Text>
      <ScrollView style={styles.playersList}>
        {roster.map(player => {
          const stats = calculatePlayerStats(player.id);
          return (
            <View key={player.id} style={styles.playerRow}>
              <Text style={styles.playerName}>{player.displayName}</Text>
              <View style={styles.playerStatsRow}>
                <Text style={styles.statText}>Matches: {stats.totalMatches}</Text>
                <Text style={styles.statText}>
                  Partners: {Object.keys(stats.partners).length}
                </Text>
                <Text style={styles.statText}>
                  Opponents: {Object.keys(stats.opponents).length}
                </Text>
                <Text style={styles.statText}>Skill: {player.skill}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderPartnerMatrix = () => {
    const partnerMatrix: Record<string, Record<string, number>> = {};
    
    // Build partner matrix
    roster.forEach(player => {
      const stats = calculatePlayerStats(player.id);
      partnerMatrix[player.id] = stats.partners;
    });

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Partner Distribution Matrix</Text>
        <Text style={styles.subtitle}>Shows how many times each player has partnered with others</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View style={styles.matrixRow}>
              <View style={styles.matrixCell}>
                <Text style={styles.matrixHeaderText}>Player</Text>
              </View>
              {roster.slice(0, 8).map(player => (
                <View key={player.id} style={styles.matrixCell}>
                  <Text style={styles.matrixHeaderText} numberOfLines={1}>
                    {player.displayName.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Data rows */}
            {roster.slice(0, 8).map(player => (
              <View key={player.id} style={styles.matrixRow}>
                <View style={styles.matrixCell}>
                  <Text style={styles.matrixPlayerText} numberOfLines={1}>
                    {player.displayName.split(' ')[0]}
                  </Text>
                </View>
                {roster.slice(0, 8).map(partner => (
                  <View key={partner.id} style={styles.matrixCell}>
                    <Text style={styles.matrixValueText}>
                      {player.id === partner.id ? '-' : 
                       (partnerMatrix[player.id]?.[partner.id] || 0)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tennis League Analytics</Text>
      
      {renderFairnessCard('Overall Season Metrics', overallMetrics)}
      
      {weeklyMetrics && renderFairnessCard('Current Week Metrics', weeklyMetrics)}
      
      {renderPlayerStats()}
      
      {renderPartnerMatrix()}
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Algorithm Insights</Text>
        <Text style={styles.infoText}>
          • Partner Diversity: Measures how evenly players are distributed as partners
        </Text>
        <Text style={styles.infoText}>
          • Skill Balance: How well-matched teams are in terms of combined skill levels
        </Text>
        <Text style={styles.infoText}>
          • Court Balance: How evenly players are distributed across different courts
        </Text>
        <Text style={styles.infoText}>
          • Overall Fairness: Combined score weighing all fairness factors
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2e7d32',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1976d2',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metric: {
    width: '48%',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  overallScore: {
    color: '#1976d2',
    fontSize: 20,
  },
  playersList: {
    maxHeight: 300,
  },
  playerRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  playerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  matrixRow: {
    flexDirection: 'row',
  },
  matrixCell: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  matrixHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  matrixPlayerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  matrixValueText: {
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
});
