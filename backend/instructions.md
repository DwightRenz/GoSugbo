# Frontend Integration Guide

Short guide for connecting the GoSugbo API from React or React Native.

## Start the API

From the `backend` folder, start Spring Boot:

```powershell
.\mvnw.cmd spring-boot:run
```

The default API address is `http://localhost:8080`. Required database, JWT, Firebase, maps, and payment settings must be configured in the backend `.env` first. Do not copy backend secrets into frontend code.

Use Swagger for exact request/response fields and to try endpoints:

- `http://localhost:8080/swagger-ui.html`
- `http://localhost:8080/v3/api-docs`

## Base URL and frontend setup

Set one base URL per environment and append the endpoint paths listed below:

- React/Vite: `VITE_API_URL=http://localhost:8080`
- React/CRA: `REACT_APP_API_URL=http://localhost:8080`
- React Native/Expo: `EXPO_PUBLIC_API_URL=http://localhost:8080`

For Android Emulator, use `http://10.0.2.2:8080` instead of `localhost`. An iOS simulator can normally use `localhost`; a physical phone needs your computer's LAN IP or the HTTPS tunnel URL.

Send JSON with `Content-Type: application/json`. After login, store the returned access token securely and send it in the `Authorization` header using the `Bearer` scheme on protected requests. Clear it on logout or when the API returns `401`. Use the user's `role` to show the appropriate customer, rider, store-owner, or admin UI. Handle `403` as insufficient permissions; show validation/API error responses rather than assuming success.

For browser apps, the backend CORS allow-list currently includes `http://localhost:3000` and `http://localhost:5173`. If the frontend runs from another web origin, add that exact origin to `app.cors.allowed-origins` in backend configuration and restart the API. React Native does not use browser CORS.

## Expose the local API with a tunnel

Install and authenticate [ngrok](https://ngrok.com/download), start the API on port `8080`, then run in another terminal:

```powershell
ngrok http 8080
```

Copy the HTTPS forwarding address (for example, `https://example.ngrok-free.app`) into the frontend's API URL setting. Keep the ngrok process running while testing; its address may change when restarted. For a physical phone, scan/run the app against this HTTPS URL. Do not expose a production API or secret credentials through a temporary tunnel.

## API endpoints

The paths below are complete API paths; append them to the base URL for the active environment. Protected routes require a bearer token; endpoint permissions are also enforced by role and resource ownership.

### Authentication

- `POST /api/auth/register/customer` — register customer
- `POST /api/auth/register/rider` — register rider
- `POST /api/auth/register/admin` — create admin (admin only)
- `POST /api/auth/login` — sign in, receive token and user role
- `POST /api/auth/verify-email` — verify email OTP
- `POST /api/auth/resend-verification` — resend verification OTP
- `POST /api/auth/forgot-password` — request password-reset OTP
- `POST /api/auth/reset-password` — reset password using OTP
- `POST /api/auth/google` — sign in with Google
- `POST /api/auth/logout` — revoke current token
- `GET /api/auth/me` — current user

### Stores and products

- Stores: `GET /api/stores` (browse), `GET /api/stores/{id}`, `GET /api/stores/{id}/hours`, `POST /api/stores` (create), `GET /api/stores/mine`, `PUT /api/stores/{id}`, `DELETE /api/stores/{id}`, `PUT /api/stores/{id}/hours`
- Products: `GET /api/stores/{storeId}/products`, `GET /api/products/{id}`, `GET /api/stores/{storeId}/products/mine`, `POST /api/stores/{storeId}/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}`

### Addresses

- `GET /api/addresses`, `GET /api/addresses/{id}`, `POST /api/addresses`, `PUT /api/addresses/{id}`, `DELETE /api/addresses/{id}`

### Orders and payments

- `POST /api/orders` — place order
- `GET /api/orders/mine` — customer order list
- `GET /api/orders/{id}` — order detail
- `PATCH /api/orders/{id}/cancel` — cancel eligible order
- `POST /api/orders/{id}/pay?successUrl=...&cancelUrl=...` — create PayMongo checkout; redirect customer to returned checkout URL
- `GET /api/orders/stores/{storeId}` — store order list (owner/admin)
- `PATCH /api/orders/{id}/status` — store/admin order status update
- `POST /api/payments/webhook` — PayMongo server callback; not called by the frontend

### Delivery / rider

- `GET /api/deliveries/available`, `POST /api/deliveries/orders/{orderId}/accept`, `PATCH /api/deliveries/{id}/status`, `GET /api/deliveries/mine`, `GET /api/deliveries/mine/active`
- Admin assignment: `POST /api/deliveries/orders/{orderId}/assign`
- Delivery detail for authorized parties: `GET /api/deliveries/orders/{orderId}`
- Rider profile: `GET /api/riders/me`, `PATCH /api/riders/me/availability`, `PATCH /api/riders/me/location`

### Rides

- Public ride info: `GET /api/rides/types`, `POST /api/rides/estimate`, `GET /api/rides/nearby-riders?lat=...&lng=...`
- Customer: `POST /api/rides`, `GET /api/rides/mine`, `GET /api/rides/mine/active`
- Ride detail/history: `GET /api/rides/{id}`, `GET /api/rides/{id}/history`
- Rider: `GET /api/rides/driver/available`, `POST /api/rides/driver/{id}/accept`, `PATCH /api/rides/driver/{id}/status`, `PATCH /api/rides/driver/{id}/location`, `GET /api/rides/driver/mine`, `GET /api/rides/driver/mine/active`

Paged lists accept `?page=0&size=20`; stores also accept sorting, for example `?sort=name,asc`. Check Swagger for DTO field names, allowed status values, and required fields.

## Feature test flows

1. **Customer account:** Register customer → verify email with OTP → login → call `/api/auth/me` → create/list an address.
2. **Browse and order:** Browse stores → get store hours and products → create an order using products from one active store → check `/api/orders/mine` and `/api/orders/{id}`. Test cancel while the order is pending/confirmed.
3. **Online payment:** Create a payable order → call `/api/orders/{id}/pay` with success/cancel URLs → open returned checkout URL → confirm payment status after PayMongo's webhook. Test COD separately by selecting the COD payment method at order creation.
4. **Store owner:** Login as store owner → create/update store and hours → add/edit products → view store orders → move order through valid statuses (`pending` → `confirmed` → `preparing` → `ready_for_pickup`).
5. **Delivery:** Login as rider → set availability online → check available deliveries → accept an order → update delivery status through its allowed transitions → verify customer order/delivery status and rider history. Admin assignment can be tested with `/api/deliveries/orders/{orderId}/assign`.
6. **Ride booking:** As customer, list ride types → estimate fare → optionally view nearby riders → book a ride → check active ride and history. As rider, go online/update location → accept an available ride → update status and GPS → verify customer ride detail/history.
7. **Password recovery / Google sign-in:** Exercise the forgot-password → reset-password OTP flow, or test Google login with the configured Firebase project.

## Live tracking (optional)

Connect a STOMP WebSocket client to `ws(s)://<host>/ws` (use `wss` with the HTTPS tunnel). Subscribe to `/topic/rides/{rideId}/location`, `/topic/rides/{rideId}/status`, `/topic/deliveries/{deliveryId}/location`, or `/topic/deliveries/{deliveryId}/status`. Rider location/status updates publish to these topics; REST endpoints remain available for fetching the current state.
