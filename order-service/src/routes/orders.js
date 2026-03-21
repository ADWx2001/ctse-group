const express = require("express");
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");

// All order routes require authentication
router.use(protect);

// @route   POST /api/orders
// @desc    Place a new order
router.post("/", createOrder);

// @route   GET /api/orders
// @desc    Get all orders for logged-in user
router.get("/", getUserOrders);

// @route   GET /api/orders/:id
// @desc    Get a single order by ID
router.get("/:id", getOrder);

// @route   PUT /api/orders/:id/status
// @desc    Update order status (restaurant owner / admin)
router.put("/:id/status", updateOrderStatus);

// @route   DELETE /api/orders/:id
// @desc    Cancel an order
router.delete("/:id", cancelOrder);

module.exports = router;
