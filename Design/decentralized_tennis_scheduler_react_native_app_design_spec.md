# Decentralized Tennis Scheduler – React Native App (Design Spec)

## 0) Overview

**Goal:** Build a cross‑platform (iOS/Android/Web via React Native Web) app for organizing weekly doubles tennis with fully decentralized data ownership, offline-first UX, fair scheduling/rotation, and transparent stats. The screenshot you shared (Excel prototype) drives the core: weekly sheets with court assignments, player availability, fairness metrics, and running tallies.

**Key ideas**

- Wallet/DID sign-in (no central accounts).
- Data is user-owned, stored on decentralized databases (Ceramic/ComposeDB or GUN/OrbitDB) and content-addressed blobs on IPFS.
- Optional on-chain smart contract for league governance (access control/season registry/fee escrow) on low-cost EVM chain (e.g., Base/Polygon). All scheduling math runs client-side.
- CRDT-based collaboration for live schedule editing without a server.

---

## 1) Personas & Primary Scenarios

**Captain/Organizer**

- Creates a **League** (season), sets courts, dates, rules, fairness weights.
- Publishes weekly draws (pairings & court/time slots).
- Locks/edits results, exports reports.

**Player**

- Proposes availability (Y/N/M): playing vs sub vs off.
- Views schedule, lineups, partners/opponents history.
- Confirms attendance; sees reminders; proposes trades/subs.

**Substitute Pool**

- Accepts open spots with stake/deposit (optional on-chain escrow).

**Spectator/Analyst**

- Reads public stats/leaderboards.

---

## 2) Functional Requirements

1. **Season & Weeks**: create seasons; generate weeks (dates), skip holidays.
2. **Courts & Time Slots**: define courts, times; capacity constraints.
3. **Roster & Roles**: add players with skill level, left/right hand, preferred partners, conflicts.
4. **Availability**: per-week availability with deadline and reminders.
5. **Matchmaking**: algorithm creates doubles pairings + court assignment meeting fairness goals (see §8).
6. **Manual Overrides**: drag-and-drop or edit; CRDT merges edits.
7. **Stats**: track plays/partners/opponents, court balance, wins/losses, Elo/USTA-like ratings (optional), attendance.
8. **Fairness Metrics**: equalize partner diversity, opponent diversity, court exposure, sit-outs, skill balance.
9. **Results & Scoring**: enter set scores or fast-4; recompute ratings.
10. **Messaging**: week chat + DMs (Matrix/Delta chat), mention players.
11. **Substitution Market**: publish open slot; subs claim; organizer approves. Optional token escrow/refund rules.
12. **Audit Trail**: all changes signed by DIDs; immutable event log.
13. **Exports**: CSV/ICS calendar; public share links.
14. **Offline-first**: works without internet; syncs later with strong conflict resolution.

---

## 3) Non‑Functional Requirements

- Cross‑platform RN app; **RN Web** for desktop usability.
- **Decentralized**: No central backend required. Nodes: user devices + optional community gateway for lighting up P2P.
- **Security/Privacy**: end-to-end encryption for private leagues; public read for public leagues.
- **Performance**: schedule generation <1s for ≤64 players × 8 courts × 52 weeks.
- **Reliability**: deterministic results from same inputs; CRDT for concurrent edits.

---

## 4) Architecture

**Client**: React Native (Expo). State in Zustand/Redux Toolkit + local SQLite/WatermelonDB. **Data Layer (decentralized)**

- **Primary**: Ceramic/ComposeDB (DIDs + Graph DB) **or** GUN/OrbitDB (CRDT doc store).
- **Files** (exports, PDFs): IPFS via Web3.Storage/Lighthouse.
- **Messaging**: Matrix (E2EE) or P2P WebRTC datachannel. **Smart Contracts (optional)**
- SeasonRegistry (EVM): league creation, membership NFT, fee escrow for subs, access policy hashes. **Sync**:
- CRDT docs: `league`, `week`, `roster`, `availability`, `schedule`, `scores`, `audit`.
- PubSub via libp2p; background sync workers.

**High‑Level Flow**

