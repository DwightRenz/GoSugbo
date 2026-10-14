GoSugbo Expo conversion starter

This patch contains a first React Native conversion of the Lovable Home screen and the three image assets used by the source project.

Apply it to your existing Expo project:
1. Make a backup copy of your current mobile/src/app/index.tsx.
2. Extract this ZIP into your existing GoSugbo project folder (the folder that contains mobile, web, and go-moalboal-express-main).
3. Allow Windows to merge folders and replace only mobile/src/app/index.tsx if asked.
4. Start Expo from a terminal:
   cd mobile
   npx expo start
5. Scan the QR with Expo Go.

No extra packages are required for this Home screen; it uses React Native and Expo's existing setup.
The bottom tabs are a visual navigation starter: Home is implemented, and other tabs show a small "next to convert" notice. Next we can convert Rides, Food, Activity, and Profile screens.
