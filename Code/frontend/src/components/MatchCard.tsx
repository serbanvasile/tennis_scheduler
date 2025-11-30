import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Match } from "../types";
import { useStore } from "../store";

export const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
  const roster = useStore((s) => s.roster);
  const name = (pid: string) =>
    roster.find((p) => p.id === pid)?.displayName || pid;
  return (
    <View style={styles.card}>
      <Text style={styles.time}>{match.timeSlot}</Text>
      <View style={styles.row}>
        <Text numberOfLines={1}>{name(match.teamA[0])}</Text>
        <Text> & </Text>
        <Text numberOfLines={1}>{name(match.teamA[1])}</Text>
      </View>
      <Text style={styles.vs}>vs</Text>
      <View style={styles.row}>
        <Text numberOfLines={1}>{name(match.teamB[0])}</Text>
        <Text> & </Text>
        <Text numberOfLines={1}>{name(match.teamB[1])}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  time: { fontWeight: "600", marginBottom: 6 },
  row: { flexDirection: "row", flexWrap: "nowrap" },
  vs: { textAlign: "center", marginVertical: 4, opacity: 0.6 }
});
