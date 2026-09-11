/**
 * Shared API base URL.
 *
 * WHY NOT localhost?
 * Expo Go runs on a physical device (or emulator) that cannot resolve
 * "localhost" — that resolves to the device itself, not your dev machine.
 * Use your machine's LAN IP address instead.
 *
 * To find your IP:
 *   Windows:  ipconfig  → look for "IPv4 Address" on your Wi-Fi adapter
 *   macOS:    ifconfig  → look for "inet" under en0
 *
 * Both the dev machine and the phone must be on the same Wi-Fi network.
 */
const API_BASE = "http://10.125.129.3:5000/api/auth";

export default API_BASE;