1. Wallet connects → DID; load league graph from Ceramic/OrbitDB.
2. Organizer tweaks parameters → runs **matchmaker** locally → writes `schedule` doc.
3. Peers sync via CRDT; changes signed; conflicts auto-merge.
4. Results posted → stats recompute locally → summary written.

---

## 5) Data Model (TypeScript types)

```ts
// Identity
type DID = string; // did:key / did:pkh

export type League = {
  id: string;             // CID/streamID
  name: string;
  season: { startISO: string; endISO: string; weekDays: number[] }; // e.g., [4] for Thu
  courts: Court[];
  rules: Rules;
  visibility: 'public' | 'private';
  adminDIDs: DID[];
  createdBy: DID;
  createdAt: string;      // ISO
  policyHash?: string;    // snapshot of on-chain policy
};

export type Court = { id: string; label: string; location?: string; timeSlots: string[] }; // e.g., ['18:00','19:15']

export type Player = {
  id: string; // DID
  displayName: string;
  phone?: string; // stored encrypted
  skill: number; // 1..10
  handed: 'L'|'R'|'A';
  tags?: string[];
};

export type Week = {
  id: string; leagueId: string; index: number; dateISO: string;
  status: 'draft'|'published'|'completed'|'cancelled';
  notes?: string;
};

export type Availability = {
  weekId: string; playerId: DID; state: 'yes'|'no'|'maybe';
  updatedAt: string; signature: string; // signed by player
};

export type Match = {
  id: string; weekId: string; courtId: string; timeSlot: string;
  teamA: DID[]; teamB: DID[]; // 2 each
  generatedBy: DID; lock?: boolean;
};

export type Score = {
  matchId: string; setScores: [number,number][]; winner: 'A'|'B'|'split'|'NA';
  submittedBy: DID; updatedAt: string; signature: string;
};

export type StatsSnapshot = {
  weekId: string; metrics: Record<string, number | string>;
};

export type Rules = {
  targetPairsPerSeason: number;
  balanceWeights: {
    partners: number; opponents: number; courts: number; sitouts: number; skillParity: number;
  };
  maxCourtsPerWeek?: number; allowSubs: boolean; ratingSystem: 'none'|'elo';
};

export type AuditEvent = {
  id: string; type: string; actor: DID; at: string; payloadCID: string; sig: string;
};
```

---

## 6) CRDT Document Shapes

- `league` (LWW map)
- `roster` (G-Set of Player DIDs + profiles)
- `week` (list, index-ordered)
- `availability` (MV-Register per (week,player))
- `schedule` (list of matches + LWW for per-match edits)
- `scores` (append-only log; last-signer-wins for corrections by admin)
- `audit` (append-only log; verifiable signatures)

---

## 7) On‑Chain Contract Sketch (optional)

**SeasonRegistry.sol** (EVM)

- `createLeague(bytes32 policyHash)` → `leagueId` (emits event)
- `joinLeague(leagueId)` → mints **Membership NFT/SBT** (gates Ceramic streams)
- `setFee(leagueId, amount)` (captain)
- `openSubSlot(weekId, matchId)` → escrow; `claimSub()`; `resolveSub()`
- Events mirrored into off-chain graph for UX.

**Security**: minimal funds; no PII on-chain; only hashed policy/URIs.

---

## 8) Matchmaking / Fairness Algorithm

**Inputs**: players available Y, courts/timeSlots, historic pairings/opponents/courts, skill ratings, weights.

**Objective**: minimize total cost `C = w1*partnerRepeat + w2*opponentRepeat + w3*courtImbalance + w4*sitoutImbalance + w5*skillSpread` subject to constraints: doubles (2v2), everyone plays ≤1 time slot (unless allowed), courts capacity.

**Approach**

- Model as **integer program** (assignment) or fast **heuristic**:
  1. Build all candidate teams using skill parity window (|avgA-avgB| ≤ δ).
  2. Score team vs team based on history.
  3. Place matches into time slots using greedy + tabu search.
  4. If unfilled, propose subs or sitouts minimizing imbalance.
- Deterministic seed per week so same inputs ⇒ same schedule across peers.

**Pseudocode**

