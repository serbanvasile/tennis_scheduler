import React, { useMemo, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useStore } from "./src/store";
import type { Week } from "./src/types";
import { CourtColumn } from "./src/components/CourtColumn";
import AnalyticsScreen from "./src/components/AnalyticsScreen";
import RosterScreen from "./src/components/RosterScreen";
import CalendarScreen from "./src/components/CalendarScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardScreen() {
  const weeks = useStore((s) => s.weeks);
  const league = useStore((s) => s.league);
  const generateWeek = useStore((s) => s.generateWeek);
  const latest = weeks[weeks.length - 1];
  
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.title}>{league.name}</Text>
      <Text style={{ marginBottom: 12 }}>Weeks created: {weeks.length}</Text>
      <Button 
        title="Create Next Week" 
        onPress={() => generateWeek(weeks.length)} 
      />
      {latest && (
        <Text style={{ marginTop: 16 }}>
          Last week: {new Date(latest.dateISO).toDateString()}
        </Text>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function WeeksListScreen({ navigation }: any) {
  const weeks = useStore((s) => s.weeks);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={weeks}
        keyExtractor={(w: Week) => w.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate("WeekDetail", { id: item.id })}
          >
            <Text style={styles.itemTitle}>
              Week {item.index + 1} — {new Date(item.dateISO).toDateString()}
            </Text>
            <Text style={{ opacity: 0.6 }}>{item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ padding: 16 }}>
            No weeks yet. Create one from Dashboard.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function WeekDetailScreen({ route }: any) {
  const { id } = route.params;
  const league = useStore((s) => s.league);
  const makeSchedule = useStore((s) => s.makeSchedule);
  const matches = useStore((s) => s.matches.filter((m) => m.weekId === id));
  
  const generateIfEmpty = () => {
    if (matches.length === 0) makeSchedule(id);
  };

  const columns = useMemo(
    () => league.courts.map((c) => <CourtColumn key={c.id} courtId={c.id} label={c.label} />),
    [league.courts, matches.length]
  );

  return (
    <SafeAreaView style={{ flex: 1, padding: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }}
      >
        <Text style={styles.title}>Schedule</Text>
        <Button
          title={matches.length === 0 ? "Generate" : "Regenerate"}
          onPress={generateIfEmpty}
        />
      </View>
      <View style={{ flexDirection: "row" }}>{columns}</View>
    </SafeAreaView>
  );
}

function WeeksStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="WeeksList" component={WeeksListScreen} options={{ title: "Weeks" }} />
      <Stack.Screen name="WeekDetail" component={WeekDetailScreen} options={{ title: "Week Detail" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Roster" component={RosterScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700" },
  item: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd"
  },
  itemTitle: { fontWeight: "600", marginBottom: 4 }
});
