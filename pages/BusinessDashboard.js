import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import api from "../api";

export default function BusinessDashboard({ onLogout }) {
  // =========================
  // STORE INFORMATION
  // =========================
  const [storeName, setStoreName] = useState("");

  const [latitude, setLatitude] = useState(20.5937);
  const [longitude, setLongitude] = useState(78.9629);

  const [businessId, setBusinessId] = useState(null);

  // =========================
  // SURPLUS FOOD INFORMATION
  // =========================
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [category, setCategory] = useState("");
  const [dietType, setDietType] = useState("Veg");
  const [quantityAvailable, setQuantityAvailable] = useState("");
  const [pickupStartTime, setPickupStartTime] = useState("");
  const [pickupEndTime, setPickupEndTime] = useState("");

  // =========================
  // LOADING STATES
  // =========================
  const [savingStore, setSavingStore] = useState(false);
  const [publishingBag, setPublishingBag] = useState(false);

  // =========================
  // HANDLE MAP LOCATION
  // =========================
  const handleWebMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "location") {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
      }
    } catch (error) {
      console.log("Map message error:", error);
    }
  };

  // =========================
  // SAVE STORE
  // =========================
  const saveStore = async () => {
    if (!storeName.trim()) {
      Alert.alert("Error", "Please enter your store name.");
      return;
    }

    try {
      setSavingStore(true);

      const response = await api.post("/api/business/onboard", {
        storeName: storeName.trim(),
        latitude,
        longitude,
      });

      const createdBusiness = response.data.business;

      setBusinessId(createdBusiness._id);

      Alert.alert(
        "Success",
        "Store location saved successfully."
      );
    } catch (error) {
      console.log(
        "Store error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.error ||
          "Failed to save store."
      );
    } finally {
      setSavingStore(false);
    }
  };

  // =========================
  // PUBLISH SURPLUS FOOD
  // =========================
  const publishBag = async () => {
    if (!businessId) {
      Alert.alert(
        "Save Store First",
        "Please save your store before publishing food."
      );
      return;
    }

    if (
      !originalPrice ||
      !discountedPrice ||
      !category ||
      !quantityAvailable ||
      !pickupStartTime ||
      !pickupEndTime
    ) {
      Alert.alert(
        "Error",
        "Please fill in all food details."
      );
      return;
    }

    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);
    const quantity = Number(quantityAvailable);

    if (
      Number.isNaN(original) ||
      Number.isNaN(discounted) ||
      Number.isNaN(quantity)
    ) {
      Alert.alert(
        "Error",
        "Please enter valid numbers for prices and quantity."
      );
      return;
    }

    if (
      original <= 0 ||
      discounted <= 0 ||
      quantity <= 0
    ) {
      Alert.alert(
        "Error",
        "Prices and quantity must be greater than zero."
      );
      return;
    }

    if (discounted >= original) {
      Alert.alert(
        "Error",
        "Discounted price must be lower than original price."
      );
      return;
    }

    // Minimum 30% discount
    if (discounted > original * 0.7) {
      Alert.alert(
        "Discount Too Low",
        "Food2Go requires at least 30% discount."
      );
      return;
    }

    try {
      setPublishingBag(true);

      await api.post("/api/bags/create", {
        businessId,
        originalPrice: original,
        discountedPrice: discounted,
        category: category.trim(),
        dietType,
        quantityAvailable: quantity,
        pickupStartTime,
        pickupEndTime,
      });

      Alert.alert(
        "Published!",
        "Your surplus food is now available to customers."
      );

      // Clear food fields
      setOriginalPrice("");
      setDiscountedPrice("");
      setCategory("");
      setQuantityAvailable("");
      setPickupStartTime("");
      setPickupEndTime("");
    } catch (error) {
      console.log(
        "Bag error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.error ||
          "Failed to publish surplus food."
      );
    } finally {
      setPublishingBag(false);
    }
  };

  // =========================
  // MAP HTML
  // =========================
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        <style>
          html,
          body,
          #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          body {
            overflow: hidden;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <script>
          const initialLat = ${latitude};
          const initialLng = ${longitude};

          const map = L.map("map").setView(
            [initialLat, initialLng],
            5
          );

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "&copy; OpenStreetMap contributors",
              maxZoom: 19
            }
          ).addTo(map);

          let marker = L.marker([
            initialLat,
            initialLng
          ]).addTo(map);

          marker.bindPopup(
            "${storeName || "Your Store"}"
          );

          map.on("click", function(event) {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;

            marker.setLatLng([lat, lng]);

            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "location",
                latitude: lat,
                longitude: lng
              })
            );
          });
        </script>
      </body>
    </html>
  `;

  // =========================
  // UI
  // =========================
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Business Dashboard
      </Text>

      <Text style={styles.subtitle}>
        Manage your store and surplus food
      </Text>

      {/* =========================
          STORE INFORMATION
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          1. Store Information
        </Text>

        <Text style={styles.label}>
          Store Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. ABC Bakery"
          value={storeName}
          onChangeText={setStoreName}
        />

        <Text style={styles.label}>
          Select Store Location
        </Text>

        <Text style={styles.helper}>
          Tap anywhere on the map to place your store marker.
        </Text>

        <WebView
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebMapMessage}
          source={{
            html: mapHtml,
          }}
        />

        <Text style={styles.coordinates}>
          Latitude: {latitude.toFixed(6)}
        </Text>

        <Text style={styles.coordinates}>
          Longitude: {longitude.toFixed(6)}
        </Text>

        <View style={styles.button}>
          <Button
            title={
              savingStore
                ? "Saving..."
                : businessId
                ? "Store Saved ✓"
                : "Save Store"
            }
            onPress={saveStore}
            disabled={savingStore}
          />
        </View>
      </View>

      {/* =========================
          SURPLUS FOOD
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          2. Publish Surplus Food
        </Text>

        {!businessId && (
          <Text style={styles.warning}>
            Save your store first before publishing food.
          </Text>
        )}

        <Text style={styles.label}>
          Food Category
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. Bakery, Meals, Produce"
          value={category}
          onChangeText={setCategory}
        />

        <Text style={styles.label}>
          Diet Type
        </Text>

        <View style={styles.dietButtons}>
          <View style={styles.dietButton}>
            <Button
              title="Veg"
              onPress={() => setDietType("Veg")}
            />
          </View>

          <View style={styles.dietButton}>
            <Button
              title="Non-Veg"
              onPress={() => setDietType("Non-Veg")}
            />
          </View>

          <View style={styles.dietButton}>
            <Button
              title="Mixed"
              onPress={() => setDietType("Mixed")}
            />
          </View>
        </View>

        <Text style={styles.selectedDiet}>
          Selected: {dietType}
        </Text>

        <Text style={styles.label}>
          Original Price
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 200"
          keyboardType="numeric"
          value={originalPrice}
          onChangeText={setOriginalPrice}
        />

        <Text style={styles.label}>
          Discounted Price
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 120"
          keyboardType="numeric"
          value={discountedPrice}
          onChangeText={setDiscountedPrice}
        />

        <Text style={styles.discountInfo}>
          Minimum discount: 30%
        </Text>

        <Text style={styles.label}>
          Quantity Available
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 5"
          keyboardType="numeric"
          value={quantityAvailable}
          onChangeText={setQuantityAvailable}
        />

        <Text style={styles.label}>
          Pickup Start Time
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 18:00"
          value={pickupStartTime}
          onChangeText={setPickupStartTime}
        />

        <Text style={styles.label}>
          Pickup End Time
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 20:00"
          value={pickupEndTime}
          onChangeText={setPickupEndTime}
        />

        <View style={styles.publishButton}>
          <Button
            title={
              publishingBag
                ? "Publishing..."
                : "Publish Surplus Food"
            }
            onPress={publishBag}
            disabled={publishingBag || !businessId}
          />
        </View>
      </View>

      {/* =========================
          LOGOUT
      ========================= */}
      <View style={styles.logout}>
        <Button
          title="Log Out"
          color="red"
          onPress={onLogout}
        />
      </View>
    </ScrollView>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 5,
  },

  subtitle: {
    color: "#666",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },

  label: {
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6,
  },

  helper: {
    color: "#666",
    fontSize: 13,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  map: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },

  coordinates: {
    color: "#555",
    fontSize: 13,
    marginTop: 3,
  },

  button: {
    marginTop: 15,
  },

  dietButtons: {
    flexDirection: "row",
    gap: 8,
  },

  dietButton: {
    flex: 1,
  },

  selectedDiet: {
    marginTop: 8,
    color: "#555",
  },

  discountInfo: {
    color: "#777",
    fontSize: 13,
    marginTop: 5,
  },

  warning: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    color: "#856404",
    marginBottom: 10,
  },

  publishButton: {
    marginTop: 20,
  },

  logout: {
    marginTop: 5,
  },
});