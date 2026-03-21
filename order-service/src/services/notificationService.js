const axios = require("axios");

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3004";

/**
 * Send an order confirmation notification via Notification Service.
 * Non-blocking — failures are logged but don't break the order flow.
 */
const sendOrderConfirmation = async (orderData) => {
  try {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/notifications/send`,
      {
        type: "order_confirmation",
        userId: orderData.userId,
        userEmail: orderData.customerEmail,
        userName: orderData.customerName,
        orderId: orderData.orderId,
        restaurantName: orderData.restaurantName,
        totalAmount: orderData.totalAmount,
        items: orderData.items,
        estimatedDeliveryTime: orderData.estimatedDeliveryTime,
      },
      { timeout: 5000 },
    );
    console.log(
      `[Order Service] Notification sent for order ${orderData.orderId}`,
    );
  } catch (err) {
    // Notification failure is non-critical — log and continue
    console.error(
      `[Order Service] Failed to send notification: ${err.message}`,
    );
  }
};

/**
 * Send order status update notification.
 */
const sendStatusUpdate = async (orderData, newStatus) => {
  try {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/notifications/send`,
      {
        type: "order_status_update",
        userId: orderData.userId,
        userEmail: orderData.customerEmail,
        userName: orderData.customerName,
        orderId: orderData._id,
        restaurantName: orderData.restaurantName,
        status: newStatus,
      },
      { timeout: 5000 },
    );
  } catch (err) {
    console.error(
      `[Order Service] Failed to send status notification: ${err.message}`,
    );
  }
};

module.exports = { sendOrderConfirmation, sendStatusUpdate };