```pseudo
seed = hash(league.id + week.index)
P = shuffle(availablePlayers, seed)
T = enumerateBalancedTeams(P, skillWindow)
M = []
for each timeslot*court:
  pick teamA from T minimizing repeat costs
  pick best teamB compatible with teamA
  M.add(match)
  remove players from pool
if players left over:
  mark sitouts by least-recent players first
return M
```

**Fairness Metrics (mirroring Excel sheet)**

- Partner diversity score per player (1 - repeats/unique partners target).
- Opponent diversity score.
- Court exposure balance (avg per court/time slot).
- Schedule count counts vs target.
- Rolling averages per player (displayed like the prototype).

---

## 9) UX / Screens & Component Trees

**Stack**: React Navigation (tabs + nested stacks). Design system via **Tamagui** or **NativeWind**. Light/dark mode.

1. **Wallet & League Gate**

- `WalletScreen`: Connect (RainbowKit RN / WalletConnect). Show DID.
- `LeaguePicker`: list leagues (Ceramic query). Join/create.

2. **Dashboard**

- Cards: "This Week", Availability status, Next match, Fairness meters, Recent results.

3. **Weeks**

- `WeekListScreen`: calendar list; holiday badges; lock status.
- `WeekDetailScreen`:
  - Header: date, publish state, metrics.
  - Tabs: **Schedule**, **Availability**, **Stats**, **Chat**.
  - **Schedule**: court columns (like Excel) with draggable cards (React DnD with Gestures); lock toggle.
  - **Availability**: grid (players × state), bulk nudge.
  - **Stats**: partner/opponent matrix heatmap; running averages (mirroring prototype right/left panes).

4. **Roster**

- List + filters; player profile with history, skill chart, partner network graph.

5. **Match**

- Score entry; timer; ball icon for live.

6. **Sub Market**

- Open slots; single tap to claim; escrow status.

7. **Settings**

- Rules, weights sliders; courts/time slots; export; backup/restore keys.

**Accessibility**: large touch targets, VoiceOver labels, high-contrast charts.

---

## 10) State Machines

**Week lifecycle**: `draft → published → (completed | cancelled)`

- Guards: cannot publish without 90% availability or captain override; cannot complete without scores or explicit finalize.

**Availability**: `unknown → (yes|no|maybe)`; transitions signed by player.

**Match**: `scheduled → in_progress → (completed | void)`

---

## 11) Security & Privacy

- **AuthN**: WalletConnect → DID (did\:pkh) or did\:key for non-crypto users.
- **AuthZ**: League ACL stored in Ceramic doc; enforced in UI + contract (if used).
- **PII**: phone/emails encrypted with league key (Lit Protocol / ECIES with captain + member keys).
- **Backups**: user’s device holds keys; optional social recovery via multiple guardians.

---

## 12) Offline & Sync Details

- Local DB (SQLite) caches all docs.
- CRDT merge strategy:
  - Schedules: LWW per field; admin override wins.
  - Scores: append log; highest role precedence.
- Peer discovery: web via public bootstrap nodes; mobile via relays.

---

## 13) Telemetry (Opt‑in, privacy‑preserving)

- Local performance logs; if user opts in, anonymous metrics to a community-owned aggregator (OpenTelemetry to IPFS snapshots).

---

## 14) Theming & Visual Language

- Clean grid mirroring the Excel prototype: **Court columns** + **weekly rows**.
- Colors: neutral UI with accent chips for availability (Yes=green, Maybe=amber, No=red), partners/opponents badges.
- Typography: Inter/SF; numeric tabular figures for tables.

---

## 15) Example Component Hierarchy (RN)

```
<App>
  <NavigationContainer>
    <TabNavigator>
      <DashboardStack/>
      <WeeksStack>
        <WeekListScreen/>
        <WeekDetailScreen>
          <ScheduleTab>
            <CourtColumn/> × N
              <MatchCard/> × M
          </ScheduleTab>
          <AvailabilityTab>
            <AvailabilityGrid/>
          </AvailabilityTab>
          <StatsTab>
            <PartnerMatrix/>
            <FairnessMeters/>
          </StatsTab>
          <ChatTab/>
        </WeekDetailScreen>
      </WeeksStack>
      <RosterStack/>
      <SubMarketStack/>
      <SettingsStack/>
    </TabNavigator>
  </NavigationContainer>
</App>
```

---

