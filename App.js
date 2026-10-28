import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./pages/LoginScreen";
import SignupScreen from "./pages/SignupScreen";
import CustomerHomeScreen from "./pages/CustomerHome";
import BusinessDashboardScreen from "./pages/BusinessDashboard";
import NGODashboardScreen from "./pages/NGODashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const logout = () => setCurrentUser(null);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!currentUser ? (
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLogin={setCurrentUser} />}
            </Stack.Screen>
            <Stack.Screen name="Signup" options={{ title: "Create Account" }}>
              {(props) => <SignupScreen {...props} onLogin={setCurrentUser} />}
            </Stack.Screen>
          </>
        ) : currentUser.role === "customer" ? (
          <Stack.Screen name="CustomerHome" options={{ title: "Food2Go" }}>
            {(props) => <CustomerHomeScreen {...props} onLogout={logout} />}
          </Stack.Screen>
        ) : currentUser.role === "ngo" ? (
          <Stack.Screen name="NGODashboard" options={{ title: "Food2Go NGO" }}>
            {(props) => (
              <NGODashboardScreen
                {...props}
                user={currentUser}
                onLogout={logout}
                onProfileUpdate={(updates) =>
                  setCurrentUser((prev) => ({ ...prev, ...updates }))
                }
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="BusinessDashboard" options={{ title: "Store Admin" }}>
            {(props) => <BusinessDashboardScreen {...props} onLogout={logout} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
