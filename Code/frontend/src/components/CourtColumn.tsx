import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useStore } from "../store";
import type { Match } from "../types";
import { MatchCard } from "./MatchCard";

export const CourtColumn: React.FC<{ courtId: string; label: string }> = ({
  courtId,
  label
}) => {
  const matches = useStore((s) => s.matches.filter((m) => m.courtId === courtId));
  return (
    <View style={styles.col}>
      <Text style={styles.header}>{label}</Text>
      {matches.length === 0 && <Text style={{ opacity: 0.6 }}>No matches yet</Text>}
      {matches.map((m: Match) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  col: { flex: 1, padding: 8 },
  header: { fontWeight: "700", marginBottom: 8 }
});
