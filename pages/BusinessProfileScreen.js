import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { API_PROFILE } from "../constants/api";
import { useAuth } from "../AuthContext";

export default function BusinessProfileScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_PROFILE}/business`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setEmail(data.email || "");
          setBusiness(data.business || null);
        }
      } catch (_) {
        Alert.alert("Error", "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Business Profile</Text>

      <Text style={styles.label}>Account Email</Text>
      <Text style={styles.value}>{email}</Text>

      {business ? (
        <>
          <Text style={styles.label}>Store Name</Text>
          <Text style={styles.value}>{business.storeName}</Text>

          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>
            Lat: {business.latitude?.toFixed(6)}{"\n"}
            Lng: {business.longitude?.toFixed(6)}
          </Text>

          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: business.status === "Active" ? "#2e7d32" : "#c62828" }]}>
            {business.status}
          </Text>
        </>
      ) : (
        <Text style={styles.note}>
          No store profile yet. Go to the dashboard and save your store first.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: "#888", marginTop: 18, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 16, color: "#222", lineHeight: 22 },
  note: { fontSize: 15, color: "#666", marginTop: 20, textAlign: "center", lineHeight: 22 },
});
