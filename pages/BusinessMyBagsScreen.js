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
import { API_BAGS, API_BOOKINGS } from "../constants/api";
import { useAuth } from "../AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dietEmoji = { Veg: "🌿", "Non-Veg": "🍗", Mixed: "🍱" };

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Bag card ─────────────────────────────────────────────────────────────────
function BagCard({ bag, bookingCount, onDeactivate }) {
  const isActive   = bag.status === "Active";
  const isAvailable = bag.quantityAvailable > 0 && isActive;

  return (
    <View style={styles.bagCard}>
      <View style={styles.bagHeader}>
        <Text style={styles.bagCategory}>
          {dietEmoji[bag.dietType] || "🍱"} {bag.category}
        </Text>
        <View style={[
          styles.badge,
          isAvailable ? styles.badgeActive
            : isActive ? styles.badgeSoldOut
            : styles.badgeInactive,
        ]}>
          <Text style={[styles.badgeText, {
            color: isAvailable ? "#155724" : isActive ? "#721c24" : "#555",
          }]}>
            {isAvailable ? `${bag.quantityAvailable} left`
              : isActive ? "Sold Out"
              : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{bag.discountedPrice}</Text>
        <Text style={styles.oldPrice}>Value ₹{bag.originalPrice}</Text>
      </View>

      <Text style={styles.detail}>
        🕐 {bag.pickupStartTime} – {bag.pickupEndTime}
      </Text>
      <Text style={styles.detail}>Diet: {bag.dietType}</Text>

      {bookingCount > 0 && (
        <Text style={styles.bookingCount}>
          📦 {bookingCount} booking{bookingCount !== 1 ? "s" : ""} received
        </Text>
      )}

      {isActive && (
        <TouchableOpacity
          style={styles.deactivateBtn}
          onPress={() => onDeactivate && onDeactivate(bag._id)}
        >
          <Text style={styles.deactivateBtnText}>Deactivate</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Booking row (Business view) ──────────────────────────────────────────────
function BookingRow({ booking }) {
  const snap = booking.snapshot || {};
  return (
    <View style={styles.bookingRow}>
      <View style={styles.bookingRowHeader}>
        <Text style={styles.bookingCategory}>
          {snap.category || "Surprise Bag"}
        </Text>
        <Text style={styles.bookingPrice}>₹{snap.discountedPrice}</Text>
      </View>
      <Text style={styles.bookingMeta}>
        {snap.dietType} · Pickup: {snap.pickupStartTime} – {snap.pickupEndTime}
      </Text>
      <Text style={styles.bookingTime}>📅 Booked {formatDate(booking.createdAt)}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BusinessMyBagsScreen() {
  const { token } = useAuth();

  const [bags, setBags]         = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("bags"); // "bags" | "bookings"

  // ── Deactivate a bag ────────────────────────────────────────────────────────
  const handleDeactivate = (bagId) => {
    Alert.alert(
      "Deactivate Bag",
      "This will hide the bag from customers. Existing bookings are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BAGS}/${bagId}/deactivate`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) {
                Alert.alert("Error", data.error || "Could not deactivate bag.");
                return;
              }
              // Update local state immediately
              setBags((prev) =>
                prev.map((b) =>
                  b._id === bagId ? { ...b, status: "Inactive" } : b
                )
              );
            } catch (err) {
              console.log("Deactivate error:", err.message);
              Alert.alert("Connection Error", "Could not reach the server.");
            }
          },
        },
      ]
    );
  };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bagsRes, bookingsRes] = await Promise.all([
        fetch(`${API_BAGS}/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BOOKINGS}/business`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const bagsData     = await bagsRes.json();
      const bookingsData = await bookingsRes.json();

      if (bagsRes.ok) {
        setBags(Array.isArray(bagsData) ? bagsData : []);
      } else {
        Alert.alert("Error", bagsData.error || "Could not load bags.");
      }

      if (bookingsRes.ok) {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }
    } catch (err) {
      console.log("BusinessMyBags fetch error:", err.message);
      Alert.alert("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // Build booking-count map: bagId -> count
  const bookingCountMap = bookings.reduce((acc, b) => {
    const id = String(b.bagId);
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  // ── Tab switcher ─────────────────────────────────────────────────────────
  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "bags" && styles.tabActive]}
        onPress={() => setActiveTab("bags")}
      >
        <Text style={[styles.tabText, activeTab === "bags" && styles.tabTextActive]}>
          🛍️ My Bags ({bags.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "bookings" && styles.tabActive]}
        onPress={() => setActiveTab("bookings")}
      >
        <Text style={[styles.tabText, activeTab === "bookings" && styles.tabTextActive]}>
          📦 Bookings ({bookings.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Bags tab ─────────────────────────────────────────────────────────────
  if (activeTab === "bags") {
    return (
      <View style={styles.container}>
        {renderTabs()}
        {bags.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyTitle}>No bags published yet</Text>
            <Text style={styles.emptySubtitle}>
              Go to the dashboard to publish your first Surprise Bag.
            </Text>
          </View>
        ) : (
          <FlatList
            data={bags}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <BagCard
                bag={item}
                bookingCount={bookingCountMap[String(item._id)] || 0}
                onDeactivate={handleDeactivate}
              />
            )}
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
                {bags.length} bag{bags.length !== 1 ? "s" : ""} published
              </Text>
            }
          />
        )}
      </View>
    );
  }

  // ── Bookings tab ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {renderTabs()}
      {bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>
            Customers haven't reserved any of your bags yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <BookingRow booking={item} />}
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
              {bookings.length} total booking{bookings.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      )}
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

  loadingText: { marginTop: 12, color: "#666" },

  emptyIcon:     { fontSize: 52, marginBottom: 12 },
  emptyTitle:    { fontSize: 20, fontWeight: "bold", color: "#333" },
  emptySubtitle: { color: "#888", marginTop: 8, textAlign: "center", lineHeight: 22 },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
  },

  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#FF6B35",
  },

  tabText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "600",
  },

  tabTextActive: {
    color: "#FF6B35",
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

  // ── Bag card ──────────────────────────────────────────────────────────────
  bagCard: {
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

  bagHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  bagCategory: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeActive:    { backgroundColor: "#D4EDDA" },
  badgeSoldOut:   { backgroundColor: "#F8D7DA" },
  badgeInactive:  { backgroundColor: "#E2E3E5" },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
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
    marginTop: 3,
  },

  bookingCount: {
    marginTop: 8,
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
  },

  deactivateBtn: {
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFF3CD",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFEAA7",
  },

  deactivateBtnText: {
    fontSize: 13,
    color: "#856404",
    fontWeight: "600",
  },

  bookingRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  bookingRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  bookingCategory: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  bookingPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FF6B35",
  },

  bookingStore: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  bookingMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },

  bookingTime: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 4,
  },
});
