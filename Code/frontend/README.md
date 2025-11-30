# Tennis Scheduler Expo Starter

A decentralized tennis scheduling application built with React Native and Expo. This app allows tennis groups to organize weekly doubles matches with fair rotation and automatic scheduling.

## Features

- **Player Management**: Add and manage players with skill levels
- **Court Management**: Configure multiple courts with time slots
- **Automatic Scheduling**: Generate fair doubles matches with skill balancing
- **Weekly Organization**: Create and manage weekly schedules
- **Availability Tracking**: Players can set their availability for each week
- **Offline-First**: Works without internet connection
- **Decentralized**: No central server required

## Quick Start

1. **Prerequisites**
   - Node.js 18 or higher
   - Expo CLI (or use npx)

2. **Installation**
   ```bash
   npm install
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Start the App**
   ```bash
   npm start
   ```

5. **Using the App**
   - Go to Dashboard → "Create Next Week" to add a week
   - Navigate to Weeks → select the week → "Generate" to auto-build doubles schedule
   - View the generated matches organized by court

## Project Structure

```
Code/
├── App.tsx                     # Main application component
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
└── src/
    ├── types.ts               # TypeScript type definitions
    ├── store.ts               # Zustand state management
    ├── matchmaker.ts          # Scheduling algorithms
    ├── components/
    │   ├── MatchCard.tsx      # Individual match display
    │   └── CourtColumn.tsx    # Court layout component
    └── __tests__/
        └── matchmaker.test.ts # Unit tests
```

## Demo Data

The app comes with pre-configured demo data:
- 12 sample players with varying skill levels
- 3 courts with 2 time slots each (6:00 PM and 7:15 PM)
- Thursday Doubles league setup

## Current Implementation Status

This is a starter implementation that includes:
- ✅ Basic player roster management
- ✅ Court and time slot configuration
- ✅ Simple skill-based matchmaking algorithm
- ✅ Week generation and scheduling
- ✅ Basic navigation and UI
- ✅ Unit tests for core algorithms

## Future Features (Planned)

Based on the design specification, future versions will include:
- Advanced fairness algorithms (partner/opponent diversity)
- Player availability management with deadlines
- Statistics and analytics (partner matrix, court balance)
- Manual schedule editing with drag-and-drop
- Substitution marketplace
- Real-time collaboration with CRDT
- Decentralized data storage (Ceramic/OrbitDB)
- Messaging and notifications
- Export to calendar/CSV
- Web version via React Native Web

## Configuration Questions

For the next iteration, please provide feedback on:

1. **MAYBE Availability**: Should players marked as "maybe" be automatically included in scheduling (current behavior) or excluded unless the captain overrides?

2. **Overflow Handling**: When there are more player pairs than available court slots, should extras be:
   - Auto-marked as sit-outs with fair rotation
   - Offered to a substitute pool
   - Left unscheduled for manual assignment

## Technology Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tooling
- **TypeScript**: Type safety and developer experience
- **Zustand**: Lightweight state management
- **React Navigation**: Navigation and routing
- **Jest**: Testing framework

## License

GPL-3.0 (application) / MIT (matchmaker library)

## Contributing

This is a starter implementation. Contributions welcome for expanding features toward the full decentralized vision outlined in the design specification.
