import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./AuthContext";

import LoginScreen from "./pages/LoginScreen";
import OtpVerificationScreen from "./pages/OtpVerificationScreen";
import SetPasswordScreen from "./pages/SetPasswordScreen";
import CustomerHome from "./pages/CustomerHome";
import BusinessDashboard from "./pages/BusinessDashboard";
import CustomerProfileScreen from "./pages/CustomerProfileScreen";
import BusinessProfileScreen from "./pages/BusinessProfileScreen";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookingsScreen from "./pages/MyBookingsScreen";
import BusinessMyBagsScreen from "./pages/BusinessMyBagsScreen";

const Stack = createNativeStackNavigator();

// ─── Inner navigator that reads from AuthContext ──────────────────────────────

function AppNavigator() {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!token ? (
          // ── Unauthenticated screens ──────────────────────────────────────
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} />}
            </Stack.Screen>

            <Stack.Screen name="OtpVerification" options={{ title: "Verify Email" }}>
              {(props) => <OtpVerificationScreen {...props} />}
            </Stack.Screen>

            <Stack.Screen name="SetPassword" options={{ title: "Set Password" }}>
              {(props) => <SetPasswordScreen {...props} />}
            </Stack.Screen>
          </>
        ) : role === "customer" ? (
          // ── Customer screens ─────────────────────────────────────────────
          <>
            <Stack.Screen name="CustomerHome" options={{ title: "Food2Go" }}>
              {(props) => <CustomerHome {...props} />}
            </Stack.Screen>
            <Stack.Screen name="CustomerProfile" options={{ title: "My Profile" }}>
              {(props) => <CustomerProfileScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name="MyBookings" options={{ title: "My Bookings" }}>
              {(props) => <MyBookingsScreen {...props} />}
            </Stack.Screen>
          </>
        ) : role === "business" ? (
          // ── Business screens ─────────────────────────────────────────────
          <>
            <Stack.Screen name="BusinessDashboard" options={{ title: "Store Admin" }}>
              {(props) => <BusinessDashboard {...props} />}
            </Stack.Screen>
            <Stack.Screen name="BusinessProfile" options={{ title: "Business Profile" }}>
              {(props) => <BusinessProfileScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name="BusinessMyBags" options={{ title: "My Bags & Bookings" }}>
              {(props) => <BusinessMyBagsScreen {...props} />}
            </Stack.Screen>
          </>
        ) : role === "admin" ? (
          // ── Admin screens ─────────────────────────────────────────────
          <>
            <Stack.Screen name="AdminDashboard" options={{ headerShown: false }}>
              {(props) => <AdminDashboard {...props} />}
            </Stack.Screen>
          </>
        ) : (
          // ── Fallback: send unknown roles back to login ─────────────────
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Root: wrap with AuthProvider ─────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
