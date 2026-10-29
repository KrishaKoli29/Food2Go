const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Order = require("../models/Order");
const SurpriseBag = require("../models/SurpriseBag");
const Business = require("../models/Business");

if (
  !process.env.RAZORPAY_KEY_ID ||
  !process.env.RAZORPAY_KEY_SECRET
) {
  throw new Error("Razorpay credentials are missing from .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Generate a six-digit pickup OTP.
function generatePickupOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

// Restore reserved stock exactly once.
async function releaseStock(orderId, finalStatus = "failed") {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: "pending",
      stockReserved: true,
      stockReleased: false,
    },
    {
      $set: {
        status: finalStatus,
        stockReserved: false,
        stockReleased: true,
      },
    },
    { new: true }
  );

  if (!order) return false;

  const bag = await SurpriseBag.findOneAndUpdate(
    { _id: order.bagId },
    {
      $inc: { quantityAvailable: 1 },
      $set: { status: "Active" },
    },
    { new: true }
  );

  if (!bag) {
    console.error(
      `Cannot restore stock for order ${order._id}`
    );
  }

  return true;
}

// 1. CREATE PAYMENT ORDER AND RESERVE STOCK
router.post("/create-transaction", async (req, res) => {
  let reservedBagId = null;
  let createdOrderId = null;

  try {
    const { bagId, customerPhone } = req.body;

    if (!bagId || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Bag ID and customer phone are required.",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(String(bagId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid bag ID.",
      });
    }

    const bag = await SurpriseBag.findOneAndUpdate(
      {
        _id: bagId,
        status: "Active",
        quantityAvailable: { $gt: 0 },
      },
      { $inc: { quantityAvailable: -1 } },
      { new: true }
    );

    if (!bag) {
      return res.status(409).json({
        success: false,
        message: "This Surprise Bag is no longer available.",
      });
    }

    reservedBagId = bag._id;

    if (bag.quantityAvailable === 0) {
      await SurpriseBag.updateOne(
        { _id: bag._id, quantityAvailable: 0 },
        { $set: { status: "Sold Out" } }
      );
    }

    let razorpayOrder;

    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(Number(bag.discountedPrice) * 100),
        currency: "INR",
        receipt: `bag_${Date.now()}`,
      });
    } catch (error) {
      await SurpriseBag.updateOne(
        { _id: reservedBagId },
        {
          $inc: { quantityAvailable: 1 },
          $set: { status: "Active" },
        }
      );

      reservedBagId = null;
      throw error;
    }

    const newOrder = await Order.create({
      bagId: bag._id,
      customerPhone: String(customerPhone),
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
      stockReserved: true,
      stockReleased: false,
      pickupOTP: null,
    });

    createdOrderId = newOrder._id;

    return res.status(200).json({
      success: true,
      razorpayOrder,
      dbOrderId: newOrder._id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error.message);

    if (reservedBagId && !createdOrderId) {
      try {
        await SurpriseBag.updateOne(
          { _id: reservedBagId },
          {
            $inc: { quantityAvailable: 1 },
            $set: { status: "Active" },
          }
        );
      } catch (restoreError) {
        console.error(
          "Stock restoration error:",
          restoreError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order.",
    });
  }
});

// 2. SERVE RAZORPAY CHECKOUT
router.get("/checkout/:orderId", async (req, res) => {
  try {
    const dbOrder = await Order.findOne({
      razorpayOrderId: req.params.orderId,
      status: "pending",
      stockReserved: true,
      stockReleased: false,
    });

    if (!dbOrder) {
      return res.status(404).send(
        "This order is no longer available for payment."
      );
    }

    const order = await razorpay.orders.fetch(
      req.params.orderId
    );

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
        <title>Food2Go Payment</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 30px;
            background: #f9fafb;
          }
          h2 { color: #10B981; }
          button {
            background: #10B981;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
          }
          #message { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h2>Food2Go</h2>
        <p>Complete your payment securely.</p>
        <p>Amount: ₹${(order.amount / 100).toFixed(2)}</p>
        <button id="pay">Pay Now</button>
        <p id="message"></p>

        <script>
          const options = {
            key: ${JSON.stringify(process.env.RAZORPAY_KEY_ID)},
            order_id: ${JSON.stringify(order.id)},
            name: "Food2Go",
            description: "Surprise Bag Purchase",

            handler: function(response) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "PAYMENT_SUCCESS",
                  payment: response
                })
              );

              document.getElementById("message").textContent =
                "Payment submitted for verification...";
            },

            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: "PAYMENT_CANCELLED"
                  })
                );
              }
            },

            theme: { color: "#10B981" }
          };

          document.getElementById("pay").onclick = function() {
            if (typeof Razorpay === "undefined") {
              document.getElementById("message").textContent =
                "Unable to load checkout. Check your internet connection.";
              return;
            }

            const checkout = new Razorpay(options);

            checkout.on("payment.failed", function(response) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "PAYMENT_FAILED",
                  message: response.error.description
                })
              );
            });

            checkout.open();
          };
        </script>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error("Checkout page error:", error.message);

    return res.status(500).send(
      "Unable to load Razorpay checkout."
    );
  }
});

