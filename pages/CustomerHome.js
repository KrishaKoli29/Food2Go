import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import api from "../api";

export default function CustomerHome({ onLogout }) {
  const [bags, setBags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBag, setSelectedBag] = useState(null);

  // =========================
  // FETCH ACTIVE FOOD
  // =========================
  const fetchBags = async () => {
    try {
      setLoading(true);

      const response = await api.get("/api/bags/active");

      console.log("Active bags:", response.data);

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.bags || [];

      setBags(data);
    } catch (error) {
      console.log(
        "Fetch bags error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        "Unable to load available food."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBags();
  }, []);

  // =========================
  // CREATE MAP
  // =========================
  const createMapHtml = () => {
    const validBags = bags.filter((bag) => {
      const business = bag.businessId;

      return (
        business &&
        Number.isFinite(Number(business.latitude)) &&
        Number.isFinite(Number(business.longitude))
      );
    });

    // Default center = India
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;

    const centerLat =
      validBags.length > 0
        ? Number(validBags[0].businessId.latitude)
        : defaultLat;

    const centerLng =
      validBags.length > 0
        ? Number(validBags[0].businessId.longitude)
        : defaultLng;

    const markers = validBags
      .map((bag) => {
        const business = bag.businessId;

        const lat = Number(business.latitude);
        const lng = Number(business.longitude);

        const storeName = String(
          business.storeName || "Food Store"
        )
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        const category = String(
          bag.category || "Surprise Bag"
        )
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        const dietType = String(
          bag.dietType || ""
        )
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        const price = Number(bag.discountedPrice);
        const originalPrice = Number(bag.originalPrice);

        return `
          const marker${String(bag._id).replace(
            /[^a-zA-Z0-9]/g,
            ""
          )} = L.marker([${lat}, ${lng}]).addTo(map);

          marker${String(bag._id).replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}.bindPopup(
            "<b>${storeName}</b><br>" +
            "${category}<br>" +
            "${dietType}<br>" +
            "₹${price} (Value ₹${originalPrice})"
          );

          marker${String(bag._id).replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}.on("click", function() {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "bagSelected",
                bagId: "${bag._id}"
              })
            );
          });
        `;
      })
      .join("\n");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
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
          </style>
        </head>

        <body>
          <div id="map"></div>

          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

          <script>
            const map = L.map("map").setView(
              [${centerLat}, ${centerLng}],
              6
            );

            L.tileLayer(
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              {
                attribution:
                  "&copy; OpenStreetMap contributors",
                maxZoom: 19
              }
            ).addTo(map);

            ${markers}
          </script>
        </body>
      </html>
    `;
  };

  // =========================
  // MAP MESSAGE
  // =========================
  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(
        event.nativeEvent.data
      );

      if (data.type === "bagSelected") {
        const bag = bags.find(
          (item) => item._id === data.bagId
        );

        if (bag) {
          setSelectedBag(bag);
        }
      }
    } catch (error) {
      console.log("Map message error:", error);
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading available food...
        </Text>
      </View>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Food2Go
          </Text>

          <Text style={styles.subtitle}>
            Available surplus food
          </Text>
        </View>

        <Button
          title="Refresh"
          onPress={fetchBags}
        />
      </View>

      <View style={styles.mapContainer}>
        <WebView
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMapMessage}
          source={{
            html: createMapHtml(),
          }}
        />
      </View>

      {/* SELECTED FOOD */}
      {selectedBag && (
        <View style={styles.detailsCard}>
          <Text style={styles.storeName}>
            {selectedBag.businessId?.storeName ||
              "Food Store"}
          </Text>

          <Text style={styles.foodCategory}>
            {selectedBag.category}
          </Text>

          <Text style={styles.detail}>
            Diet: {selectedBag.dietType}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{selectedBag.discountedPrice}
            </Text>

            <Text style={styles.oldPrice}>
              Value ₹{selectedBag.originalPrice}
            </Text>
          </View>

          <Text style={styles.detail}>
            Quantity available:{" "}
            {selectedBag.quantityAvailable}
          </Text>

          <Text style={styles.detail}>
            Pickup: {selectedBag.pickupStartTime} -{" "}
            {selectedBag.pickupEndTime}
          </Text>

          <View style={styles.reserveButton}>
            <Button
              title="Reserve Bag"
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Reservation functionality will be connected next."
                )
              }
            />
          </View>

          <View style={styles.closeButton}>
            <Button
              title="Close"
              onPress={() =>
                setSelectedBag(null)
              }
            />
          </View>
        </View>
      )}

      {!selectedBag && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {bags.length > 0
              ? `📍 ${bags.length} surplus food listing(s) available`
              : "No surplus food available right now."}
          </Text>

          <Text style={styles.infoSubtext}>
            Tap a map marker to see food details.
          </Text>
        </View>
      )}

      <View style={styles.logout}>
        <Button
          title="Log Out"
          color="red"
          onPress={onLogout}
        />
      </View>
    </View>
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

  header: {
    padding: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#666",
    marginTop: 3,
  },

  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 12,
    overflow: "hidden",
  },

  map: {
    flex: 1,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#666",
  },

  detailsCard: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 16,
    borderRadius: 12,
    elevation: 5,
  },

  storeName: {
    fontSize: 21,
    fontWeight: "bold",
  },

  foodCategory: {
    fontSize: 17,
    marginTop: 5,
    marginBottom: 8,
  },

  detail: {
    color: "#555",
    marginTop: 5,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  price: {
    fontSize: 22,
    fontWeight: "bold",
  },

  oldPrice: {
    marginLeft: 10,
    color: "#777",
    textDecorationLine: "line-through",
  },

  reserveButton: {
    marginTop: 15,
  },

  closeButton: {
    marginTop: 8,
  },

  infoCard: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 15,
    borderRadius: 12,
  },

  infoText: {
    fontSize: 16,
    fontWeight: "bold",
  },

  infoSubtext: {
    color: "#666",
    marginTop: 5,
  },

  logout: {
    margin: 10,
  },
});