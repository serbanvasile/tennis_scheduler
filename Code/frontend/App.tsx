import React, { useMemo, useEffect } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
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
import { ThemeProvider, useTheme, MAX_CONTENT_WIDTH } from "./src/ui/theme";
import { useStore } from "./src/store";
import type { Week } from "./src/types";
import { CourtColumn } from "./src/components/CourtColumn";
import AnalyticsScreen from "./src/components/AnalyticsScreen";
import RosterScreen from "./src/components/RosterScreen";
import CalendarScreen from "./src/components/CalendarScreen";
import TeamsScreen from "./src/components/TeamsScreen";
import VenuesScreen from "./src/components/VenuesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardScreen({ navigation }: any) {
  const { theme } = useTheme();
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.text,
    });
  }, [navigation, theme]);
  const weeks = useStore((s) => s.weeks);
  const league = useStore((s) => s.league);
  const generateWeek = useStore((s) => s.generateWeek);
  const latest = weeks[weeks.length - 1];

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{league.name}</Text>
      <Text style={{ marginBottom: 12, color: theme.colors.text }}>Weeks created: {weeks.length}</Text>
      <Button
        title="Create Next Week"
        onPress={() => generateWeek(weeks.length)}
      />
      {latest && (
        <Text style={{ marginTop: 16, color: theme.colors.text }}>
          Last week: {new Date(latest.dateISO).toDateString()}
        </Text>
      )}
      <StatusBar style="light" />
    </SafeAreaView>
  );
}


function WeeksListScreen({ navigation }: any) {
  const weeks = useStore((s) => s.weeks);
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={weeks}
        keyExtractor={(w: Week) => w.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate("WeekDetail", { id: item.id })}
          >
            <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
              Week {item.index + 1} — {new Date(item.dateISO).toDateString()}
            </Text>
            <Text style={{ opacity: 0.6, color: theme.colors.muted }}>{item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ padding: 16, color: theme.colors.text }}>
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
  const { theme } = useTheme();

  const generateIfEmpty = () => {
    if (matches.length === 0) makeSchedule(id);
  };

  const columns = useMemo(
    () => league.courts.map((c) => <CourtColumn key={c.id} courtId={c.id} label={c.label} />),
    [league.courts, matches.length]
  );

  return (
    <SafeAreaView style={{ flex: 1, padding: 8, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>Schedule</Text>
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
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    >
      <Stack.Screen name="WeeksList" component={WeeksListScreen} options={{ title: "Weeks" }} />
      <Stack.Screen name="WeekDetail" component={WeekDetailScreen} options={{ title: "Week Detail" }} />
    </Stack.Navigator>
  );
}

// ColorSlider is now used for theme customization
import { ColorSlider } from "./src/components/ColorSlider";

function DateTimeHeader() {
  const { theme } = useTheme();
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <Text style={{ color: theme.colors.muted, fontSize: 13, marginLeft: 16 }}>
      {dateStr} • {timeStr}
    </Text>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, overflow: 'hidden' }}>
        <NavigationContainer theme={theme.name === 'dark' ? DarkTheme : DefaultTheme}>
          <Tab.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.surface, height: 50 },
              headerTintColor: theme.colors.text,
              headerTitle: () => null,
              headerLeft: () => <DateTimeHeader />,
              headerRight: () => <ColorSlider />,
              tabBarStyle: {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.background,
                borderTopWidth: 16,
                height: 65,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              },
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.muted,
              tabBarLabelStyle: { fontSize: 12, marginTop: 1, marginBottom: 6 },
              tabBarIcon: ({ focused, color }) => (
                <Text style={{ fontSize: 16, color, marginTop: 6 }}>
                  {focused ? '▼' : '▽'}
                </Text>
              ),
              tabBarLabelPosition: 'below-icon',
            }}
          >
            <Tab.Screen name="Teams" component={TeamsScreen} />
            <Tab.Screen name="Roster" component={RosterScreen} />
            <Tab.Screen name="Venues" component={VenuesScreen} />
            <Tab.Screen name="Events" component={CalendarScreen} />
            <Tab.Screen name="Analytics" component={AnalyticsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700" },
  item: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTitle: { fontWeight: "600", marginBottom: 4 }
});
