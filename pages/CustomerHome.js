import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { API_BAGS, API_BOOKINGS } from "../constants/api";
import { useAuth } from "../AuthContext";

// ─── Diet chip options ────────────────────────────────────────────────────────
const DIET_OPTIONS = ["All", "Veg", "Non-Veg", "Mixed"];

// ─── Max price slider steps ──────────────────────────────────────────────────
const PRICE_STEPS = [
  { label: "Any", value: null },
  { label: "≤₹50", value: 50 },
  { label: "≤₹100", value: 100 },
  { label: "≤₹200", value: 200 },
  { label: "≤₹500", value: 500 },
];

export default function CustomerHome({ navigation }) {
  const { token, logout } = useAuth();

  // ── data ──────────────────────────────────────────────────────────────────
  const [bags, setBags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBag, setSelectedBag] = useState(null);
  const [booking, setBooking] = useState(false);

  // ── filter state ─────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [dietFilter, setDietFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState(null);   // null = any
  const [pickupFilter, setPickupFilter] = useState(""); // "HH:MM" string
  const [showFilters, setShowFilters] = useState(false);

  // =========================
  // FETCH ACTIVE FOOD
  // =========================
  const fetchBags = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BAGS}/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.error || "Unable to load available food.");
        return;
      }

      const list = Array.isArray(data) ? data : data.bags || [];
      setBags(list);
    } catch (error) {
      console.log("Fetch bags error:", error.message);
      Alert.alert(
        "Connection Error",
        "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBags();
  }, []);

  // =========================
  // FILTERED BAGS
  // =========================
  const filteredBags = useMemo(() => {
    return bags.filter((bag) => {
      // Always only show available bags (quantityAvailable > 0)
      if (bag.quantityAvailable <= 0) return false;

      // Search: match store name or category
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const store = (bag.businessId?.storeName || "").toLowerCase();
        const cat = (bag.category || "").toLowerCase();
        if (!store.includes(q) && !cat.includes(q)) return false;
      }

      // Diet filter
      if (dietFilter !== "All" && bag.dietType !== dietFilter) return false;

      // Category filter
      if (categoryFilter.trim()) {
        const cf = categoryFilter.toLowerCase();
        if (!(bag.category || "").toLowerCase().includes(cf)) return false;
      }

      // Max price
      if (maxPrice !== null && bag.discountedPrice > maxPrice) return false;

      // Pickup time filter — bag's start time must be ≤ entered time ≤ end time
      if (pickupFilter.trim()) {
        const t = pickupFilter.trim();
        if (bag.pickupStartTime && bag.pickupEndTime) {
          if (t < bag.pickupStartTime || t > bag.pickupEndTime) return false;
        }
      }

      return true;
    });
  }, [bags, searchText, dietFilter, categoryFilter, maxPrice, pickupFilter]);

  // =========================
  // RESERVE BAG
  // =========================
  const handleReserve = async () => {
    if (!selectedBag) return;

    if (selectedBag.quantityAvailable <= 0) {
      Alert.alert("Sold Out", "This bag is no longer available.");
      return;
    }

    try {
      setBooking(true);

      const res = await fetch(`${API_BOOKINGS}/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bagId: selectedBag._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Booking Failed", data.error || "Could not reserve bag.");
        return;
      }

      // Update local bag quantity so UI reflects the change
      setBags((prev) =>
        prev.map((b) =>
          b._id === selectedBag._id
            ? { ...b, quantityAvailable: b.quantityAvailable - 1 }
            : b
        )
      );

      setSelectedBag(null);

      Alert.alert(
        "🎉 Bag Reserved!",
        `You've reserved a ${data.booking.snapshot.category} bag from ${data.booking.snapshot.storeName}.\n\nPickup: ${data.booking.snapshot.pickupStartTime} – ${data.booking.snapshot.pickupEndTime}\nPrice: ₹${data.booking.snapshot.discountedPrice}\n\nCheck "My Bookings" for details.`,
        [
          { text: "My Bookings", onPress: () => navigation.navigate("MyBookings") },
          { text: "OK" },
        ]
      );
    } catch (error) {
      console.log("Reserve error:", error.message);
      Alert.alert(
        "Connection Error",
        "Could not reach the server."
      );
    } finally {
      setBooking(false);
    }
  };

  // =========================
  // CREATE MAP (uses filteredBags for markers)
  // =========================
  const createMapHtml = () => {
    const validBags = filteredBags.filter((bag) => {
      const business = bag.businessId;
      return (
        business &&
        Number.isFinite(Number(business.latitude)) &&
        Number.isFinite(Number(business.longitude))
      );
    });

    const defaultLat = 22.5645;
    const defaultLng = 72.9289;

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
        const safeId = String(bag._id).replace(/[^a-zA-Z0-9]/g, "");

        const storeName = String(business.storeName || "Food Store")
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        const category = String(bag.category || "Surprise Bag")
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        const dietType = String(bag.dietType || "")
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        const price = Number(bag.discountedPrice);
        const originalPrice = Number(bag.originalPrice);

        return `
          const marker${safeId} = L.marker([${lat}, ${lng}]).addTo(map);

          marker${safeId}.bindPopup(
            "<b>${storeName}</b><br>" +
            "${category}<br>" +
            "${dietType}<br>" +
            "₹${price} (Value ₹${originalPrice})"
          );

          marker${safeId}.on("click", function() {
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
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "bagSelected") {
        // Use the full bags array (not just filtered) so clicking an existing marker always works
        const bag = bags.find((item) => item._id === data.bagId);
        if (bag) {
          setSelectedBag(bag);
        }
      }
    } catch (error) {
      console.log("Map message error:", error);
    }
  };

  const resetFilters = () => {
    setSearchText("");
    setDietFilter("All");
    setCategoryFilter("");
    setMaxPrice(null);
    setPickupFilter("");
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading available food...</Text>
      </View>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <View style={styles.container}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Food2Go</Text>
          <Text style={styles.subtitle}>Available surplus food</Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerBtn} onPress={fetchBags}>
            <Text style={styles.headerBtnText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, showFilters && styles.headerBtnActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Text style={styles.headerBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate("MyBookings")}
          >
            <Text style={styles.headerBtnText}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SEARCH & FILTER PANEL ────────────────────────────────────────── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by store name or category…"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />

          {/* Diet chips */}
          <Text style={styles.filterLabel}>Diet Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {DIET_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, dietFilter === opt && styles.chipActive]}
                onPress={() => setDietFilter(opt)}
              >
                <Text style={[styles.chipText, dietFilter === opt && styles.chipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category text filter */}
          <Text style={styles.filterLabel}>Category</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="e.g. Bakery, Meals…"
            placeholderTextColor="#999"
            value={categoryFilter}
            onChangeText={setCategoryFilter}
          />

          {/* Max price chips */}
          <Text style={styles.filterLabel}>Max Price</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {PRICE_STEPS.map((step) => (
              <TouchableOpacity
                key={step.label}
                style={[styles.chip, maxPrice === step.value && styles.chipActive]}
                onPress={() => setMaxPrice(step.value)}
              >
                <Text style={[styles.chipText, maxPrice === step.value && styles.chipTextActive]}>
                  {step.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pickup time */}
          <Text style={styles.filterLabel}>Available at (HH:MM)</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="e.g. 19:00"
            placeholderTextColor="#999"
            value={pickupFilter}
            onChangeText={setPickupFilter}
          />

          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
            <Text style={styles.resetBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── FILTER SUMMARY ──────────────────────────────────────────────── */}
      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          {filteredBags.length} of {bags.filter((b) => b.quantityAvailable > 0).length} available
        </Text>
      </View>

      {/* ── MAP ─────────────────────────────────────────────────────────── */}
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

      {/* ── SELECTED BAG DETAIL ─────────────────────────────────────────── */}
      {selectedBag && (
        <View style={styles.detailsCard}>
          <Text style={styles.storeName}>
            {selectedBag.businessId?.storeName || "Food Store"}
          </Text>

          <Text style={styles.foodCategory}>{selectedBag.category}</Text>

          <Text style={styles.detail}>Diet: {selectedBag.dietType}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{selectedBag.discountedPrice}</Text>

            <Text style={styles.oldPrice}>
              Value ₹{selectedBag.originalPrice}
            </Text>
          </View>

          <Text style={styles.detail}>
            Quantity available: {selectedBag.quantityAvailable}
          </Text>

          <Text style={styles.detail}>
            Pickup: {selectedBag.pickupStartTime} - {selectedBag.pickupEndTime}
          </Text>

          <TouchableOpacity
            style={[
              styles.reserveButton,
              (selectedBag.quantityAvailable <= 0 || booking) && styles.reserveButtonDisabled,
            ]}
            onPress={handleReserve}
            disabled={selectedBag.quantityAvailable <= 0 || booking}
          >
            <Text style={styles.reserveButtonText}>
              {booking
                ? "Reserving…"
                : selectedBag.quantityAvailable <= 0
                ? "Sold Out"
                : "🛒 Reserve Bag"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedBag(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── NO-SELECTION INFO CARD ───────────────────────────────────────── */}
      {!selectedBag && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {filteredBags.length > 0
              ? `📍 ${filteredBags.length} surplus food listing(s) on map`
              : bags.length > 0
              ? "No listings match your filters."
              : "No surplus food available right now."}
          </Text>

          <Text style={styles.infoSubtext}>
            Tap a map marker to see food details.
          </Text>
        </View>
      )}

      {/* ── FOOTER BUTTONS ──────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.navigate("MyBookings")}
        >
          <Text style={styles.footerBtnText}>📋 My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.navigate("CustomerProfile")}
        >
          <Text style={styles.footerBtnText}>👤 Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerLogout]}
          onPress={logout}
        >
          <Text style={[styles.footerBtnText, { color: "#c0392b" }]}>⏏ Log Out</Text>
        </TouchableOpacity>
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
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  headerButtons: {
    flexDirection: "row",
    gap: 6,
  },

  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },

  headerBtnActive: {
    backgroundColor: "#FF6B35",
  },

  headerBtnText: {
    fontSize: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B35",
  },

  subtitle: {
    color: "#666",
    marginTop: 2,
    fontSize: 13,
  },

  // ── Filter panel ──────────────────────────────────────────────────────────
  filterPanel: {
    backgroundColor: "#fff",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },

  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 4,
  },

  chipRow: {
    flexDirection: "row",
    marginBottom: 4,
  },

  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  chipActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },

  chipText: {
    fontSize: 13,
    color: "#555",
  },

  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  filterInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#fafafa",
    marginBottom: 4,
  },

  resetBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },

  resetBtnText: {
    color: "#FF6B35",
    fontWeight: "600",
    fontSize: 13,
  },

  resultBar: {
    backgroundColor: "#fafafa",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  resultText: {
    fontSize: 12,
    color: "#777",
  },

  // ── Map ───────────────────────────────────────────────────────────────────
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

  // ── Bag detail card ───────────────────────────────────────────────────────
  detailsCard: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 16,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  storeName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  foodCategory: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 8,
    color: "#555",
  },

  detail: {
    color: "#555",
    marginTop: 4,
    fontSize: 14,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 10,
  },

  price: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF6B35",
  },

  oldPrice: {
    color: "#999",
    textDecorationLine: "line-through",
    fontSize: 15,
  },

  reserveButton: {
    marginTop: 14,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  reserveButtonDisabled: {
    backgroundColor: "#ccc",
  },

  reserveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  closeButton: {
    marginTop: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  closeButtonText: {
    color: "#555",
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Info card ─────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 14,
    borderRadius: 12,
  },

  infoText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },

  infoSubtext: {
    color: "#888",
    marginTop: 4,
    fontSize: 13,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },

  footerBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },

  footerLogout: {
    borderLeftWidth: 1,
    borderLeftColor: "#eee",
  },

  footerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
});
