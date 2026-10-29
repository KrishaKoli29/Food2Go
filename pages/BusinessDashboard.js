import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";

const BUSINESS_ID_KEY = "food2go_business_id";
const BUSINESS_NAME_KEY = "food2go_business_name";

// Tabs: Add Bag & Listings are first, then Orders & Donate
const TABS = [
  { key: "add_bag", label: "➕ Add Bag" },
  { key: "listings", label: "Listings" },
  { key: "orders", label: "Orders" },
  { key: "donate", label: "Donate" },
];

const DEFAULT_LAT = "22.5645";
const DEFAULT_LNG = "72.9289";

export default function BusinessDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("add_bag");
  const [storeName, setStoreName] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [businessId, setBusinessId] = useState(null);

  // Store registration (new store, no businessId yet)
  const [newStoreName, setNewStoreName] = useState("");
  const [newLatitude, setNewLatitude] = useState(DEFAULT_LAT);
  const [newLongitude, setNewLongitude] = useState(DEFAULT_LNG);

  // Edit location mode
  const [editingLocation, setEditingLocation] = useState(false);
  const [editLatitude, setEditLatitude] = useState(DEFAULT_LAT);
  const [editLongitude, setEditLongitude] = useState(DEFAULT_LNG);
  const [savingLocation, setSavingLocation] = useState(false);

  const [originalPrice, setOriginalPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [category, setCategory] = useState("");
  const [dietType, setDietType] = useState("Veg");
  const [quantityAvailable, setQuantityAvailable] = useState("");
  const [pickupStartTime, setPickupStartTime] = useState("18:00");
  const [pickupEndTime, setPickupEndTime] = useState("21:00");

  const [initializing, setInitializing] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [publishingBag, setPublishingBag] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingBags, setLoadingBags] = useState(false);
  const [deletingBagId, setDeletingBagId] = useState(null);
  const [editingBagId, setEditingBagId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [businessBags, setBusinessBags] = useState([]);
  const [donations, setDonations] = useState([]);
  const [donationCategory, setDonationCategory] = useState("");
  const [donationDietType, setDonationDietType] = useState("Veg");
  const [donationQuantity, setDonationQuantity] = useState("");
  const [donationStartTime, setDonationStartTime] = useState("18:00");
  const [donationEndTime, setDonationEndTime] = useState("21:00");
  const [donationNotes, setDonationNotes] = useState("");
  const [publishingDonation, setPublishingDonation] = useState(false);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [cancellingDonationId, setCancellingDonationId] = useState(null);
  const [otpInputs, setOtpInputs] = useState({});
  const [verifyingOrderId, setVerifyingOrderId] = useState(null);

  // ──────────────────────────────────────────────────────────────
  // RESTORE BUSINESS DETAILS (and load saved coordinates from DB)
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const restoreBusiness = async () => {
      try {
        const savedId = await AsyncStorage.getItem(BUSINESS_ID_KEY);
        const savedName = await AsyncStorage.getItem(BUSINESS_NAME_KEY);

        if (active && savedId) {
          setBusinessId(savedId);
          if (savedName) setStoreName(savedName);

          // Fetch saved coordinates from DB so the pin is always correct
          try {
            const res = await api.get(`/api/business/${savedId}`);
            const biz = res.data.business;
            if (biz?.latitude != null && biz?.longitude != null) {
              const lat = String(biz.latitude);
              const lng = String(biz.longitude);
              setLatitude(lat);
              setLongitude(lng);
              setEditLatitude(lat);
              setEditLongitude(lng);
            }
          } catch (fetchErr) {
            console.warn(
              "Could not fetch saved business coordinates:",
              fetchErr.message,
            );
          }
        }
      } catch (error) {
        console.error("Restore business error:", error.message);
      } finally {
        if (active) setInitializing(false);
      }
    };

    restoreBusiness();
    return () => {
      active = false;
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // MAP HTML — used for registering a new store
  // ──────────────────────────────────────────────────────────────
  const buildMapHtml = (lat, lng) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const map = L.map("map").setView([${Number(lat) || 22.5645}, ${Number(lng) || 72.9289}], 15);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
          }).addTo(map);
          const marker = L.marker([${Number(lat) || 22.5645}, ${Number(lng) || 72.9289}], { draggable: true }).addTo(map);
          function send(lat, lng) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
          }
          marker.on("dragend", function() {
            const p = marker.getLatLng();
            send(p.lat, p.lng);
          });
          map.on("click", function(e) {
            marker.setLatLng([e.latlng.lat, e.latlng.lng]);
            send(e.latlng.lat, e.latlng.lng);
          });
        </script>
      </body>
    </html>
  `;

  const registerMapHtml = buildMapHtml(newLatitude, newLongitude);
  const editMapHtml = buildMapHtml(editLatitude, editLongitude);

  // ──────────────────────────────────────────────────────────────
  // REGISTER STORE
  // ──────────────────────────────────────────────────────────────
  const saveStore = async () => {
    if (!newStoreName.trim()) {
      Alert.alert("Required", "Enter your store name.");
      return;
    }

    const lat = Number(newLatitude);
    const lng = Number(newLongitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      Alert.alert("Invalid location", "Select a valid location on the map.");
      return;
    }

    try {
      setSavingStore(true);

      // 1. Retrieve the saved JWT token from device memory
      const token = await AsyncStorage.getItem("userToken");

      // 2. Send the request with the token attached in the headers
      const response = await api.post(
        "/api/business/onboard",
        {
          storeName: newStoreName.trim(),
          latitude: lat,
          longitude: lng,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Connects the store to this user's ID
          },
        },
      );

      const business = response.data.business;
      const savedId =
        business?._id || response.data.businessId || response.data._id;

      if (!savedId) {
        Alert.alert(
          "Registration error",
          "The server did not return a business ID.",
        );
        return;
      }

      await AsyncStorage.setItem(BUSINESS_ID_KEY, String(savedId));
      await AsyncStorage.setItem(BUSINESS_NAME_KEY, newStoreName.trim());

      setBusinessId(String(savedId));
      setStoreName(newStoreName.trim());
      setLatitude(String(lat));
      setLongitude(String(lng));
      setEditLatitude(String(lat));
      setEditLongitude(String(lng));

      Alert.alert("Success", "Your store has been registered successfully.");
    } catch (error) {
      console.error(
        "Store registration error:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Registration failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to register your store.",
      );
    } finally {
      setSavingStore(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // SAVE UPDATED LOCATION
  // ──────────────────────────────────────────────────────────────
  const saveLocation = async () => {
    const lat = Number(editLatitude);
    const lng = Number(editLongitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      Alert.alert(
        "Invalid location",
        "Drag the pin or tap the map to select a valid location.",
      );
      return;
    }

    try {
      setSavingLocation(true);
      await api.patch(`/api/business/${businessId}/location`, {
        latitude: lat,
        longitude: lng,
      });

      setLatitude(String(lat));
      setLongitude(String(lng));
      setEditingLocation(false);

      Alert.alert("Location saved", "Your store location has been updated.");
    } catch (error) {
      console.error(
        "Save location error:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Save failed",
        error.response?.data?.message || "Unable to save location.",
      );
    } finally {
      setSavingLocation(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // FETCH BUSINESS LISTINGS
  // ──────────────────────────────────────────────────────────────
  const fetchBusinessBags = useCallback(
    async (showError = true) => {
      if (!businessId) {
        setBusinessBags([]);
        return;
      }
      try {
        setLoadingBags(true);
        const response = await api.get(
          `/api/bags/business/${encodeURIComponent(businessId)}`,
        );
        const receivedBags = Array.isArray(response.data)
          ? response.data
          : response.data.bags || [];
        setBusinessBags(receivedBags);
      } catch (error) {
        console.error(
          "FETCH BUSINESS LISTINGS ERROR:",
          error.response?.data || error.message,
        );
        if (showError) {
          Alert.alert(
            "Unable to load listings",
            error.response?.data?.message ||
              error.response?.data?.error ||
              "Unable to fetch your food listings.",
          );
        }
      } finally {
        setLoadingBags(false);
      }
    },
    [businessId],
  );

  // ──────────────────────────────────────────────────────────────
  // FETCH BUSINESS DONATION HISTORY
  // ──────────────────────────────────────────────────────────────
  const fetchDonations = useCallback(
    async (showError = true) => {
      if (!businessId) {
        setDonations([]);
        return;
      }
      try {
        setLoadingDonations(true);
        const response = await api.get(
          `/api/donations/business/${encodeURIComponent(businessId)}`,
        );
        setDonations(
          Array.isArray(response.data.donations) ? response.data.donations : [],
        );
      } catch (error) {
        console.error(
          "FETCH DONATIONS ERROR:",
          error.response?.data || error.message,
        );
        if (showError)
          Alert.alert(
            "Unable to load donations",
            error.response?.data?.message || "Please try again.",
          );
      } finally {
        setLoadingDonations(false);
      }
    },
    [businessId],
  );

  // ──────────────────────────────────────────────────────────────
  // PUBLISH A FREE FOOD DONATION
  // ──────────────────────────────────────────────────────────────
  const publishDonation = async () => {
    if (!businessId) {
      Alert.alert(
        "Register your store",
        "Register your store before donating food.",
      );
      return;
    }
    if (!donationCategory.trim() || !donationQuantity.trim()) {
      Alert.alert("Missing details", "Enter the food category and quantity.");
      return;
    }
    const quantity = Number(donationQuantity);
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert(
        "Invalid quantity",
        "Enter a whole number greater than zero.",
      );
      return;
    }
    if (
      !timePattern.test(donationStartTime) ||
      !timePattern.test(donationEndTime)
    ) {
      Alert.alert(
        "Invalid pickup time",
        "Use 24-hour format, for example 18:00.",
      );
      return;
    }
    try {
      setPublishingDonation(true);
      await api.post("/api/donations/create", {
        businessId,
        category: donationCategory.trim(),
        dietType: donationDietType,
        quantity,
        pickupStartTime: donationStartTime,
        pickupEndTime: donationEndTime,
        notes: donationNotes.trim(),
      });
      setDonationCategory("");
      setDonationDietType("Veg");
      setDonationQuantity("");
      setDonationStartTime("18:00");
      setDonationEndTime("21:00");
      setDonationNotes("");
      await fetchDonations(false);
      Alert.alert(
        "Donation published",
        "NGOs can now view and accept your free food donation.",
      );
    } catch (error) {
      console.error(
        "PUBLISH DONATION ERROR:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Donation failed",
        error.response?.data?.message || "Unable to publish donation.",
      );
    } finally {
      setPublishingDonation(false);
    }
  };

  const cancelDonation = (donation) => {
    Alert.alert(
      "Cancel donation",
      "Cancel this donation? It can only be cancelled before an NGO accepts it.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel donation",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingDonationId(donation._id);
              await api.patch(`/api/donations/${donation._id}/cancel`, {
                businessId,
              });
              await fetchDonations(false);
              Alert.alert("Cancelled", "Your donation has been cancelled.");
            } catch (error) {
              Alert.alert(
                "Unable to cancel",
                error.response?.data?.message ||
                  "Only available donations can be cancelled.",
              );
            } finally {
              setCancellingDonationId(null);
            }
          },
        },
      ],
    );
  };

  // ──────────────────────────────────────────────────────────────
  // START EDITING LISTING
  // ──────────────────────────────────────────────────────────────
  const startEditingListing = (bag) => {
    setEditingBagId(bag._id);
    setCategory(String(bag.category || ""));
    setDietType(bag.dietType || "Veg");
    setOriginalPrice(String(bag.originalPrice ?? ""));
    setDiscountedPrice(String(bag.discountedPrice ?? ""));
    setQuantityAvailable(String(bag.quantityAvailable ?? ""));
    setPickupStartTime(String(bag.pickupStartTime || "18:00"));
    setPickupEndTime(String(bag.pickupEndTime || "21:00"));
    setActiveTab("add_bag");
    Alert.alert(
      "Edit listing",
      "Listing details loaded. Make your changes and press Save Changes.",
    );
  };

  const cancelEditingListing = () => {
    setEditingBagId(null);
    setCategory("");
    setDietType("Veg");
    setOriginalPrice("");
    setDiscountedPrice("");
    setQuantityAvailable("");
    setPickupStartTime("18:00");
    setPickupEndTime("21:00");
  };

  // ──────────────────────────────────────────────────────────────
  // CREATE OR UPDATE LISTING
  // ──────────────────────────────────────────────────────────────
  const publishBag = async () => {
    if (!businessId) {
      Alert.alert(
        "Store not registered",
        "Register your store before publishing food.",
      );
      return;
    }
    if (
      !category.trim() ||
      !originalPrice.trim() ||
      !discountedPrice.trim() ||
      !quantityAvailable.trim()
    ) {
      Alert.alert("Missing details", "Fill in all food details.");
      return;
    }

    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);
    const quantity = Number(quantityAvailable);

    if (
      !Number.isFinite(original) ||
      !Number.isFinite(discounted) ||
      original <= 0 ||
      discounted <= 0 ||
      discounted >= original
    ) {
      Alert.alert(
        "Invalid price",
        "Discounted price must be positive and lower than the original price.",
      );
      return;
    }
    if (((original - discounted) / original) * 100 < 30) {
      Alert.alert(
        "Discount too low",
        "Food2Go requires at least a 30% discount.",
      );
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert(
        "Invalid quantity",
        "Enter a whole number greater than zero.",
      );
      return;
    }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (
      !timePattern.test(pickupStartTime) ||
      !timePattern.test(pickupEndTime)
    ) {
      Alert.alert("Invalid pickup time", "Use 24-hour format, such as 18:00.");
      return;
    }

    const isEditing = Boolean(editingBagId);
    try {
      setPublishingBag(true);
      const payload = {
        businessId,
        originalPrice: original,
        discountedPrice: discounted,
        category: category.trim(),
        dietType,
        quantityAvailable: quantity,
        pickupStartTime,
        pickupEndTime,
      };

      let response;
      if (isEditing) {
        response = await api.put(`/api/bags/${editingBagId}`, payload);
      } else {
        response = await api.post("/api/bags/create", payload);
      }

      console.log(
        isEditing ? "LISTING UPDATED:" : "LISTING CREATED:",
        response.data,
      );

      setEditingBagId(null);
      setCategory("");
      setDietType("Veg");
      setOriginalPrice("");
      setDiscountedPrice("");
      setQuantityAvailable("");
      setPickupStartTime("18:00");
      setPickupEndTime("21:00");

      await fetchBusinessBags(false);

      Alert.alert(
        "Success",
        isEditing
          ? "Food listing updated successfully."
          : "Food listing published successfully.",
      );
    } catch (error) {
      console.error(
        "Save food listing error:",
        error.response?.data || error.message,
      );
      Alert.alert(
        isEditing ? "Update failed" : "Publishing failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to save the food listing.",
      );
    } finally {
      setPublishingBag(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // DELETE LISTING
  // ──────────────────────────────────────────────────────────────
  const deleteListing = (bag) => {
    if (deletingBagId) return;
    Alert.alert(
      "Delete Food Listing",
      `Are you sure you want to delete "${bag.category || "this listing"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingBagId(bag._id);
              const response = await api.delete(`/api/bags/${bag._id}`, {
                data: { businessId },
              });
              setBusinessBags((prev) =>
                prev.filter((item) => item._id !== bag._id),
              );
              if (editingBagId === bag._id) cancelEditingListing();
              Alert.alert(
                "Success",
                response.data?.message || "Food listing deleted successfully.",
              );
              await fetchBusinessBags(false);
            } catch (error) {
              console.error(
                "DELETE LISTING ERROR:",
                error.response?.data || error.message,
              );
              Alert.alert(
                "Delete failed",
                error.response?.data?.message ||
                  error.response?.data?.error ||
                  "Unable to delete this listing.",
              );
            } finally {
              setDeletingBagId(null);
            }
          },
        },
      ],
    );
  };

  // ──────────────────────────────────────────────────────────────
  // FETCH BUSINESS ORDERS
  // ──────────────────────────────────────────────────────────────
  const fetchBusinessOrders = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoadingOrders(true);
      const response = await api.get("/api/orders/business-orders", {
        params: { businessId },
      });
      const receivedOrders = Array.isArray(response.data)
        ? response.data
        : response.data.orders || [];
      setOrders(receivedOrders);
    } catch (error) {
      console.error(
        "FETCH BUSINESS ORDERS ERROR:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Unable to load orders",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Check your backend server and business ID.",
      );
    } finally {
      setLoadingOrders(false);
    }
  }, [businessId]);

  // ──────────────────────────────────────────────────────────────
  // LOAD INITIAL DATA
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initializing && businessId) {
      fetchBusinessBags(false);
      fetchBusinessOrders();
      fetchDonations(false);
    }
  }, [
    initializing,
    businessId,
    fetchBusinessBags,
    fetchBusinessOrders,
    fetchDonations,
  ]);

  // ──────────────────────────────────────────────────────────────
  // VERIFY CUSTOMER PICKUP OTP
  // ──────────────────────────────────────────────────────────────
  const verifyPickup = async (order) => {
    const orderId = order._id;
    const enteredOTP = (otpInputs[orderId] || "").trim();
    if (!/^\d{6}$/.test(enteredOTP)) {
      Alert.alert("Invalid OTP", "Enter the customer's six-digit pickup OTP.");
      return;
    }
    try {
      setVerifyingOrderId(orderId);
      const response = await api.post("/api/orders/verify-pickup", {
        businessId,
        orderId,
        pickupOTP: enteredOTP,
      });
      Alert.alert(
        "Pickup verified",
        response.data.message || "Order completed successfully.",
      );
      setOtpInputs((prev) => ({ ...prev, [orderId]: "" }));
      await fetchBusinessOrders();
    } catch (error) {
      console.error(
        "OTP verification error:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Verification failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to verify pickup OTP.",
      );
    } finally {
      setVerifyingOrderId(null);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // RENDER CUSTOMER ORDER
  // ──────────────────────────────────────────────────────────────
  const renderOrder = (order) => {
    const bag =
      order.bagId && typeof order.bagId === "object" ? order.bagId : null;
    const status = String(order.status || "pending").toLowerCase();
    const statusColor =
      status === "paid"
        ? "#198754"
        : status === "completed"
          ? "#176B3A"
          : status === "failed" || status === "cancelled"
            ? "#C62828"
            : "#B45309";

    return (
      <View key={order._id} style={styles.orderCard}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderTitle}>{bag?.category || "Food bag"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Order ID</Text>
          <Text style={styles.orderValue}>#{String(order._id).slice(-8)}</Text>
        </View>
        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Customer</Text>
          <Text style={styles.orderValue}>{order.customerPhone || "N/A"}</Text>
        </View>
        {bag?.discountedPrice != null && (
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Amount</Text>
            <Text style={[styles.orderValue, styles.amountText]}>
              ₹{bag.discountedPrice}
            </Text>
          </View>
        )}

        {status === "paid" && (
          <View style={styles.pickupBox}>
            <Text style={styles.pickupHeading}>Verify Customer Pickup</Text>
            <Text style={styles.pickupHint}>
              Ask the customer for their six-digit OTP.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#777"
              keyboardType="number-pad"
              maxLength={6}
              value={otpInputs[order._id] || ""}
              onChangeText={(value) => {
                const digits = value.replace(/\D/g, "").slice(0, 6);
                setOtpInputs((prev) => ({ ...prev, [order._id]: digits }));
              }}
            />
            <TouchableOpacity
              style={[
                styles.verifyButton,
                verifyingOrderId === order._id && styles.disabledButton,
              ]}
              disabled={verifyingOrderId === order._id}
              onPress={() => verifyPickup(order)}
            >
              {verifyingOrderId === order._id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Pickup OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {status === "completed" && (
          <Text style={styles.completedText}>
            ✓ Pickup completed successfully
          </Text>
        )}
        {status === "pending" && (
          <Text style={styles.pendingText}>Payment is pending.</Text>
        )}
        {status === "failed" && (
          <Text style={styles.failedText}>
            Payment failed or order cancelled.
          </Text>
        )}
      </View>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // LOADING SCREEN
  // ──────────────────────────────────────────────────────────────
  if (initializing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#198754" />
        <Text style={styles.loadingText}>Loading your business...</Text>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // STORE INFO BAR (always visible at top, under the header)
  // ──────────────────────────────────────────────────────────────
  const renderStoreBar = () => {
    if (!businessId) {
      return (
        <View style={styles.storeBarUnregistered}>
          <Text style={styles.storeBarTitle}>Register Your Store</Text>
          <Text style={styles.storeBarSub}>
            Set up your store to start publishing food listings.
          </Text>

          <Text style={styles.label}>Store Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your store name"
            placeholderTextColor="#777"
            value={newStoreName}
            onChangeText={setNewStoreName}
          />

          <Text style={styles.label}>Choose Location (tap / drag pin)</Text>
          <View style={styles.mapContainer}>
            <WebView
              key={`register-${newLatitude}-${newLongitude}`}
              source={{ html: registerMapHtml }}
              onMessage={(event) => {
                try {
                  const loc = JSON.parse(event.nativeEvent.data);
                  setNewLatitude(String(loc.latitude));
                  setNewLongitude(String(loc.longitude));
                } catch (e) {
                  console.error("Map msg error", e);
                }
              }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              style={styles.map}
            />
          </View>
          <View style={styles.coordsRow}>
            <Text style={styles.coordinates}>
              Lat: {Number(newLatitude).toFixed(4)}
            </Text>
            <Text style={styles.coordinates}>
              Lng: {Number(newLongitude).toFixed(4)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, savingStore && styles.disabledButton]}
            onPress={saveStore}
            disabled={savingStore}
          >
            {savingStore ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register Store</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (editingLocation) {
      return (
        <View style={styles.storeBarRegistered}>
          <View style={styles.storeBarRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeBarName}>{storeName}</Text>
              <Text style={styles.storeBarEditing}>
                Drag the pin or tap to choose a new location
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditLatitude(latitude);
                setEditLongitude(longitude);
                setEditingLocation(false);
              }}
            >
              <Text style={styles.cancelLocationText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <WebView
              key={`edit-${editLatitude}-${editLongitude}-mode`}
              source={{ html: editMapHtml }}
              onMessage={(event) => {
                try {
                  const loc = JSON.parse(event.nativeEvent.data);
                  setEditLatitude(String(loc.latitude));
                  setEditLongitude(String(loc.longitude));
                } catch (e) {
                  console.error("Map msg error", e);
                }
              }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              style={styles.map}
            />
          </View>
          <View style={styles.coordsRow}>
            <Text style={styles.coordinates}>
              Lat: {Number(editLatitude).toFixed(4)}
            </Text>
            <Text style={styles.coordinates}>
              Lng: {Number(editLongitude).toFixed(4)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              savingLocation && styles.disabledButton,
            ]}
            onPress={saveLocation}
            disabled={savingLocation}
          >
            {savingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Location</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.storeBarRegistered}>
        <View style={styles.storeBarRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeBarName}>🏪 {storeName}</Text>
            <Text style={styles.storeBarCoords}>
              {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editLocationBtn}
            onPress={() => {
              setEditLatitude(latitude);
              setEditLongitude(longitude);
              setEditingLocation(true);
            }}
          >
            <Text style={styles.editLocationBtnText}>Edit Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // ADD BAG TAB
  // ──────────────────────────────────────────────────────────────
  const renderAddBagTab = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        {editingBagId ? "✏️  Edit Listing" : "Publish Surplus Food"}
      </Text>

      {!businessId && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Register your store first to publish food.
          </Text>
        </View>
      )}

      <Text style={styles.label}>Food Category</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Meals, Bakery, Snacks"
        placeholderTextColor="#777"
        value={category}
        onChangeText={setCategory}
      />

      <Text style={styles.label}>Diet Type</Text>
      <View style={styles.dietRow}>
        {["Veg", "Non-Veg", "Mixed"].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.dietButton,
              dietType === type && styles.selectedDietButton,
            ]}
            onPress={() => setDietType(type)}
          >
            <Text
              style={[
                styles.dietText,
                dietType === type && styles.selectedDietText,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceField}>
          <Text style={styles.label}>Original (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#777"
            keyboardType="decimal-pad"
            value={originalPrice}
            onChangeText={setOriginalPrice}
          />
        </View>
        <View style={styles.priceSpacer} />
        <View style={styles.priceField}>
          <Text style={styles.label}>Discounted (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#777"
            keyboardType="decimal-pad"
            value={discountedPrice}
            onChangeText={setDiscountedPrice}
          />
        </View>
      </View>

      {originalPrice && discountedPrice && Number(originalPrice) > 0 && (
        <Text style={styles.discountText}>
          Discount:{" "}
          {(
            ((Number(originalPrice) - Number(discountedPrice)) /
              Number(originalPrice)) *
            100
          ).toFixed(1)}
          %
        </Text>
      )}

      <Text style={styles.label}>Available Quantity</Text>
      <TextInput
        style={styles.input}
        placeholder="Number of bags"
        placeholderTextColor="#777"
        keyboardType="number-pad"
        value={quantityAvailable}
        onChangeText={setQuantityAvailable}
      />

      <View style={styles.priceRow}>
        <View style={styles.priceField}>
          <Text style={styles.label}>Pickup Start</Text>
          <TextInput
            style={styles.input}
            placeholder="18:00"
            placeholderTextColor="#777"
            value={pickupStartTime}
            onChangeText={setPickupStartTime}
            maxLength={5}
          />
        </View>
        <View style={styles.priceSpacer} />
        <View style={styles.priceField}>
          <Text style={styles.label}>Pickup End</Text>
          <TextInput
            style={styles.input}
            placeholder="21:00"
            placeholderTextColor="#777"
            value={pickupEndTime}
            onChangeText={setPickupEndTime}
            maxLength={5}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!businessId || publishingBag) && styles.disabledButton,
        ]}
        onPress={publishBag}
        disabled={!businessId || publishingBag}
      >
        {publishingBag ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {editingBagId ? "Save Changes" : "Publish Food"}
          </Text>
        )}
      </TouchableOpacity>

      {editingBagId && (
        <TouchableOpacity
          style={styles.cancelEditButton}
          onPress={cancelEditingListing}
          disabled={publishingBag}
        >
          <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ──────────────────────────────────────────────────────────────
  // LISTINGS TAB
  // ──────────────────────────────────────────────────────────────
  const renderListingsTab = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Food Listings</Text>
        <TouchableOpacity
          style={[
            styles.refreshBtn,
            (!businessId || loadingBags) && styles.disabledButton,
          ]}
          onPress={() => fetchBusinessBags()}
          disabled={!businessId || loadingBags}
        >
          {loadingBags ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.refreshBtnText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {!businessId ? (
        <Text style={styles.emptyText}>
          Register your store to manage listings.
        </Text>
      ) : loadingBags && businessBags.length === 0 ? (
        <ActivityIndicator size="large" color="#198754" style={styles.loader} />
      ) : businessBags.length === 0 ? (
        <Text style={styles.emptyText}>
          No food listings yet. Use ➕ Add Bag to publish surplus food.
        </Text>
      ) : (
        businessBags.map((bag) => (
          <View key={bag._id} style={styles.listingCard}>
            <View style={styles.listingCardHeader}>
              <Text style={styles.listingTitle}>
                {bag.category || "Food listing"}
              </Text>
              <Text
                style={[
                  styles.listingStatusBadge,
                  String(bag.status || "Active").toLowerCase() !== "active" &&
                    styles.inactiveStatusBadge,
                ]}
              >
                {String(bag.status || "Active").toUpperCase()}
              </Text>
            </View>

            <View style={styles.listingDetails}>
              <Text style={styles.listingDetail}>
                Diet: {bag.dietType || "Not specified"}
              </Text>
              <Text style={styles.listingDetail}>
                ₹{Number(bag.discountedPrice || 0).toFixed(0)}{" "}
                <Text style={styles.listingStrike}>
                  ₹{Number(bag.originalPrice || 0).toFixed(0)}
                </Text>
              </Text>
              <Text style={styles.listingDetail}>
                Qty: {bag.quantityAvailable ?? 0}
              </Text>
              <Text style={styles.listingDetail}>
                Pickup: {bag.pickupStartTime || "--:--"} –{" "}
                {bag.pickupEndTime || "--:--"}
              </Text>
            </View>

            {String(bag.status || "Active").toLowerCase() === "active" && (
              <View style={styles.listingActions}>
                <TouchableOpacity
                  style={[styles.editButton, { flex: 1, marginRight: 6 }]}
                  onPress={() => startEditingListing(bag)}
                  disabled={publishingBag || deletingBagId !== null}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    { flex: 1, marginLeft: 6 },
                    deletingBagId === bag._id && styles.disabledButton,
                  ]}
                  onPress={() => deleteListing(bag)}
                  disabled={deletingBagId !== null}
                >
                  {deletingBagId === bag._id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  // ──────────────────────────────────────────────────────────────
  // ORDERS TAB
  // ──────────────────────────────────────────────────────────────
  const renderOrdersTab = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Customer Orders</Text>
        <TouchableOpacity
          style={[
            styles.refreshBtn,
            (!businessId || loadingOrders) && styles.disabledButton,
          ]}
          onPress={fetchBusinessOrders}
          disabled={!businessId || loadingOrders}
        >
          {loadingOrders ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.refreshBtnText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        View customer orders, check payment status, and verify pickup OTPs.
      </Text>

      {!businessId ? (
        <Text style={styles.emptyText}>
          No saved business ID. Register your store first.
        </Text>
      ) : loadingOrders && orders.length === 0 ? (
        <ActivityIndicator size="large" color="#198754" style={styles.loader} />
      ) : orders.length === 0 ? (
        <Text style={styles.emptyText}>No orders found for this business.</Text>
      ) : (
        orders.map(renderOrder)
      )}
    </View>
  );

  // ──────────────────────────────────────────────────────────────
  // DONATE TAB
  // ──────────────────────────────────────────────────────────────
  const renderDonateTab = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Donate Food to Charity 💚</Text>
        <Text style={styles.description}>
          Offer surplus food for free to registered NGOs. No payment is
          collected for donations.
        </Text>

        {!businessId && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              Register your store before donating food.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Food Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fresh meals, bakery, fruits"
          placeholderTextColor="#777"
          value={donationCategory}
          onChangeText={setDonationCategory}
        />

        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.dietRow}>
          {["Veg", "Non-Veg", "Mixed"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.dietButton,
                donationDietType === type && styles.selectedDietButton,
              ]}
              onPress={() => setDonationDietType(type)}
            >
              <Text
                style={[
                  styles.dietText,
                  donationDietType === type && styles.selectedDietText,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Quantity (meals / packs)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter quantity"
          placeholderTextColor="#777"
          keyboardType="number-pad"
          value={donationQuantity}
          onChangeText={setDonationQuantity}
        />

        <View style={styles.priceRow}>
          <View style={styles.priceField}>
            <Text style={styles.label}>Pickup Start</Text>
            <TextInput
              style={styles.input}
              placeholder="18:00"
              placeholderTextColor="#777"
              value={donationStartTime}
              onChangeText={setDonationStartTime}
              maxLength={5}
            />
          </View>
          <View style={styles.priceSpacer} />
          <View style={styles.priceField}>
            <Text style={styles.label}>Pickup End</Text>
            <TextInput
              style={styles.input}
              placeholder="21:00"
              placeholderTextColor="#777"
              value={donationEndTime}
              onChangeText={setDonationEndTime}
              maxLength={5}
            />
          </View>
        </View>

        <Text style={styles.label}>Additional Notes (optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
          placeholder="Allergens, packing details, storage instructions..."
          placeholderTextColor="#777"
          value={donationNotes}
          onChangeText={setDonationNotes}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!businessId || publishingDonation) && styles.disabledButton,
          ]}
          onPress={publishDonation}
          disabled={!businessId || publishingDonation}
        >
          {publishingDonation ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Publish Free Donation</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* DONATION HISTORY */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Donation History</Text>
          <TouchableOpacity
            style={[
              styles.refreshBtn,
              loadingDonations && styles.disabledButton,
            ]}
            onPress={() => fetchDonations()}
            disabled={loadingDonations}
          >
            {loadingDonations ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.refreshBtnText}>Refresh</Text>
            )}
          </TouchableOpacity>
        </View>

        {loadingDonations && donations.length === 0 ? (
          <ActivityIndicator style={styles.loader} color="#198754" />
        ) : donations.length === 0 ? (
          <Text style={styles.emptyText}>
            You have not published any donations yet.
          </Text>
        ) : (
          donations.map((donation) => (
            <View key={donation._id} style={styles.listingCard}>
              <View style={styles.listingCardHeader}>
                <Text style={styles.listingTitle}>{donation.category}</Text>
                <Text
                  style={[
                    styles.listingStatusBadge,
                    ["Cancelled", "Completed"].includes(donation.status) &&
                      styles.inactiveStatusBadge,
                  ]}
                >
                  {donation.status}
                </Text>
              </View>
              <Text style={styles.listingDetail}>
                Qty: {donation.quantity} · Diet: {donation.dietType}
              </Text>
              <Text style={styles.listingDetail}>
                Pickup: {donation.pickupStartTime} – {donation.pickupEndTime}
              </Text>
              <Text style={styles.listingDetail}>
                Recipient: {donation.ngoName || "Waiting for an NGO"}
              </Text>
              {donation.ngoContact ? (
                <Text style={styles.listingDetail}>
                  NGO Contact: {donation.ngoContact}
                </Text>
              ) : null}
              {donation.notes ? (
                <Text style={styles.listingDetail}>
                  Notes: {donation.notes}
                </Text>
              ) : null}
              {donation.status === "Available" && (
                <TouchableOpacity
                  style={[styles.deleteButton, { marginTop: 10 }]}
                  disabled={cancellingDonationId === donation._id}
                  onPress={() => cancelDonation(donation)}
                >
                  {cancellingDonationId === donation._id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Cancel Donation</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </>
  );

  // ──────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food2Go Business</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert("Logout", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                  try {
                    // FIX: Automatically clear out the old business ID cache on logout!
                    await AsyncStorage.removeItem(BUSINESS_ID_KEY);
                    await AsyncStorage.removeItem(BUSINESS_NAME_KEY);
                  } catch (e) {
                    console.error("Error clearing AsyncStorage", e);
                  }

                  if (onLogout) onLogout();
                  else
                    Alert.alert("Logout", "Logout handler is not configured.");
                },
              },
            ])
          }
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* STORE INFO BAR */}
      {renderStoreBar()}

      {/* TAB BAR — only show when store is registered and not editing location */}
      {businessId && !editingLocation && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                activeTab === tab.key && styles.activeTabItem,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TAB CONTENT */}
      {businessId && !editingLocation && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === "add_bag" && renderAddBagTab()}
          {activeTab === "listings" && renderListingsTab()}
          {activeTab === "orders" && renderOrdersTab()}
          {activeTab === "donate" && renderDonateTab()}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}

      {/* If not registered yet, store bar handles registration scroll */}
      {!businessId && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },

  // HEADER
  header: {
    backgroundColor: "#176B3A",
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  // STORE BAR — registered, compact
  storeBarRegistered: {
    backgroundColor: "#ECFDF5",
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  storeBarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeBarName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#065F46",
  },
  storeBarCoords: {
    fontSize: 11,
    color: "#047857",
    marginTop: 1,
  },
  storeBarEditing: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  editLocationBtn: {
    backgroundColor: "#176B3A",
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  editLocationBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  cancelLocationText: {
    color: "#C62828",
    fontWeight: "bold",
    fontSize: 13,
  },

  // STORE BAR — unregistered (full form inside bar area)
  storeBarUnregistered: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D6DDD6",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  storeBarTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#176B3A",
    marginBottom: 3,
  },
  storeBarSub: {
    fontSize: 13,
    color: "#555",
    marginBottom: 10,
  },

  // TAB BAR
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DCE8DC",
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomColor: "#198754",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#198754",
    fontWeight: "bold",
  },

  // SCROLL / CONTENT
  scrollView: { flex: 1 },
  contentContainer: { padding: 14 },

  // LOADING
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7F4",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#176B3A",
  },

  // CARD
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#176B3A",
    marginBottom: 10,
  },
  refreshBtn: {
    backgroundColor: "#198754",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  refreshBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  // BANNERS
  infoBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infoBannerText: { color: "#92400E", fontSize: 13 },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D6DDD6",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#222222",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
  },
  mapContainer: {
    height: 220,
    overflow: "hidden",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6DDD6",
    marginTop: 5,
  },
  map: { flex: 1 },
  coordsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  coordinates: { fontSize: 12, color: "#555555" },

  // PRICE ROW
  priceRow: { flexDirection: "row", marginTop: 4 },
  priceField: { flex: 1 },
  priceSpacer: { width: 12 },

  // BUTTONS
  primaryButton: {
    backgroundColor: "#198754",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48,
  },
  disabledButton: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
  cancelEditButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
  },
  cancelEditButtonText: { color: "#374151", fontWeight: "bold", fontSize: 14 },
  editButton: {
    backgroundColor: "#176B3A",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  editButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  deleteButton: {
    backgroundColor: "#C62828",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  deleteButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  verifyButton: {
    backgroundColor: "#176B3A",
    borderRadius: 8,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 10,
  },

  // LISTING CARD
  listingCard: {
    borderWidth: 1,
    borderColor: "#DCE8DC",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    backgroundColor: "#F8FCF8",
  },
  listingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#176B3A",
    flex: 1,
    marginRight: 8,
  },
  listingStatusBadge: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#198754",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  inactiveStatusBadge: { color: "#777777", backgroundColor: "#F3F4F6" },
  listingDetails: { flexDirection: "row", flexWrap: "wrap" },
  listingDetail: {
    fontSize: 12,
    color: "#444444",
    marginTop: 3,
    marginRight: 10,
  },
  listingStrike: { textDecorationLine: "line-through", color: "#9CA3AF" },
  listingActions: { flexDirection: "row", marginTop: 10 },

  // ORDER CARD
  orderCard: {
    borderWidth: 1,
    borderColor: "#E0E6E0",
    borderRadius: 10,
    padding: 13,
    marginTop: 10,
    backgroundColor: "#FAFCFA",
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#176B3A",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  orderLabel: { fontSize: 12, color: "#888888" },
  orderValue: { fontSize: 12, color: "#333333", fontWeight: "600" },
  amountText: { color: "#198754", fontSize: 14, fontWeight: "bold" },

  // PICKUP BOX
  pickupBox: {
    borderTopWidth: 1,
    borderTopColor: "#E0E6E0",
    marginTop: 10,
    paddingTop: 10,
  },
  pickupHeading: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 4,
  },
  pickupHint: { fontSize: 12, color: "#666666", marginBottom: 4 },

  // STATUS TEXTS
  completedText: {
    color: "#198754",
    fontWeight: "bold",
    marginTop: 10,
    fontSize: 13,
  },
  pendingText: {
    color: "#B45309",
    fontWeight: "600",
    marginTop: 10,
    fontSize: 13,
  },
  failedText: {
    color: "#C62828",
    fontWeight: "600",
    marginTop: 10,
    fontSize: 13,
  },

  // MISC
  discountText: {
    color: "#198754",
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 13,
  },
  description: {
    color: "#555555",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  dietRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dietButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#198754",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  selectedDietButton: { backgroundColor: "#198754" },
  dietText: { color: "#198754", fontWeight: "600", fontSize: 13 },
  selectedDietText: { color: "#FFFFFF" },
  emptyText: {
    textAlign: "center",
    color: "#666666",
    marginTop: 18,
    marginBottom: 6,
  },
  loader: { marginTop: 20 },
  bottomSpace: { height: 20 },
});
