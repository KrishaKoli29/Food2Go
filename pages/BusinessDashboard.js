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

export default function BusinessDashboard({ onLogout }) {
  const [storeName, setStoreName] = useState("");
  const [latitude, setLatitude] = useState("22.5645");
  const [longitude, setLongitude] = useState("72.9289");
  const [businessId, setBusinessId] = useState(null);

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

  // RESTORE BUSINESS DETAILS
  useEffect(() => {
    let active = true;

    const restoreBusiness = async () => {
      try {
        const savedId = await AsyncStorage.getItem(BUSINESS_ID_KEY);
        const savedName = await AsyncStorage.getItem(BUSINESS_NAME_KEY);

        if (active && savedId) {
          setBusinessId(savedId);

          if (savedName) {
            setStoreName(savedName);
          }
        }
      } catch (error) {
        console.error("Restore business error:", error.message);
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    restoreBusiness();

    return () => {
      active = false;
    };
  }, []);

  // MAP HTML
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <style>
          html, body, #map {
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
          const initialLat = ${Number(latitude) || 22.5645};
          const initialLng = ${Number(longitude) || 72.9289};

          const map = L.map("map").setView(
            [initialLat, initialLng],
            15
          );

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "&copy; OpenStreetMap contributors"
            }
          ).addTo(map);

          const marker = L.marker(
            [initialLat, initialLng],
            { draggable: true }
          ).addTo(map);

          function sendLocation(lat, lng) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                latitude: lat,
                longitude: lng
              })
            );
          }

          marker.on("dragend", function() {
            const position = marker.getLatLng();
            sendLocation(position.lat, position.lng);
          });

          map.on("click", function(event) {
            marker.setLatLng([
              event.latlng.lat,
              event.latlng.lng
            ]);

            sendLocation(
              event.latlng.lat,
              event.latlng.lng
            );
          });
        </script>
      </body>
    </html>
  `;

  // REGISTER STORE
  const saveStore = async () => {
    if (!storeName.trim()) {
      Alert.alert("Required", "Enter your store name.");
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      Alert.alert("Invalid location", "Select a valid location.");
      return;
    }

    try {
      setSavingStore(true);

      const response = await api.post("/api/business/onboard", {
        storeName: storeName.trim(),
        latitude: lat,
        longitude: lng,
      });

      const business = response.data.business;

      const savedId =
        business?._id ||
        response.data.businessId ||
        response.data._id;

      if (!savedId) {
        Alert.alert(
          "Registration error",
          "The server did not return a business ID."
        );
        return;
      }

      await AsyncStorage.setItem(
        BUSINESS_ID_KEY,
        String(savedId)
      );

      await AsyncStorage.setItem(
        BUSINESS_NAME_KEY,
        storeName.trim()
      );

      setBusinessId(String(savedId));

      Alert.alert(
        "Success",
        "Your store has been registered successfully."
      );
    } catch (error) {
      console.error(
        "Store registration error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Registration failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to register your store."
      );
    } finally {
      setSavingStore(false);
    }
  };

  // FETCH BUSINESS LISTINGS
  const fetchBusinessBags = useCallback(
    async (showError = true) => {
      if (!businessId) {
        setBusinessBags([]);
        return;
      }

      try {
        setLoadingBags(true);

        const response = await api.get(
          `/api/bags/business/${encodeURIComponent(businessId)}`
        );

        const receivedBags = Array.isArray(response.data)
          ? response.data
          : response.data.bags || [];

        setBusinessBags(receivedBags);
      } catch (error) {
        console.error(
          "FETCH BUSINESS LISTINGS ERROR:",
          error.response?.data || error.message
        );

        if (showError) {
          Alert.alert(
            "Unable to load listings",
            error.response?.data?.message ||
              error.response?.data?.error ||
              "Unable to fetch your food listings."
          );
        }
      } finally {
        setLoadingBags(false);
      }
    },
    [businessId]
  );

  // FETCH BUSINESS DONATION HISTORY
  const fetchDonations = useCallback(async (showError = true) => {
    if (!businessId) {
      setDonations([]);
      return;
    }
    try {
      setLoadingDonations(true);
      const response = await api.get(`/api/donations/business/${encodeURIComponent(businessId)}`);
      setDonations(Array.isArray(response.data.donations) ? response.data.donations : []);
    } catch (error) {
      console.error("FETCH DONATIONS ERROR:", error.response?.data || error.message);
      if (showError) Alert.alert("Unable to load donations", error.response?.data?.message || "Please try again.");
    } finally {
      setLoadingDonations(false);
    }
  }, [businessId]);

  // PUBLISH A FREE FOOD DONATION
  const publishDonation = async () => {
    if (!businessId) {
      Alert.alert("Register your store", "Register your store before donating food.");
      return;
    }
    if (!donationCategory.trim() || !donationQuantity.trim()) {
      Alert.alert("Missing details", "Enter the food category and quantity.");
      return;
    }
    const quantity = Number(donationQuantity);
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert("Invalid quantity", "Enter a whole number greater than zero.");
      return;
    }
    if (!timePattern.test(donationStartTime) || !timePattern.test(donationEndTime)) {
      Alert.alert("Invalid pickup time", "Use 24-hour format, for example 18:00.");
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
      Alert.alert("Donation published", "NGOs can now view and accept your free food donation.");
    } catch (error) {
      console.error("PUBLISH DONATION ERROR:", error.response?.data || error.message);
      Alert.alert("Donation failed", error.response?.data?.message || "Unable to publish donation.");
    } finally {
      setPublishingDonation(false);
    }
  };

  const cancelDonation = (donation) => {
    Alert.alert("Cancel donation", "Cancel this donation? It can only be cancelled before an NGO accepts it.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel donation", style: "destructive", onPress: async () => {
        try {
          setCancellingDonationId(donation._id);
          await api.patch(`/api/donations/${donation._id}/cancel`, { businessId });
          await fetchDonations(false);
          Alert.alert("Cancelled", "Your donation has been cancelled.");
        } catch (error) {
          Alert.alert("Unable to cancel", error.response?.data?.message || "Only available donations can be cancelled.");
        } finally {
          setCancellingDonationId(null);
        }
      } },
    ]);
  };

  // START EDITING LISTING
  const startEditingListing = (bag) => {
    setEditingBagId(bag._id);

    setCategory(String(bag.category || ""));
    setDietType(bag.dietType || "Veg");
    setOriginalPrice(String(bag.originalPrice ?? ""));
    setDiscountedPrice(String(bag.discountedPrice ?? ""));
    setQuantityAvailable(String(bag.quantityAvailable ?? ""));
    setPickupStartTime(String(bag.pickupStartTime || "18:00"));
    setPickupEndTime(String(bag.pickupEndTime || "21:00"));

    Alert.alert(
      "Edit listing",
      "The listing details are loaded into the form. Make your changes and press Save Changes."
    );
  };

  // CANCEL EDITING
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

  // CREATE OR UPDATE LISTING
  const publishBag = async () => {
    if (!businessId) {
      Alert.alert(
        "Store not registered",
        "Register your store before publishing food."
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
        "Discounted price must be positive and lower than the original price."
      );
      return;
    }

    const discount =
      ((original - discounted) / original) * 100;

    if (discount < 30) {
      Alert.alert(
        "Discount too low",
        "Food2Go requires at least a 30% discount."
      );
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert(
        "Invalid quantity",
        "Enter a whole number greater than zero."
      );
      return;
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      !timePattern.test(pickupStartTime) ||
      !timePattern.test(pickupEndTime)
    ) {
      Alert.alert(
        "Invalid pickup time",
        "Use 24-hour format, such as 18:00."
      );
      return;
    }

    const isEditing = Boolean(editingBagId);

    try {
      setPublishingBag(true);

      const listingPayload = {
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
        // UPDATE EXISTING LISTING
        response = await api.put(
          `/api/bags/${editingBagId}`,
          listingPayload
        );
      } else {
        // CREATE NEW LISTING
        response = await api.post(
          "/api/bags/create",
          listingPayload
        );
      }

      console.log(
        isEditing ? "LISTING UPDATED:" : "LISTING CREATED:",
        response.data
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
          : "Food listing published successfully."
      );
    } catch (error) {
      console.error(
        "Save food listing error:",
        error.response?.data || error.message
      );

      // FIXED: No undefined isEditingErrorMessage function.
      Alert.alert(
        isEditing ? "Update failed" : "Publishing failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to save the food listing."
      );
    } finally {
      setPublishingBag(false);
    }
  };

  // DELETE LISTING
  const deleteListing = (bag) => {
    if (deletingBagId) {
      return;
    }

    Alert.alert(
      "Delete Food Listing",
      `Are you sure you want to delete "${bag.category || "this listing"}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingBagId(bag._id);

              const response = await api.delete(
                `/api/bags/${bag._id}`,
                {
                  data: { businessId },
                }
              );

              setBusinessBags((previous) =>
                previous.filter((item) => item._id !== bag._id)
              );

              if (editingBagId === bag._id) {
                cancelEditingListing();
              }

              Alert.alert(
                "Success",
                response.data?.message ||
                  "Food listing deleted successfully."
              );

              await fetchBusinessBags(false);
            } catch (error) {
              console.error(
                "DELETE LISTING ERROR:",
                error.response?.data || error.message
              );

              Alert.alert(
                "Delete failed",
                error.response?.data?.message ||
                  error.response?.data?.error ||
                  "Unable to delete this listing."
              );
            } finally {
              setDeletingBagId(null);
            }
          },
        },
      ]
    );
  };

  // FETCH BUSINESS ORDERS
  const fetchBusinessOrders = useCallback(async () => {
    if (!businessId) {
      return;
    }

    try {
      setLoadingOrders(true);

      const response = await api.get(
        "/api/orders/business-orders",
        {
          params: { businessId },
        }
      );

      const receivedOrders = Array.isArray(response.data)
        ? response.data
        : response.data.orders || [];

      setOrders(receivedOrders);
    } catch (error) {
      console.error(
        "FETCH BUSINESS ORDERS ERROR:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Unable to load orders",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Check your backend server and business ID."
      );
    } finally {
      setLoadingOrders(false);
    }
  }, [businessId]);

  // LOAD INITIAL DATA
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

  // HANDLE MAP LOCATION
  const handleMapMessage = (event) => {
    try {
      const location = JSON.parse(event.nativeEvent.data);

      setLatitude(String(location.latitude));
      setLongitude(String(location.longitude));
    } catch (error) {
      console.error("Map location error:", error.message);
    }
  };

  // VERIFY CUSTOMER PICKUP OTP
  const verifyPickup = async (order) => {
    const orderId = order._id;
    const enteredOTP = (otpInputs[orderId] || "").trim();

    if (!/^\d{6}$/.test(enteredOTP)) {
      Alert.alert(
        "Invalid OTP",
        "Enter the customer's six-digit pickup OTP."
      );
      return;
    }

    try {
      setVerifyingOrderId(orderId);

      const response = await api.post(
        "/api/orders/verify-pickup",
        {
          businessId,
          orderId,
          pickupOTP: enteredOTP,
        }
      );

      Alert.alert(
        "Pickup verified",
        response.data.message ||
          "Order completed successfully."
      );

      setOtpInputs((previous) => ({
        ...previous,
        [orderId]: "",
      }));

      await fetchBusinessOrders();
    } catch (error) {
      console.error(
        "OTP verification error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Verification failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to verify pickup OTP."
      );
    } finally {
      setVerifyingOrderId(null);
    }
  };

  // RENDER CUSTOMER ORDER
  const renderOrder = (order) => {
    const bag =
      order.bagId && typeof order.bagId === "object"
        ? order.bagId
        : null;

    const status = String(order.status || "pending").toLowerCase();

    return (
      <View key={order._id} style={styles.orderCard}>
        <Text style={styles.orderTitle}>
          {bag?.category || "Food bag"}
        </Text>

        <Text style={styles.orderText}>
          Order ID: {String(order._id).slice(-8)}
        </Text>

        <Text style={styles.orderText}>
          Customer: {order.customerPhone || "Not available"}
        </Text>

        {bag?.discountedPrice != null && (
          <Text style={styles.orderText}>
            Amount: ₹{bag.discountedPrice}
          </Text>
        )}

        <Text style={styles.orderText}>
          Status: {status.toUpperCase()}
        </Text>

        {status === "paid" && (
          <View style={styles.pickupBox}>
            <Text style={styles.pickupHeading}>
              Verify Customer Pickup
            </Text>

            <Text style={styles.orderText}>
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
                const digits = value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setOtpInputs((previous) => ({
                  ...previous,
                  [order._id]: digits,
                }));
              }}
            />

            <TouchableOpacity
              style={[
                styles.verifyButton,
                verifyingOrderId === order._id &&
                  styles.disabledButton,
              ]}
              disabled={verifyingOrderId === order._id}
              onPress={() => verifyPickup(order)}
            >
              {verifyingOrderId === order._id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  Verify Pickup OTP
                </Text>
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
          <Text style={styles.pendingText}>
            Payment is pending.
          </Text>
        )}

        {status === "failed" && (
          <Text style={styles.failedText}>
            Payment failed or order cancelled.
          </Text>
        )}
      </View>
    );
  };

  // LOADING SCREEN
  if (initializing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#198754" />
        <Text style={styles.loadingText}>
          Loading your business...
        </Text>
      </View>
    );
  }

  // MAIN DASHBOARD
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>
        Food2Go Business Dashboard
      </Text>

      {/* STORE INFORMATION */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Store Information
        </Text>

        <Text style={styles.label}>Store Name</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your store name"
          placeholderTextColor="#777"
          value={storeName}
          onChangeText={setStoreName}
          editable={!businessId}
        />

        <Text style={styles.label}>
          Choose Store Location
        </Text>

        <View style={styles.mapContainer}>
          <WebView
            key={`${latitude}-${longitude}`}
            source={{ html: mapHtml }}
            onMessage={handleMapMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            style={styles.map}
          />
        </View>

        <Text style={styles.coordinates}>
          Latitude: {Number(latitude).toFixed(6)}
        </Text>

        <Text style={styles.coordinates}>
          Longitude: {Number(longitude).toFixed(6)}
        </Text>

        {!businessId ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              savingStore && styles.disabledButton,
            ]}
            onPress={saveStore}
            disabled={savingStore}
          >
            {savingStore ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Register Store
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.successText}>
              ✓ Store registered successfully
            </Text>

            <Text style={styles.smallText}>
              Business ID: {businessId}
            </Text>
          </View>
        )}
      </View>

      {/* PUBLISH OR EDIT FOOD */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {editingBagId
            ? "Edit Food Listing"
            : "Publish Surplus Food"}
        </Text>

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

        <Text style={styles.label}>Original Price (₹)</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter original price"
          placeholderTextColor="#777"
          keyboardType="decimal-pad"
          value={originalPrice}
          onChangeText={setOriginalPrice}
        />

        <Text style={styles.label}>Discounted Price (₹)</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter discounted price"
          placeholderTextColor="#777"
          keyboardType="decimal-pad"
          value={discountedPrice}
          onChangeText={setDiscountedPrice}
        />

        <Text style={styles.label}>Available Quantity</Text>

        <TextInput
          style={styles.input}
          placeholder="Number of bags"
          placeholderTextColor="#777"
          keyboardType="number-pad"
          value={quantityAvailable}
          onChangeText={setQuantityAvailable}
        />

        <Text style={styles.label}>
          Pickup Start Time (24-hour format)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="18:00"
          placeholderTextColor="#777"
          value={pickupStartTime}
          onChangeText={setPickupStartTime}
          maxLength={5}
        />

        <Text style={styles.label}>
          Pickup End Time (24-hour format)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="21:00"
          placeholderTextColor="#777"
          value={pickupEndTime}
          onChangeText={setPickupEndTime}
          maxLength={5}
        />

        {originalPrice &&
          discountedPrice &&
          Number(originalPrice) > 0 && (
            <Text style={styles.discountText}>
              Discount:{" "}
              {(
                ((Number(originalPrice) -
                  Number(discountedPrice)) /
                  Number(originalPrice)) *
                100
              ).toFixed(1)}
              %
            </Text>
          )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!businessId || publishingBag) &&
              styles.disabledButton,
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
            <Text style={styles.cancelEditButtonText}>
              Cancel Edit
            </Text>
          </TouchableOpacity>
        )}

        {!businessId && (
          <Text style={styles.warningText}>
            Register your store before publishing food.
          </Text>
        )}
      </View>

      {/* DONATE FOOD TO NGOs */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Donate Food to Charity 💚</Text>
        <Text style={styles.description}>Offer surplus food for free to registered NGOs and charitable organizations. No payment is collected for donations.</Text>
        <Text style={styles.label}>Food Category</Text>
        <TextInput style={styles.input} placeholder="e.g. Fresh meals, bakery, fruits" placeholderTextColor="#777" value={donationCategory} onChangeText={setDonationCategory} />
        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.dietRow}>
          {["Veg", "Non-Veg", "Mixed"].map((type) => (
            <TouchableOpacity key={type} style={[styles.dietButton, donationDietType === type && styles.selectedDietButton]} onPress={() => setDonationDietType(type)}>
              <Text style={[styles.dietText, donationDietType === type && styles.selectedDietText]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Quantity (meals / packs)</Text>
        <TextInput style={styles.input} placeholder="Enter quantity" placeholderTextColor="#777" keyboardType="number-pad" value={donationQuantity} onChangeText={setDonationQuantity} />
        <Text style={styles.label}>Pickup Start Time (24-hour format)</Text>
        <TextInput style={styles.input} placeholder="18:00" placeholderTextColor="#777" value={donationStartTime} onChangeText={setDonationStartTime} maxLength={5} />
        <Text style={styles.label}>Pickup End Time (24-hour format)</Text>
        <TextInput style={styles.input} placeholder="21:00" placeholderTextColor="#777" value={donationEndTime} onChangeText={setDonationEndTime} maxLength={5} />
        <Text style={styles.label}>Additional Notes (optional)</Text>
        <TextInput style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]} placeholder="Allergens, packing details, storage instructions..." placeholderTextColor="#777" value={donationNotes} onChangeText={setDonationNotes} multiline />
        <TouchableOpacity style={[styles.primaryButton, (!businessId || publishingDonation) && styles.disabledButton]} onPress={publishDonation} disabled={!businessId || publishingDonation}>
          {publishingDonation ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Publish Free Donation</Text>}
        </TouchableOpacity>
        {!businessId && <Text style={styles.warningText}>Register your store before publishing a donation.</Text>}
      </View>

      {/* DONATION HISTORY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Donation History</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => fetchDonations()} disabled={loadingDonations}>
          {loadingDonations ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Refresh Donations</Text>}
        </TouchableOpacity>
        {loadingDonations && donations.length === 0 ? <ActivityIndicator style={styles.loader} color="#198754" /> : donations.length === 0 ? (
          <Text style={styles.emptyText}>You have not published any donations yet.</Text>
        ) : donations.map((donation) => (
          <View key={donation._id} style={styles.listingCard}>
            <Text style={styles.orderTitle}>{donation.category}</Text>
            <Text style={styles.orderText}>Quantity: {donation.quantity}</Text>
            <Text style={styles.orderText}>Diet: {donation.dietType}</Text>
            <Text style={styles.orderText}>Pickup: {donation.pickupStartTime} - {donation.pickupEndTime}</Text>
            <Text style={styles.orderText}>Recipient: {donation.ngoName || "Waiting for an NGO"}</Text>
            {donation.ngoContact ? <Text style={styles.orderText}>NGO Contact: {donation.ngoContact}</Text> : null}
            {donation.notes ? <Text style={styles.orderText}>Notes: {donation.notes}</Text> : null}
            <Text style={[styles.listingStatus, ["Cancelled", "Completed"].includes(donation.status) && styles.inactiveListingStatus]}>Status: {donation.status}</Text>
            {donation.status === "Available" && <TouchableOpacity style={styles.deleteButton} disabled={cancellingDonationId === donation._id} onPress={() => cancelDonation(donation)}>{cancellingDonationId === donation._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonText}>Cancel Donation</Text>}</TouchableOpacity>}
          </View>
        ))}
      </View>

      {/* MY FOOD LISTINGS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          My Food Listings
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!businessId || loadingBags) &&
              styles.disabledButton,
          ]}
          onPress={() => fetchBusinessBags()}
          disabled={!businessId || loadingBags}
        >
          {loadingBags ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Refresh Listings
            </Text>
          )}
        </TouchableOpacity>

        {!businessId ? (
          <Text style={styles.warningText}>
            Register your store to manage listings.
          </Text>
        ) : loadingBags && businessBags.length === 0 ? (
          <ActivityIndicator
            size="large"
            color="#198754"
            style={styles.loader}
          />
        ) : businessBags.length === 0 ? (
          <Text style={styles.emptyText}>
            No food listings yet. Publish surplus food above.
          </Text>
        ) : (
          businessBags.map((bag) => (
            <View key={bag._id} style={styles.listingCard}>
              <Text style={styles.orderTitle}>
                {bag.category || "Food listing"}
              </Text>

              <Text style={styles.orderText}>
                Diet type: {bag.dietType || "Not specified"}
              </Text>

              <Text style={styles.orderText}>
                Original price: ₹
                {Number(bag.originalPrice || 0).toFixed(2)}
              </Text>

              <Text style={styles.orderText}>
                Discounted price: ₹
                {Number(bag.discountedPrice || 0).toFixed(2)}
              </Text>

              <Text style={styles.orderText}>
                Available quantity: {bag.quantityAvailable ?? 0}
              </Text>

              <Text style={styles.orderText}>
                Pickup: {bag.pickupStartTime || "--:--"} –{" "}
                {bag.pickupEndTime || "--:--"}
              </Text>

              <Text
                style={[
                  styles.listingStatus,
                  String(bag.status || "Active").toLowerCase() !==
                    "active" && styles.inactiveListingStatus,
                ]}
              >
                Status: {String(bag.status || "Active").toUpperCase()}
              </Text>

              {String(bag.status || "Active").toLowerCase() ===
                "active" && (
                <>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => startEditingListing(bag)}
                    disabled={
                      publishingBag || deletingBagId !== null
                    }
                  >
                    <Text style={styles.editButtonText}>
                      Edit Listing
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deleteButton,
                      deletingBagId === bag._id &&
                        styles.disabledButton,
                    ]}
                    onPress={() => deleteListing(bag)}
                    disabled={deletingBagId !== null}
                  >
                    {deletingBagId === bag._id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.deleteButtonText}>
                        Delete Listing
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))
        )}
      </View>

      {/* CUSTOMER ORDERS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Customer Orders
        </Text>

        <Text style={styles.description}>
          View customer orders, check payment status, and verify pickup OTPs.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!businessId || loadingOrders) &&
              styles.disabledButton,
          ]}
          onPress={fetchBusinessOrders}
          disabled={!businessId || loadingOrders}
        >
          {loadingOrders ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Refresh Orders
            </Text>
          )}
        </TouchableOpacity>

        {!businessId ? (
          <Text style={styles.warningText}>
            No saved business ID was found. Register your store or restore the correct business ID.
          </Text>
        ) : loadingOrders && orders.length === 0 ? (
          <ActivityIndicator
            size="large"
            color="#198754"
            style={styles.loader}
          />
        ) : orders.length === 0 ? (
          <Text style={styles.emptyText}>
            No orders found for this business.
          </Text>
        ) : (
          orders.map(renderOrder)
        )}
      </View>

      {/* LOGOUT */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          if (onLogout) {
            onLogout();
          } else {
            Alert.alert(
              "Logout",
              "Logout handler is not configured."
            );
          }
        }}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  contentContainer: {
    padding: 16,
  },
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
  heading: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#176B3A",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    marginBottom: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#176B3A",
    marginBottom: 14,
  },
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
    height: 260,
    overflow: "hidden",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6DDD6",
    marginTop: 5,
  },
  map: {
    flex: 1,
  },
  coordinates: {
    fontSize: 12,
    color: "#555555",
    marginTop: 7,
  },
  primaryButton: {
    backgroundColor: "#198754",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  successText: {
    color: "#198754",
    fontWeight: "bold",
    marginTop: 12,
  },
  smallText: {
    fontSize: 11,
    color: "#666666",
    marginTop: 6,
  },
  warningText: {
    color: "#B45309",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
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
    paddingVertical: 11,
    alignItems: "center",
    marginHorizontal: 3,
  },
  selectedDietButton: {
    backgroundColor: "#198754",
  },
  dietText: {
    color: "#198754",
    fontWeight: "600",
  },
  selectedDietText: {
    color: "#FFFFFF",
  },
  discountText: {
    color: "#198754",
    fontWeight: "bold",
    marginTop: 12,
    fontSize: 15,
  },
  description: {
    color: "#555555",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  listingCard: {
    borderWidth: 1,
    borderColor: "#DCE8DC",
    borderRadius: 10,
    padding: 13,
    marginTop: 14,
    backgroundColor: "#F8FCF8",
  },
  listingStatus: {
    color: "#198754",
    fontWeight: "bold",
    fontSize: 13,
    marginTop: 9,
  },
  inactiveListingStatus: {
    color: "#777777",
  },
  editButton: {
    backgroundColor: "#176B3A",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  cancelEditButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
  },
  cancelEditButtonText: {
    color: "#374151",
    fontWeight: "bold",
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "#C62828",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: "#E0E6E0",
    borderRadius: 10,
    padding: 13,
    marginTop: 14,
    backgroundColor: "#FAFCFA",
  },
  orderTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#176B3A",
    marginBottom: 8,
  },
  orderText: {
    fontSize: 13,
    color: "#444444",
    marginTop: 5,
  },
  pickupBox: {
    borderTopWidth: 1,
    borderTopColor: "#E0E6E0",
    marginTop: 12,
    paddingTop: 12,
  },
  pickupHeading: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 5,
  },
  verifyButton: {
    backgroundColor: "#176B3A",
    borderRadius: 8,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 10,
  },
  completedText: {
    color: "#198754",
    fontWeight: "bold",
    marginTop: 12,
  },
  pendingText: {
    color: "#B45309",
    fontWeight: "600",
    marginTop: 12,
  },
  failedText: {
    color: "#C62828",
    fontWeight: "600",
    marginTop: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#666666",
    marginTop: 20,
    marginBottom: 8,
  },
  loader: {
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: "#C62828",
    padding: 14,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 2,
  },
  bottomSpace: {
    height: 20,
  },
});