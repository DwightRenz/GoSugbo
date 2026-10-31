# GoSugbo

GoSugbo is a mobile app built with Expo, React Native, and TypeScript. The app source is in the `mobile/` directory.

## Set up the project

### Requirements

- [Node.js](https://nodejs.org/) with npm
- [Expo Go](https://expo.dev/go) on a phone, or an Android emulator / iOS simulator

### Install and start

From the repository root, install the mobile app's dependencies and start Expo:

```bash
cd mobile
npm install
npm run start
```

When the development server starts, scan its QR code with Expo Go to open the app on a phone. For an emulator or simulator, use the options shown in the terminal, or run one of these commands from `mobile/`:

```bash
npm run android
npm run ios
npm run web
```

The iOS simulator command requires macOS and Xcode. Android development requires an Android emulator or a connected device configured for development.

## Useful commands

Run these from the `mobile/` directory:

| Command | What it does |
| --- | --- |
| `npm run start` | Start the Expo development server |
| `npm run android` | Start the app on Android |
| `npm run ios` | Start the app on the iOS simulator |
| `npm run web` | Start the web version |
| `npm run lint` | Run Expo lint |
| `npm run reset-project` | Reset the Expo starter project (use with care) |

## Project structure

- `mobile/src/app/` — app screens and Expo Router routes
- `mobile/src/components/` — reusable UI components
- `mobile/src/hooks/` — shared React hooks
- `mobile/assets/` — images, icons, and other assets
- `mobile/app.json` — Expo app configuration

## Tech stack

- Expo SDK 57
- React Native 0.86
- Expo Router
- TypeScript
