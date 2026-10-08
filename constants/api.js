/**
 * Shared API base URLs.
 *
 * The IP is derived automatically from Expo's dev-server host so you never
 * have to hard-code or update it manually after a Wi-Fi reconnect.
 *
 * How it works:
 *   - In Expo Go, Constants.expoConfig.hostUri is the address the device
 *     is already using to talk to Metro (e.g. "10.80.78.3:8081").
 *   - We strip the port and reuse that host for our Express backend on :5000.
 *   - Falls back to "localhost" for web / production builds.
 *
 * Requirements: both your dev machine and phone must be on the same Wi-Fi.
 */
import Constants from "expo-constants";

// hostUri looks like "10.80.78.3:8081" in Expo Go; grab just the host part.
const host =
  Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

const BASE = `http://${host}:5000`;

/** Auth routes — POST /api/auth/... */
export const API_AUTH = `${BASE}/api/auth`;

/** Business routes — POST/GET /api/business/... */
export const API_BUSINESS = `${BASE}/api/business`;

/** Bags routes — POST/GET /api/bags/... */
export const API_BAGS = `${BASE}/api/bags`;

/** Profile routes — GET/PUT /api/profile/... */
export const API_PROFILE = `${BASE}/api/profile`;

/** Admin routes — GET/PATCH /api/admin/... */
export const API_ADMIN = `${BASE}/api/admin`;

/** Bookings routes — POST/GET /api/bookings/... */
export const API_BOOKINGS = `${BASE}/api/bookings`;

// Default export kept for backwards compatibility with auth screens
export default API_AUTH;
