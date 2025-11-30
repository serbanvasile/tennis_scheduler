import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../ui/theme';

export default function AnalyticsScreen() {
  const { 
    roster, 
    matches, 
    calculateFairnessMetrics, 
    calculatePlayerStats, 
    playerStats 
  } = useStore();
  const { theme } = useTheme();

  // Calculate overall fairness metrics
  const overallMetrics = calculateFairnessMetrics();
  
  // Calculate current week fairness if there are matches
  const currentWeekId = matches.length > 0 ? matches[matches.length - 1].weekId : undefined;
  const weeklyMetrics = currentWeekId ? calculateFairnessMetrics(currentWeekId) : null;

  const renderFairnessCard = (title: string, metrics: any) => (
    <View style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadowColor }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>{title}</Text>
      <View style={styles.metricsGrid}>
        <View style={[styles.metric, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.muted }]}>Partner Diversity</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{metrics.partnerDiversity.toFixed(1)}</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.muted }]}>Opponent Diversity</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{metrics.opponentDiversity.toFixed(1)}</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.muted }]}>Skill Balance</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{metrics.skillBalance.toFixed(1)}</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.muted }]}>Court Balance</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{metrics.courtBalance.toFixed(1)}</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.metricLabel, { color: theme.colors.muted }]}>Overall Fairness</Text>
          <Text style={[styles.metricValue, styles.overallScore, { color: theme.colors.accent }]}>
            {metrics.overallFairness.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPlayerStats = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadowColor }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Player Statistics</Text>
      <ScrollView style={styles.playersList}>
        {roster.map(player => {
          const stats = calculatePlayerStats(player.id);
          return (
            <View key={player.id} style={[styles.playerRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.playerName, { color: theme.colors.text }]}>{player.displayName}</Text>
              <View style={styles.playerStatsRow}>
                <Text style={[styles.statText, { color: theme.colors.muted }]}>Matches: {stats.totalMatches}</Text>
                <Text style={[styles.statText, { color: theme.colors.muted }]}>
                  Partners: {Object.keys(stats.partners).length}
                </Text>
                <Text style={[styles.statText, { color: theme.colors.muted }]}>
                  Opponents: {Object.keys(stats.opponents).length}
                </Text>
                <Text style={[styles.statText, { color: theme.colors.muted }]}>Skill: {player.skill}</Text>
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
      <View style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadowColor }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Partner Distribution Matrix</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>Shows how many times each player has partnered with others</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View style={styles.matrixRow}>
              <View style={[styles.matrixCell, { borderColor: theme.colors.border }]}>
                <Text style={[styles.matrixHeaderText, { color: theme.colors.primary }]}>Player</Text>
              </View>
              {roster.slice(0, 8).map(player => (
                <View key={player.id} style={[styles.matrixCell, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.matrixHeaderText, { color: theme.colors.primary }]} numberOfLines={1}>
                    {player.displayName.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Data rows */}
            {roster.slice(0, 8).map(player => (
              <View key={player.id} style={styles.matrixRow}>
                <View style={[styles.matrixCell, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.matrixPlayerText, { color: theme.colors.text }]} numberOfLines={1}>
                    {player.displayName.split(' ')[0]}
                  </Text>
                </View>
                {roster.slice(0, 8).map(partner => (
                  <View key={partner.id} style={[styles.matrixCell, { borderColor: theme.colors.border }]}>
                    <Text style={[styles.matrixValueText, { color: theme.colors.accent }]}>
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>Tennis League Analytics</Text>
      
      {renderFairnessCard('Overall Season Metrics', overallMetrics)}
      
      {weeklyMetrics && renderFairnessCard('Current Week Metrics', weeklyMetrics)}
      
      {renderPlayerStats()}
      
      {renderPartnerMatrix()}
      
      <View style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadowColor }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Algorithm Insights</Text>
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          • Partner Diversity: Measures how evenly players are distributed as partners
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          • Skill Balance: How well-matched teams are in terms of combined skill levels
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          • Court Balance: How evenly players are distributed across different courts
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          • Overall Fairness: Combined score weighing all fairness factors
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
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
    borderRadius: 6,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  overallScore: {
    fontSize: 20,
  },
  playersList: {
    maxHeight: 300,
  },
  playerRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
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
  },
  matrixHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  matrixPlayerText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  matrixValueText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
});