## 16) Key Screens – Wireframe Notes

**ScheduleTab**

- Sticky header with week date + Publish button.
- Column per court/time. Drag to reorder; hold to swap teams.
- Badge chips show fairness deltas when swapping.

**AvailabilityGrid**

- Rows=players, Cols=time slots; tap cycles Yes/Maybe/No; long-press leave note.

**StatsTab**

- Partner heatmap (players × players) with filters (last 4/8/12 weeks).
- Court exposure bar chart; sitout counter; rolling averages like prototype.

---

## 17) Scheduling Engine Interfaces

```ts
export interface MatchmakerInput {
  league: League; week: Week; roster: Player[]; availability: Availability[];
  history: { matches: Match[]; scores: Score[] };
}
export interface MatchmakerOutput { matches: Match[]; metrics: Record<string, number>; diagnostics?: string[] }
export type Matchmaker = (i: MatchmakerInput) => MatchmakerOutput;
```

- Engine runs in WebWorker/JSI thread; deterministic PRNG `seedrandom(week.id)`.

---

## 18) Example Fairness Metrics (per player)

- `playsCount` (season, last N weeks)
- `uniquePartners` / `targetPartners`
- `uniqueOpponents`
- `courtBalanceVariance`
- `avgCourt#`, `avgTimeSlotIndex`
- `sitouts`
- `rollingAvgDev` (to mirror prototype’s left table of averages)

---

## 19) Testing Strategy

- **Unit**: matchmaker invariants, CRDT merges, signature verification.
- **Property-based**: QuickCheck on fairness (no repeats > K in N weeks).
- **E2E**: Detox for RN mobile; Playwright for web.
- **Simulations**: randomized seasons to ensure stability.

---

## 20) Migration / Interop

- Import from Excel/CSV (map to League/Roster/Weeks).
- Export schedule/stats back to CSV; ICS invites.

---

## 21) Delivery Plan (MVP → v1)

**MVP (6–8 weeks)**

- Wallet sign-in; create league; roster; availability; basic greedy matchmaker; schedule grid; publish; local-only storage with optional simple peer sync (GUN).

**v0.9**

- Ceramic schemas; CRDT sync; stats & heatmaps; CSV import/export.

**v1.0**

- Sub market + optional escrow contract; Matrix chat; advanced tabu matchmaker; access policies; backups; RN Web build.

---

## 22) Risk & Mitigations

- **P2P connectivity on mobile**: use relay/bootstrap; fall back to community gateway (open-source, user-hosted).
- **Key loss**: social recovery kits; iCloud/Keystore encrypted backup (opt-in).
- **Complex fairness goals**: provide presets + transparent diagnostics.

---

## 23) Example Ceramic/ComposeDB Schema Snippets

```graphql
# League.graphql
type League @createModel(accountRelation: LIST, description: "Tennis league") {
  name: String!
  seasonStart: DateTime!
  seasonEnd: DateTime!
  weekDays: [Int!]!
  courts: [Court!]!
  rules: JSON!
  visibility: String!
  adminDIDs: [DID!]!
}

type Court { id: ID!, label: String!, location: String, timeSlots: [String!]! }
```

---

## 24) Open Source & Licenses

- GPL-3.0 or AGPL for app; permissive MIT for matchmaker library to encourage adoption.
- Reuse: `libp2p`, `gun`, `ceramic`, `tamagui/nativewind`, `react-native-reanimated`, `react-native-gesture-handler`.

---

## 25) Acceptance Criteria (MVP)

- Organizer can create season, define courts, import roster, collect availability, auto-generate a week’s doubles schedule, publish, and export CSV — all without any server.
- Another device, after pairing via DID, sees the same schedule via P2P sync.
- Swapping two players updates fairness counters live.

---

## 26) Appendix – Mapping to the Excel Prototype

- **Left grid** → Availability + Rolling Averages tables.
- **Middle block** → Week schedule for Courts 1–3; player highlights; per-court averages.
- **Right block** → Week schedule for Courts 4+; totals and running counts.
- **Top badges** → Player highlight toggles; partner/opponent counts; play-same-court stats.

(These are represented in **WeekDetail → Schedule/Stats** tabs with chips, badges, and heatmaps.)