// 3. VERIFY PAYMENT AND GENERATE PICKUP OTP
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details.",
      });
    }

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
      });
    }

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Make verification retries safe.
    if (order.status === "paid" || order.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Payment was already verified.",
        orderId: order._id,
        pickupOTP: order.pickupOTP,
      });
    }

    if (
      order.status !== "pending" ||
      !order.stockReserved ||
      order.stockReleased
    ) {
      return res.status(409).json({
        success: false,
        message: "This order is no longer available for payment.",
      });
    }

    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment has not been captured.",
      });
    }

    const pickupOTP = generatePickupOTP();

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: "pending",
        stockReserved: true,
        stockReleased: false,
      },
      {
        $set: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          pickupOTP,
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      const latestOrder = await Order.findById(order._id);

      if (
        latestOrder &&
        ["paid", "completed"].includes(latestOrder.status)
      ) {
        return res.status(200).json({
          success: true,
          message: "Payment was already verified.",
          orderId: latestOrder._id,
          pickupOTP: latestOrder.pickupOTP,
        });
      }

      return res.status(409).json({
        success: false,
        message: "Order status changed. Check My Orders.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      orderId: updatedOrder._id,
      pickupOTP: updatedOrder.pickupOTP,
    });
  } catch (error) {
    console.error("Payment verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed.",
    });
  }
});

// 4. CUSTOMER CANCELS AN EXISTING ORDER (NO REFUND)
// This endpoint is separate from /cancel-order, which is used by Razorpay
// checkout to release stock when checkout is dismissed before payment.
router.post("/cancel-customer-order", async (req, res) => {
  try {
    const { orderId, customerPhone } = req.body;

    if (!orderId || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Order ID and customer phone are required.",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(String(orderId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    // Only cancel an order belonging to this customer and only once.
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        customerPhone: String(customerPhone),
        status: { $in: ["pending", "paid", "reserved"] },
        stockReserved: true,
        stockReleased: false,
      },
      {
        $set: {
          status: "cancelled",
          stockReserved: false,
          stockReleased: true,
          pickupOTP: null,
        },
      },
      { new: true }
    );

    if (!order) {
      const existingOrder = await Order.findOne({
        _id: orderId,
        customerPhone: String(customerPhone),
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found for this customer.",
        });
      }

      if (existingOrder.status === "completed") {
        return res.status(409).json({
          success: false,
          message: "Completed orders cannot be cancelled.",
        });
      }

      if (existingOrder.status === "cancelled" || existingOrder.stockReleased) {
        return res.status(200).json({
          success: true,
          message: "This order is already cancelled.",
          order: existingOrder,
        });
      }

      return res.status(409).json({
        success: false,
        message: "This order cannot be cancelled in its current status.",
      });
    }

    // Restore exactly one unit of stock. The atomic order update above prevents
    // repeated cancellation requests from restoring stock more than once.
    const bag = await SurpriseBag.findByIdAndUpdate(
      order.bagId,
      {
        $inc: { quantityAvailable: 1 },
        $set: { status: "Active" },
      },
      { new: true }
    );

    if (!bag) {
      console.error(
        `Order ${order._id} was cancelled but listing ${order.bagId} was not found; stock needs reconciliation.`
      );

      return res.status(500).json({
        success: false,
        cancelled: true,
        message:
          "Order was cancelled, but the food listing could not be restored. Please contact support.",
        order,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled and food listing restored.",
      order,
      bag,
    });
  } catch (error) {
    console.error("Customer order cancellation error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to cancel this order. Please try again.",
    });
  }
});

