import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";

import api from "../api";

export default function SignupScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otpScreen, setOtpScreen] = useState(false);
  const [otp, setOtp] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [loading, setLoading] = useState(false);

  // ==========================
  // SEND OTP
  // ==========================

  const handleSignUp = async (role) => {
    if (!email || !password) {
      Alert.alert(
        "Error",
        "Please enter an email and password."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);
    setSelectedRole(role);

    try {
      const response = await api.post(
        "/api/auth/send-signup-otp",
        {
          email,
          password,
          role,
        }
      );

      console.log(
        "Send OTP response:",
        response.data
      );

      setOtpScreen(true);

      Alert.alert(
        "OTP Sent",
        `A verification OTP has been sent to ${email}.`
      );

    } catch (error) {
      console.log(
        "Send OTP error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "OTP Failed",
        error.response?.data?.error ||
          "Unable to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };


  // ==========================
  // VERIFY OTP
  // ==========================

  const verifyOtp = async () => {
    if (!otp) {
      Alert.alert(
        "Error",
        "Please enter the OTP."
      );
      return;
    }

    if (otp.length !== 6) {
      Alert.alert(
        "Error",
        "OTP must be 6 digits."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/api/auth/verify-signup-otp",
        {
          email,
          otp,
        }
      );

      console.log(
        "Verify OTP response:",
        response.data
      );

      Alert.alert(
        "Success!",
        "Email verified and account created successfully."
      );

      // Login immediately
      onLogin(selectedRole);

    } catch (error) {
      console.log(
        "Verify OTP error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Verification Failed",
        error.response?.data?.error ||
          "Invalid OTP."
      );
    } finally {
      setLoading(false);
    }
  };


  // ==========================
  // OTP SCREEN
  // ==========================

  if (otpScreen) {
    return (
      <View style={styles.container}>

        <Text style={styles.title}>
          Verify Your Email
        </Text>

        <Text style={styles.info}>
          We sent a 6-digit OTP to:
        </Text>

        <Text style={styles.email}>
          {email}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <View style={styles.buttonSpacing}>
          <Button
            title={
              loading
                ? "Verifying..."
                : "Verify OTP"
            }
            onPress={verifyOtp}
            disabled={loading}
          />
        </View>

        <View style={styles.buttonSpacing}>
          <Button
            title="Back"
            color="gray"
            onPress={() => {
              setOtpScreen(false);
              setOtp("");
            }}
            disabled={loading}
          />
        </View>

      </View>
    );
  }


  // ==========================
  // SIGNUP SCREEN
  // ==========================

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Create an Account
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Create Password (min 6 chars)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={styles.subtitle}>
        I want to sign up as:
      </Text>

      <View style={styles.buttonSpacing}>
        <Button
          title={
            loading
              ? "Sending OTP..."
              : "Customer (Buy Food)"
          }
          color="blue"
          onPress={() =>
            handleSignUp("customer")
          }
          disabled={loading}
        />
      </View>

      <View style={styles.buttonSpacing}>
        <Button
          title={
            loading
              ? "Sending OTP..."
              : "Business (Sell Food)"
          }
          color="green"
          onPress={() =>
            handleSignUp("business")
          }
          disabled={loading}
        />
      </View>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
    color: "#555",
  },

  info: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 5,
    color: "#555",
  },

  email: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  buttonSpacing: {
    marginBottom: 15,
  },
});