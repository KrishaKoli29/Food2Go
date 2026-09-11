import React from "react";
import { View, Text, StyleSheet, Button, ScrollView } from "react-native";

export default function CustomerHome({ onLogout }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Available Nearby</Text>

      {/* Dummy Surprise Bag Card */}
      <View style={styles.card}>
        <Text style={styles.storeName}>Mongini's Bakery</Text>
        <Text style={styles.details}>Surprise Bag - Baked Goods</Text>
        <Text style={styles.time}>Pickup: 4:00 PM - 6:00 PM</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>Rs 499</Text>
          <Text style={styles.oldPrice}>Value: Rs 1000</Text>
        </View>

        <Button
          title="Reserve Bag"
          onPress={() => alert("Bag reserved! (Dummy)")}
        />
      </View>

      {/* Log out button */}
      <View style={styles.logoutContainer}>
        <Button title="Log Out" color="red" onPress={onLogout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // Adds shadow on Android
    marginBottom: 20,
  },
  storeName: { fontSize: 20, fontWeight: "bold" },
  details: { fontSize: 16, color: "#555", marginTop: 5 },
  time: { fontSize: 14, color: "green", marginTop: 5, fontWeight: "bold" },
  priceRow: { flexDirection: "row", alignItems: "center", marginVertical: 15 },
  price: { fontSize: 18, fontWeight: "bold", color: "#000", marginRight: 10 },
  oldPrice: { fontSize: 14, textDecorationLine: "line-through", color: "gray" },
  logoutContainer: { marginTop: 40 },
});
