# Go Moalboal Express

Build a **mobile-first customer application UI called GoSugbo**, inspired by the simple, practical ride-booking experience of Maxim and the food delivery experience of Grab. Create an original design; do not copy their logos, exact layouts, or branding.

**Brand identity**
- App name: GoSugbo
- Tagline: Your Town. Your Way.
- Primary color: Teal `#0F766E`
- Accent color: Mint `#D1FAE5`
- Background: `#F8FAFC`
- Text: Dark slate `#0F172A`
- Use a modern, clean, friendly, trustworthy visual style.
- Use rounded cards, subtle shadows, clear typography, recognizable icons, and comfortable touch targets.
- Design primarily for mobile screens around 375–430px wide.
- The experience should feel like a real mobile app, not a desktop website squeezed onto a phone.

**IMPORTANT SCOPE**
Build only the customer-facing UI and frontend interactions for now. Use realistic mock data. Do not implement authentication services, databases, payment gateways, real GPS tracking, driver applications, admin dashboards, or machine learning yet. Keep the code organized so these can be added later.

### 1. Main Home Screen
Create a welcoming home screen with:
- GoSugbo logo or simple text-based brand mark.
- Location selector displaying “Moalboal, Cebu”.
- Greeting: “Where are we going today?”
- Two prominent service cards:
  1. **Book a Ride** — “Get there with GoSugbo.”
  2. **Order Food** — “Your local favorites, delivered.”
- A pickup/destination quick-booking section.
- Popular nearby restaurants using mock data.
- Promotional banner for local Moalboal offers.
- A recent activity section with sample rides or orders.
- Bottom navigation: Home, Rides, Food, Activity, Profile.

### 2. Ride Booking Flow
Create a complete interactive ride-booking UI inspired by Maxim's straightforward booking process.

**Ride screen:**
- Map-style background or attractive map placeholder.
- Pickup location input.
- Destination input.
- Swap pickup and destination button.
- “Choose on map” UI option.
- Saved locations such as Home and Work.
- Recent destinations.
- A “Continue” button.

**Location selection screen:**
- Search input for a pickup or destination.
- Mock location suggestions around Moalboal, Cebu.
- Examples: Panagsama Beach, White Beach, Moalboal Public Market, Gaisano Grand Mall Moalboal, and Cebu South Road.
- Allow the user to select a suggestion and return to the booking flow.

**Ride selection screen:**
- Show selectable ride options with icons, estimated fares, passenger capacity, and estimated arrival times.
- Include options such as Motorcycle, Tricycle, and Car.
- Clearly display pickup, destination, estimated fare, and estimated travel time.
- Include a fare breakdown or fare details section.
- A prominent “Confirm Booking” button.

**Booking confirmation screen:**
- Show a sample booking summary.
- Use a simulated booking status, such as “Looking for a driver”.
- Provide a cancel-booking UI action.
- Clearly label all fare and location information as demo data where appropriate.

Do not claim that a real driver has been assigned. This is a UI prototype.

### 3. Food Delivery
Create a dedicated food delivery experience.

**Food home screen:**
- Search restaurants and dishes.
- Food categories: Filipino, Seafood, BBQ, Snacks, Drinks, Desserts.
- Restaurant cards with image, name, cuisine, estimated delivery time, rating, and delivery fee.
- Featured restaurants and popular dishes.
- Use sample restaurant names and menu items appropriate for a Moalboal prototype.

**Restaurant detail screen:**
- Restaurant cover image and information.
- Menu categories.
- Food item cards with images, prices in Philippine pesos (₱), and an Add button.
- Food item detail sheet with quantity controls and optional notes.

**Cart and checkout screens:**
- Cart items with quantity increase/decrease controls.
- Item subtotal, delivery fee, and total.
- Delivery address selection.
- Order notes.
- Mock payment options: Cash on Delivery and E-wallet.
- “Place Demo Order” button.
- After placing a demo order, show an order confirmation screen with a mock order number and status.

### 4. Activity Screen
- Separate tabs for Rides and Food Orders.
- Show sample completed and active bookings.
- Display booking status, date, amount, and relevant details.
- Add a “View Details” action.

### 5. Profile Screen
- Customer avatar and basic profile information using demo data.
- Saved addresses.
- Payment preferences.
- Notifications.
- Help and support.
- About GoSugbo.
- Settings and logout UI (no actual authentication yet).

### 6. Navigation and Interactions
- Implement working client-side navigation between all screens.
- Bottom navigation should remain consistent across the main sections.
- Buttons, category filters, search fields, ride selections, cart controls, and tabs must respond to user interactions.
- Use local mock data and frontend state.
- Persist the cart and current demo booking in local frontend state where appropriate.
- Include sensible loading, empty, and selected states.
- Add a back button on secondary screens.
- Prevent accidental navigation that loses the current cart.

### 7. Mobile Design Requirements
- Mobile-first layout, with responsive desktop behavior only as a secondary consideration.
- Use a fixed or sticky bottom navigation bar on the main app screens.
- Respect phone safe areas and avoid content being hidden behind navigation.
- Use large touch-friendly buttons and inputs.
- Keep forms short and easy to complete.
- Make the interface polished, consistent, and accessible.
- Avoid excessive gradients, oversized headings, cluttered cards, and unnecessary animations.
- Use high-quality food imagery where appropriate and a map-like visual for the ride screen.

### 8. Technical Expectations
- Use the project's existing framework and conventions.
- Use reusable components for buttons, inputs, restaurant cards, ride option cards, and navigation.
- Keep ride booking, food ordering, activity, and profile sections organized separately.
- Use clear TypeScript types if the project uses TypeScript.
- Avoid unnecessary dependencies.
- Do not break existing working project functionality.

**Final objective:** Deliver a polished, clickable mobile-first GoSugbo customer app prototype that combines a simple Maxim-inspired ride-booking experience with food delivery for Moalboal, Cebu. Prioritize the Home screen and Ride Booking flow first, followed by Food Delivery, Activity, and Profile.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/278ddcc7-02b5-49f5-8595-b61075ee4062).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
