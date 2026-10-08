import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { API_BOOKINGS } from "../constants/api";
import { useAuth } from "../AuthContext";

// ─── Status badge colours ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  confirmed: { bg: "#D4EDDA", text: "#155724" },
  completed: { bg: "#CCE5FF", text: "#004085" },
  cancelled:  { bg: "#F8D7DA", text: "#721C24" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dietEmoji = { Veg: "🌿", "Non-Veg": "🍗", Mixed: "🍱" };

// ─── Single booking card ──────────────────────────────────────────────────────
function BookingCard({ booking }) {
  const snap = booking.snapshot || {};
  const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.confirmed;

  return (
    <View style={styles.card}>
      {/* Store + status row */}
      <View style={styles.cardHeader}>
        <Text style={styles.storeName}>{snap.storeName || "Unknown Store"}</Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Category + diet */}
      <Text style={styles.category}>
        {dietEmoji[snap.dietType] || "🍱"} {snap.category} · {snap.dietType}
      </Text>

      {/* Price row */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{snap.discountedPrice}</Text>
        <Text style={styles.oldPrice}>Value ₹{snap.originalPrice}</Text>
      </View>

      {/* Pickup */}
      <Text style={styles.detail}>
        🕐 Pickup: {snap.pickupStartTime} – {snap.pickupEndTime}
      </Text>

      {/* Booking time */}
      <Text style={styles.timestamp}>Booked on {formatDate(booking.createdAt)}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MyBookingsScreen({ navigation }) {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BOOKINGS}/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.error || "Could not load bookings.");
        return;
      }
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("MyBookings fetch error:", err.message);
      Alert.alert("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading your bookings…</Text>
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (bookings.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>No bookings yet</Text>
        <Text style={styles.emptySubtitle}>
          Find a surplus food bag on the map and reserve it!
        </Text>
        <TouchableOpacity
          style={styles.goBackBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackText}>Browse Food</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6B35"]}
          />
        }
        ListHeaderComponent={
          <Text style={styles.listHeader}>
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </Text>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 12,
    color: "#666",
  },

  emptyIcon: {
    fontSize: 52,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },

  emptySubtitle: {
    color: "#888",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  goBackBtn: {
    marginTop: 20,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },

  goBackText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  list: {
    padding: 16,
    paddingBottom: 30,
  },

  listHeader: {
    fontSize: 13,
    color: "#999",
    marginBottom: 10,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  storeName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  category: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },

  price: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6B35",
  },

  oldPrice: {
    fontSize: 13,
    color: "#aaa",
    textDecorationLine: "line-through",
  },

  detail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  timestamp: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 8,
  },
});
