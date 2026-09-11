import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./pages/LoginScreen";
import OtpVerificationScreen from "./pages/OtpVerificationScreen";
import SetPasswordScreen from "./pages/SetPasswordScreen";
import CustomerHome from "./pages/CustomerHome";
import BusinessDashboard from "./pages/BusinessDashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  const [userRole, setUserRole] = useState(null);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {userRole === null ? (
          <>
            {/* Login — shown until the user is authenticated */}
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLogin={setUserRole} />}
            </Stack.Screen>

            {/* OTP Verification — reached after customer sign-up */}
            <Stack.Screen
              name="OtpVerification"
              options={{ title: "Verify Email" }}
            >
              {(props) => <OtpVerificationScreen {...props} />}
            </Stack.Screen>

            {/* Set Password — reached after OTP is verified */}
            <Stack.Screen
              name="SetPassword"
              options={{ title: "Set Password" }}
            >
              {(props) => <SetPasswordScreen {...props} />}
            </Stack.Screen>
          </>
        ) : userRole === "customer" ? (
          <Stack.Screen name="CustomerHome" options={{ title: "Food2Go" }}>
            {/* We pass onLogout here so the customer can log out */}
            {(props) => (
              <CustomerHome {...props} onLogout={() => setUserRole(null)} />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen
            name="BusinessDashboard"
            options={{ title: "Store Admin" }}
          >
            {/* We pass onLogout here so the business can log out */}
            {(props) => (
              <BusinessDashboard
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
