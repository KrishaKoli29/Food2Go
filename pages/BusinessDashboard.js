import React from "react";
import { View, Text, StyleSheet, Button, TextInput } from "react-native";

export default function BusinessDashboard({ onLogout }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Update Inventory</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Bags available today:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 5"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Pickup window:</Text>
        <TextInput style={styles.input} placeholder="e.g., 4:00 PM - 6:00 PM" />

        <View style={styles.publishButton}>
          <Button
            title="Publish Bags"
            color="green"
            onPress={() => alert("Bags listed! (Dummy)")}
          />
        </View>
      </View>

      <View style={styles.logoutContainer}>
        <Button title="Log Out" color="red" onPress={onLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 10, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  publishButton: { marginTop: 10 },
  logoutContainer: { marginTop: 40 },
});
