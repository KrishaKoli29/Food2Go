import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./pages/LoginScreen";
import SignupScreen from "./pages/SignupScreen";
import CustomerHomeScreen from "./pages/CustomerHome";
import BusinessDashboardScreen from "./pages/BusinessDashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  const [userRole, setUserRole] = useState(null);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {userRole === null ? (
          // --- UNAUTHENTICATED STACK (Not Logged In) ---
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLogin={setUserRole} />}
            </Stack.Screen>
            <Stack.Screen name="Signup" options={{ title: "Create Account" }}>
              {(props) => <SignupScreen {...props} onLogin={setUserRole} />}
            </Stack.Screen>
          </>
        ) : userRole === "customer" ? (
          // --- CUSTOMER STACK ---
          <Stack.Screen name="CustomerHome" options={{ title: "Food2Go" }}>
            {(props) => (
              <CustomerHomeScreen
                {...props}
                onLogout={() => setUserRole(null)}
              />
            )}
          </Stack.Screen>
        ) : (
          // --- BUSINESS STACK ---
          <Stack.Screen
            name="BusinessDashboard"
            options={{ title: "Store Admin" }}
          >
            {(props) => (
              <BusinessDashboardScreen
                {...props}
                onLogout={() => setUserRole(null)}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
