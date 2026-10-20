import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { FontAwesome5 } from "@expo/vector-icons";
import api from "../api";

export default function CustomerHome() {
  const [activeTab, setActiveTab] = useState("explore");
  const [location, setLocation] = useState(null);
  const [bags, setBags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [currentRazorpayOrderId, setCurrentRazorpayOrderId] =
    useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);

  // Must match the phone number associated with the customer's orders.
  const customerPhone = "9876543210";

  // ==========================================
  // FETCH ACTIVE FOOD LISTINGS
  // ==========================================
  const fetchBags = useCallback(async () => {
    try {
      const response = await api.get("/api/bags/active");
      const data = response.data;

      console.log(
        "Food listings API response:",
        JSON.stringify(data, null, 2)
      );

      let fetchedBags = [];

      if (Array.isArray(data)) {
        fetchedBags = data;
      } else if (Array.isArray(data?.bags)) {
        fetchedBags = data.bags;
      } else if (Array.isArray(data?.data)) {
        fetchedBags = data.data;
      } else if (Array.isArray(data?.listings)) {
        fetchedBags = data.listings;
      } else if (Array.isArray(data?.results)) {
        fetchedBags = data.results;
      } else {
        console.error(
          "Unexpected food listings response format:",
          data
        );

        throw new Error(
          data?.message ||
            "The backend returned an unexpected response. Check GET /api/bags/active."
        );
      }

      fetchedBags = fetchedBags.filter(
        (bag) =>
          bag &&
          typeof bag === "object" &&
          bag._id
      );

      setBags(fetchedBags);

      console.log(
        `Successfully fetched ${fetchedBags.length} surprise bags.`
      );
    } catch (error) {
      console.error(
        "Error fetching bags:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Unable to Load Food",
        error.response?.data?.message ||
          error.message ||
          "Check that the Food2Go backend is running and the API URL is correct."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==========================================
  // FETCH CUSTOMER ORDERS
  // ==========================================
  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setOrdersRefreshing(true);
      } else {
        setOrdersLoading(true);
      }

      try {
        const response = await api.get(
          "/api/orders/my-orders",
          {
            params: { customerPhone },
          }
        );

        const data = response.data;

        if (
          !data?.success ||
          !Array.isArray(data.orders)
        ) {
          throw new Error(
            data?.message || "Unable to fetch orders."
          );
        }

        setOrders(data.orders);
      } catch (error) {
        console.error(
          "Error fetching customer orders:",
          error.response?.data || error.message
        );

        Alert.alert(
          "Unable to Load Orders",
          error.response?.data?.message ||
            error.message ||
            "Please check your backend connection."
        );
      } finally {
        setOrdersLoading(false);
        setOrdersRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  // ==========================================
  // GET CUSTOMER LOCATION
  // ==========================================
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status === "granted") {
          const currentLocation =
            await Location.getCurrentPositionAsync({});

          if (mounted) {
            setLocation({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
          }
        } else {
          console.log("Location permission not granted.");
        }
      } catch (error) {
        console.log("Location error:", error.message);
      }

      if (mounted) {
        await fetchBags();
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchBags]);

  // ==========================================
  // REFRESH LISTINGS
  // ==========================================
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBags();
  };

  // ==========================================
  // PREPARE MAP MARKERS
  // ==========================================
  const validBags = bags
    .map((bag) => {
      const business = bag.businessId;

      if (
        !business ||
        typeof business !== "object"
      ) {
        return null;
      }

      const latitude = Number(business.latitude);
      const longitude = Number(business.longitude);

      if (
        business.latitude == null ||
        business.longitude == null ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return null;
      }

      return {
        ...bag,
        latitude,
        longitude,
        storeName: business.storeName || "Food Store",
      };
    })
    .filter(Boolean);

  const mapLatitude = location?.latitude ?? 22.533;
  const mapLongitude = location?.longitude ?? 72.9;

  const markerData = validBags.map((bag) => ({
    id: String(bag._id),
    category: bag.category || "Food",
    storeName: bag.storeName,
    price: Number(bag.discountedPrice) || 0,
    latitude: bag.latitude,
    longitude: bag.longitude,
  }));

  // ==========================================
  // MAP HTML
  // ==========================================
  const mapHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport"
          content="width=device-width, initial-scale=1.0"/>

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

          .store-name {
            font-size: 15px;
            font-weight: bold;
          }

          .food-price {
            color: #10B981;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <script>
          const map = L.map("map").setView(
            [${mapLatitude}, ${mapLongitude}],
            14
          );

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution: "&copy; OpenStreetMap contributors"
            }
          ).addTo(map);

          const bags = ${JSON.stringify(markerData)};

          const escapeHTML = (value) =>
            String(value ?? "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");

          bags.forEach((bag) => {
            L.marker([bag.latitude, bag.longitude])
              .addTo(map)
              .bindPopup(
                '<div class="store-name">' +
                escapeHTML(bag.storeName) +
                '</div>' +
                '<div>' +
                escapeHTML(bag.category) +
                ' Surprise Bag</div>' +
                '<div class="food-price">₹' +
                Number(bag.price).toFixed(2) +
                '</div>'
              );
          });

          ${
            location
              ? `
                L.marker([
                  ${location.latitude},
                  ${location.longitude}
                ])
                .addTo(map)
                .bindPopup("Your current location");
              `
              : ""
          }

          if (bags.length > 0) {
            const points = bags.map((bag) => [
              bag.latitude,
              bag.longitude
            ]);

            ${
              location
                ? `points.push([
                    ${location.latitude},
                    ${location.longitude}
                  ]);`
                : ""
            }

            map.fitBounds(points, {
              padding: [30, 30],
              maxZoom: 15
            });
          }

          window.addEventListener("resize", () => {
            map.invalidateSize();
          });
        </script>
      </body>
    </html>
  `;

  // ==========================================
  // CREATE ORDER AND OPEN CHECKOUT
  // ==========================================
  const handlePurchase = async (bag) => {
    if (purchasingId || checkoutUrl) {
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Create a checkout order for ₹${bag.discountedPrice}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          onPress: async () => {
            setPurchasingId(bag._id);

            try {
              const response = await api.post(
                "/api/orders/create-transaction",
                {
                  amount: bag.discountedPrice,
                  bagId: bag._id,
                  customerPhone,
                }
              );

              const data = response.data;

              if (
                !data.success ||
                !data.razorpayOrder?.id
              ) {
                throw new Error(
                  data.message ||
                    "Unable to create checkout order."
                );
              }

              setCurrentRazorpayOrderId(
                data.razorpayOrder.id
              );

              await fetchBags();

              const baseURL =
                api.defaults.baseURL?.replace(/\/+$/, "");

              if (!baseURL) {
                throw new Error(
                  "API baseURL is missing from api.js."
                );
              }

              setCheckoutUrl(
                `${baseURL}/api/orders/checkout/${encodeURIComponent(
                  data.razorpayOrder.id
                )}`
              );
            } catch (error) {
              console.error(
                "Checkout error:",
                error.response?.data || error.message
              );

              Alert.alert(
                "Checkout Failed",
                error.response?.data?.message ||
                  error.message ||
                  "Unable to create checkout order."
              );

              setPurchasingId(null);
              setCurrentRazorpayOrderId(null);

              await fetchBags();
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // HANDLE PAYMENT MESSAGES
  // ==========================================
  const handleCheckoutMessage = async (event) => {
    let message;

    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      console.warn("Invalid checkout message received.");
      return;
    }

    if (
      message.type === "PAYMENT_CANCELLED" ||
      message.type === "PAYMENT_FAILED"
    ) {
      const orderId = currentRazorpayOrderId;

      setCheckoutUrl(null);
      setPurchasingId(null);
      setCurrentRazorpayOrderId(null);

      if (orderId) {
        try {
          const endpoint =
            message.type === "PAYMENT_CANCELLED"
              ? "/api/orders/cancel-order"
              : "/api/orders/payment-failed";

          await api.post(endpoint, {
            razorpayOrderId: orderId,
          });
        } catch (error) {
          console.error(
            "Could not release reserved stock:",
            error.response?.data || error.message
          );
        }
      }

      await fetchBags();

      Alert.alert(
        message.type === "PAYMENT_CANCELLED"
          ? "Payment Cancelled"
          : "Payment Failed",
        message.type === "PAYMENT_CANCELLED"
          ? "You cancelled the payment. Food listings have been refreshed."
          : message.message ||
              "Payment could not be completed."
      );

      return;
    }

    if (message.type !== "PAYMENT_SUCCESS") {
      return;
    }

    const payment = message.payment;

    if (
      !payment?.razorpay_order_id ||
      !payment?.razorpay_payment_id ||
      !payment?.razorpay_signature
    ) {
      Alert.alert(
        "Payment Verification Failed",
        "Required payment details are missing. Check My Orders before retrying."
      );
      return;
    }

    setVerifyingPayment(true);

    try {
      const response = await api.post(
        "/api/orders/verify-payment",
        {
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Payment verification failed."
        );
      }

      setCheckoutUrl(null);
      setPurchasingId(null);
      setCurrentRazorpayOrderId(null);

      await fetchBags();
      await fetchOrders();

      Alert.alert(
        "Payment Successful",
        "Your payment has been verified. Check My Orders for your purchase."
      );
    } catch (error) {
      console.error(
        "Payment verification error:",
        error.response?.data || error.message
      );

      setCheckoutUrl(null);
      setPurchasingId(null);

      Alert.alert(
        "Verification Pending",
        error.response?.data?.message ||
          "Payment could not be verified. Check your order status before trying again."
      );
    } finally {
      setVerifyingPayment(false);
    }
  };

  // ==========================================
  // CLOSE CHECKOUT AND RELEASE STOCK
  // ==========================================
  const closeCheckoutAndReleaseStock = async () => {
    if (verifyingPayment) {
      return;
    }

    const orderId = currentRazorpayOrderId;

    setCheckoutUrl(null);
    setPurchasingId(null);
    setCurrentRazorpayOrderId(null);

    if (orderId) {
      try {
        await api.post("/api/orders/cancel-order", {
          razorpayOrderId: orderId,
        });
      } catch (error) {
        console.error(
          "Checkout close / stock release error:",
          error.response?.data || error.message
        );
      }
    }

    await fetchBags();
  };

  // ==========================================
  // RENDER FOOD LISTING
  // ==========================================
  const renderBag = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <FontAwesome5
          name="shopping-bag"
          size={35}
          color="#10B981"
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.title}>
          {item.category || "Food"} Surprise Bag
        </Text>

        <Text style={styles.price}>
          ₹{Number(item.discountedPrice || 0).toFixed(2)}{" "}
          <Text style={styles.strike}>
            ₹{Number(item.originalPrice || 0).toFixed(2)}
          </Text>
        </Text>

        <Text style={styles.storeText}>
          {item.businessId?.storeName || "Food Store"}
        </Text>

        <Text style={styles.timerText}>
          Pickup ends: {item.pickupEndTime || "Not specified"}
        </Text>

        <Text style={styles.quantityText}>
          Available: {item.quantityAvailable ?? 0}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.buyBtn,
          purchasingId !== null && styles.disabledButton,
        ]}
        disabled={purchasingId !== null}
        onPress={() => handlePurchase(item)}
      >
        {purchasingId === item._id ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buyBtnText}>Buy Now</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // RENDER CUSTOMER ORDER
  // ==========================================
  const renderOrder = ({ item }) => {
    const bag =
      item.bagId && typeof item.bagId === "object"
        ? item.bagId
        : null;

    const status = item.status || "pending";

    const statusColor =
      status === "paid"
        ? "#059669"
        : status === "completed"
        ? "#2563EB"
        : status === "failed"
        ? "#DC2626"
        : "#D97706";

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderIcon}>
          <FontAwesome5
            name="shopping-bag"
            size={26}
            color="#10B981"
          />
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.orderTitle}>
            {bag
              ? `${bag.category || "Food"} Surprise Bag`
              : "Food Order"}
          </Text>

          <Text style={styles.orderText}>
            Order ID: {String(item._id).slice(-8)}
          </Text>

          {bag?.businessId?.storeName && (
            <Text style={styles.orderText}>
              Store: {bag.businessId.storeName}
            </Text>
          )}

          {bag?.discountedPrice != null && (
            <Text style={styles.orderPrice}>
              ₹{Number(bag.discountedPrice).toFixed(2)}
            </Text>
          )}

          <Text style={styles.orderText}>
            Payment ID: {item.razorpayPaymentId || "Not available"}
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor },
            ]}
          >
            <Text style={styles.statusText}>
              {status.toUpperCase()}
            </Text>
          </View>

          {item.pickupOTP && (
            <Text style={styles.otpText}>
              Pickup OTP: {item.pickupOTP}
            </Text>
          )}

          <Text style={styles.orderDate}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  // ==========================================
  // MAIN SCREEN
  // ==========================================
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[
            styles.navTab,
            activeTab === "explore" && styles.activeNav,
          ]}
          onPress={() => setActiveTab("explore")}
        >
          <Text
            style={
              activeTab === "explore"
                ? styles.activeNavText
                : styles.navText
            }
          >
            Explore Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navTab,
            activeTab === "orders" && styles.activeNav,
          ]}
          onPress={() => setActiveTab("orders")}
        >
          <Text
            style={
              activeTab === "orders"
                ? styles.activeNavText
                : styles.navText
            }
          >
            My Orders
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "explore" ? (
        <>
          <View style={styles.map}>
            <WebView
              originWhitelist={["*"]}
              source={{ html: mapHTML }}
              javaScriptEnabled
              domStorageEnabled
              style={styles.webView}
              onError={(event) => {
                console.error(
                  "Map WebView error:",
                  event.nativeEvent.description
                );
              }}
            />
          </View>

          <View style={styles.listContainer}>
            <View style={styles.headingRow}>
              <Text style={styles.header}>
                Nearby Surprise Bags
              </Text>

              <TouchableOpacity
                onPress={onRefresh}
                disabled={refreshing}
              >
                <FontAwesome5
                  name="sync-alt"
                  size={19}
                  color="#10B981"
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#10B981"
                style={styles.loader}
              />
            ) : bags.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5
                  name="utensils"
                  size={35}
                  color="#9CA3AF"
                />

                <Text style={styles.emptyTitle}>
                  No Surprise Bags Available
                </Text>

                <Text style={styles.emptyText}>
                  Check back later for new food listings.
                </Text>

                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={onRefresh}
                  disabled={refreshing}
                >
                  <Text style={styles.buyBtnText}>
                    Refresh Listings
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={bags}
                keyExtractor={(item) => String(item._id)}
                renderItem={renderBag}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#10B981"]}
                  />
                }
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </>
      ) : (
        <View style={styles.listContainer}>
          <View style={styles.headingRow}>
            <Text style={styles.header}>My Orders</Text>

            <TouchableOpacity
              onPress={() => fetchOrders(true)}
              disabled={ordersRefreshing}
            >
              <FontAwesome5
                name="sync-alt"
                size={19}
                color="#10B981"
              />
            </TouchableOpacity>
          </View>

          {ordersLoading ? (
            <ActivityIndicator
              size="large"
              color="#10B981"
              style={styles.loader}
            />
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5
                name="receipt"
                size={35}
                color="#9CA3AF"
              />

              <Text style={styles.emptyTitle}>
                No Orders Yet
              </Text>

              <Text style={styles.emptyText}>
                Your purchased food bags will appear here.
              </Text>

              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => setActiveTab("explore")}
              >
                <Text style={styles.buyBtnText}>
                  Explore Food
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => String(item._id)}
              renderItem={renderOrder}
              refreshControl={
                <RefreshControl
                  refreshing={ordersRefreshing}
                  onRefresh={() => fetchOrders(true)}
                  colors={["#10B981"]}
                />
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      <Modal
        visible={Boolean(checkoutUrl)}
        animationType="slide"
        onRequestClose={closeCheckoutAndReleaseStock}
      >
        <View style={styles.checkoutContainer}>
          <View style={styles.checkoutHeader}>
            <Text style={styles.checkoutTitle}>
              Food2Go Payment
            </Text>

            <TouchableOpacity
              disabled={verifyingPayment}
              onPress={closeCheckoutAndReleaseStock}
            >
              <Text style={styles.closeCheckout}>Close</Text>
            </TouchableOpacity>
          </View>

          {verifyingPayment ? (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator
                size="large"
                color="#10B981"
              />

              <Text style={styles.verifyingText}>
                Verifying your payment...
              </Text>
            </View>
          ) : checkoutUrl ? (
            <WebView
              source={{ uri: checkoutUrl }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              onMessage={handleCheckoutMessage}
              onError={(event) => {
                console.error(
                  "Checkout WebView error:",
                  event.nativeEvent.description
                );

                Alert.alert(
                  "Checkout Error",
                  "Unable to load checkout. Check your internet connection and backend URL."
                );
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.verifyingContainer}>
                  <ActivityIndicator
                    size="large"
                    color="#10B981"
                  />

                  <Text style={styles.verifyingText}>
                    Loading checkout...
                  </Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// STYLES — DECLARED ONLY ONCE
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  navBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
    elevation: 2,
  },

  navTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },

  activeNav: {
    borderBottomWidth: 3,
    borderBottomColor: "#10B981",
  },

  navText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },

  activeNavText: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "bold",
  },

  map: {
    height: "35%",
    width: "100%",
    backgroundColor: "#E5E7EB",
  },

  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },

  listContainer: {
    flex: 1,
    padding: 15,
  },

  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1F2937",
  },

  loader: {
    marginTop: 30,
  },

  listContent: {
    paddingBottom: 20,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
  },

  iconContainer: {
    marginRight: 12,
  },

  details: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },

  price: {
    fontSize: 16,
    color: "#10B981",
    marginVertical: 4,
    fontWeight: "bold",
  },

  strike: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "normal",
  },

  storeText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 3,
  },

  timerText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "bold",
  },

  quantityText: {
    fontSize: 12,
    color: "#059669",
    marginTop: 4,
    fontWeight: "600",
  },

  buyBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buyBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 12,
  },

  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 21,
  },

  orderCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },

  orderIcon: {
    width: 45,
    alignItems: "center",
    paddingTop: 5,
    marginRight: 10,
  },

  orderDetails: {
    flex: 1,
  },

  orderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 6,
  },

  orderText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  orderPrice: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#10B981",
    marginTop: 5,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },

  otpText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#059669",
    marginTop: 8,
  },

  orderDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
  },

  checkoutContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 35,
  },

  checkoutHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  checkoutTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1F2937",
  },

  closeCheckout: {
    color: "#10B981",
    fontWeight: "bold",
    padding: 8,
  },

  verifyingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  verifyingText: {
    marginTop: 12,
    color: "#374151",
    textAlign: "center",
  },
});