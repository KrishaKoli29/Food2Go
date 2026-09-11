import React, { useState } from "react";
import { View, Text, Button, StyleSheet, TextInput, Alert } from "react-native";
// import { createUserWithEmailAndPassword } from "firebase/auth";
import api from "../api";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function SignupScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async (role) => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter an email and password.");
      return;
    }

    try {
      // 1. Create the account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Save their role in Firestore Database under a "users" collection
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success!", "Account created successfully.");
      onLogin(role); // Log them in immediately
    } catch (error) {
      Alert.alert("Signup Failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>

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

      <Text style={styles.subtitle}>I want to sign up as a:</Text>

      <View style={styles.buttonSpacing}>
        <Button
          title="Customer (Buy Food)"
          color="blue"
          onPress={() => handleSignUp("customer")}
        />
      </View>

      <View style={styles.buttonSpacing}>
        <Button
          title="Business (Sell Food)"
          color="green"
          onPress={() => handleSignUp("business")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  buttonSpacing: { marginBottom: 15 },
});