// 5. CANCEL CHECKOUT AND RELEASE RESERVED STOCK (UNPAID CHECKOUT ONLY)
router.post("/cancel-order", async (req, res) => {
  try {
    const { razorpayOrderId } = req.body;

    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID is required.",
      });
    }

    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (["paid", "completed"].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message: "Paid orders cannot be cancelled here.",
      });
    }

    // Confirm with Razorpay before releasing inventory.
    const paymentsResponse =
      await razorpay.orders.fetchPayments(razorpayOrderId);

    const payments = paymentsResponse.items || [];

    if (payments.some((p) => p.status === "captured")) {
      return res.status(409).json({
        success: false,
        message:
          "A payment has been captured. Verify payment before cancelling.",
      });
    }

    const released = await releaseStock(order._id, "failed");

    return res.status(200).json({
      success: true,
      message: released
        ? "Order cancelled and stock restored."
        : "Order was already cancelled or stock was already restored.",
    });
  } catch (error) {
    console.error("Cancel order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm cancellation. Please retry.",
    });
  }
});

// 6. MARK PAYMENT AS FAILED
router.post("/payment-failed", async (req, res) => {
  try {
    const { razorpayOrderId } = req.body;

    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID is required.",
      });
    }

    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (["paid", "completed"].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message: "This order has already been paid.",
      });
    }

    const paymentsResponse =
      await razorpay.orders.fetchPayments(razorpayOrderId);

    const payments = paymentsResponse.items || [];

    if (payments.some((p) => p.status === "captured")) {
      return res.status(409).json({
        success: false,
        message:
          "A payment has been captured. Verify payment before releasing stock.",
      });
    }

    const released = await releaseStock(order._id, "failed");

    return res.status(200).json({
      success: true,
      message: released
        ? "Failed order stock restored."
        : "Stock was already released.",
    });
  } catch (error) {
    console.error("Payment failure error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm payment failure. Please retry.",
    });
  }
});

// 7. GET CUSTOMER ORDERS
router.get("/my-orders", async (req, res) => {
  try {
    const { customerPhone } = req.query;

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone is required.",
      });
    }

    const orders = await Order.find({ customerPhone })
      .populate({
        path: "bagId",
        populate: {
          path: "businessId",
          select: "storeName",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Fetch customer orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer orders.",
    });
  }
});

// 8. GET ALL ORDERS FOR A BUSINESS
router.get("/business-orders", async (req, res) => {
  try {
    const { businessId } = req.query;

    // Validate business ID
    if (
      !businessId ||
      !/^[0-9a-fA-F]{24}$/.test(String(businessId))
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid business ID is required.",
      });
    }

    // Check whether the business exists
    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    // Find all food bags belonging to this business
    const bags = await SurpriseBag.find({
      businessId: business._id,
    }).select("_id");

    const bagIds = bags.map((bag) => bag._id);

    console.log(
      "Business ID:",
      businessId,
      "Food bags found:",
      bagIds.length
    );

    // Find orders associated with those food bags
    const orders = await Order.find({
      bagId: { $in: bagIds },
    })
      .populate("bagId")
      .sort({ createdAt: -1 });

    console.log(
      `Business ${businessId}: ${orders.length} orders found`
    );

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Business orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch business orders.",
    });
  }
});

// 8. VERIFY PICKUP OTP AND COMPLETE ORDER
router.post("/verify-pickup", async (req, res) => {
  try {
    const { businessId, orderId, pickupOTP } = req.body;

    if (
      !businessId ||
      !orderId ||
      !/^[0-9a-fA-F]{24}$/.test(String(businessId)) ||
      !/^[0-9a-fA-F]{24}$/.test(String(orderId)) ||
      !/^\d{6}$/.test(String(pickupOTP || ""))
    ) {
      return res.status(400).json({
        success: false,
        message: "Business ID, order ID and six-digit OTP are required.",
      });
    }

    const order = await Order.findById(orderId).populate("bagId");

    if (!order || !order.bagId) {
      return res.status(404).json({
        success: false,
        message: "Order or food listing not found.",
      });
    }

    if (String(order.bagId.businessId) !== String(businessId)) {
      return res.status(403).json({
        success: false,
        message: "This order does not belong to your business.",
      });
    }

    if (order.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "This order has already been completed.",
      });
    }

    if (order.status !== "paid") {
      return res.status(409).json({
        success: false,
        message: "Only paid orders can be collected.",
      });
    }

    if (!order.pickupOTP || order.pickupOTP !== String(pickupOTP)) {
      return res.status(400).json({
        success: false,
        message: "Incorrect pickup OTP.",
      });
    }

    // Atomic update prevents the same OTP being used twice.
    const completedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: "paid",
        pickupOTP: String(pickupOTP),
      },
      {
        $set: { status: "completed" },
      },
      { new: true }
    );

    if (!completedOrder) {
      return res.status(409).json({
        success: false,
        message: "Order has already been completed or changed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pickup verified. Order completed successfully.",
      orderId: completedOrder._id,
    });
  } catch (error) {
    console.error("Pickup verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify pickup OTP.",
    });
  }
});

module.exports = router;