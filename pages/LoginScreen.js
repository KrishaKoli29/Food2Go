import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
} from "react-native";

import api from "../api";

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        "Error",
        "Please enter both email and password."
      );
      return;
    }

    try {
      const response = await api.post(
        "/api/auth/login",
        {
          email,
          password,
        }
      );

      console.log("Login response:", response.data);

      const role = response.data.user.role;

      Alert.alert(
        "Success",
        "Login successful!"
      );

      onLogin(role);

    } catch (error) {
      console.log(
        "Login error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Login Failed",
        error.response?.data?.error ||
          "Unable to login."
      );
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Welcome Back
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title="Log In"
        color="blue"
        onPress={handleLogin}
      />

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() =>
          navigation.navigate("Signup")
        }
      >
        <Text style={styles.linkText}>
          First time? Sign up here
        </Text>
      </TouchableOpacity>

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
    marginBottom: 30,
    textAlign: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  linkContainer: {
    marginTop: 20,
    alignItems: "center",
  },

  linkText: {
    color: "blue",
    textDecorationLine: "underline",
    fontSize: 16,
  },
});