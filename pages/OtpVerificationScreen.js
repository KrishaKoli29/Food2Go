import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import API_BASE from "../constants/api";

/**
 * OtpVerificationScreen
 *
 * Route params:
 *   email        {string}   – the email address the OTP was sent to
 *   onLogin      {function} – called with the user's role once fully authenticated
 *   mode         {string}   – "signup" (→ go to SetPassword after verify)
 *                           | "verify_existing" (→ go to SetPassword after verify)
 *                           Both modes redirect to SetPassword; onLogin is called there.
 */
export default function OtpVerificationScreen({ route, navigation }) {
  const { email, onLogin, mode = "signup" } = route.params;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Verification Failed", data.message);
        return;
      }

      // OTP accepted — navigate to set-password screen so the user can
      // choose their real password before being logged in.
      navigation.navigate("SetPassword", { email, onLogin });
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Resend Failed", data.message);
        return;
      }

      Alert.alert("OTP Sent", data.message);
      setOtp(""); // clear input so the user enters the new code
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          A 6-digit code was sent to{"\n"}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#bbb"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <>
            <TouchableOpacity style={styles.btn} onPress={handleVerify}>
              <Text style={styles.btnText}>Verify OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleResend}>
              <Text style={styles.btnGhostText}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 28,
    lineHeight: 24,
    fontSize: 15,
  },
  emailHighlight: {
    color: "#111",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    marginBottom: 16,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 10,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: "#FF6B35",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#aaa",
  },
  btnGhostText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 16,
  },
  loader: { marginTop: 24 },
});
