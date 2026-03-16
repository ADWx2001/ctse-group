const Order = require('../models/Order');
const { getRestaurant, getMenuItem } = require('../services/restaurantService');
const { sendOrderConfirmation, sendStatusUpdate } = require('../services/notificationService');
const { createOrderSchema, updateStatusSchema } = require('../validators/orderValidators');

// POST /api/orders — Place a new order
exports.createOrder = async (req, res, next) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { restaurantId, items, deliveryAddress, specialInstructions } = value;

    // 1. Fetch restaurant details from Restaurant Service
    const restaurant = await getRestaurant(restaurantId);

    // 2. Fetch and validate each menu item, get current prices
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = await getMenuItem(item.menuItemId);

      if (!menuItem.is_available) {
        return res.status(400).json({
          error: `Menu item "${menuItem.name}" is currently unavailable`
        });
      }

      const subtotal = menuItem.price * item.quantity;
      orderItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        subtotal
      });
      totalAmount += subtotal;
    }

    // 3. Create the order
    const order = await Order.create({
      userId: req.user.id,
      restaurantId,
      restaurantName: restaurant.name,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      customerName: req.user.name || 'Customer',
      customerEmail: req.user.email || '',
      customerPhone: req.user.phone || '',
      specialInstructions,
      status: 'pending',
      statusHistory: [{ status: 'pending' }]
    });

    // 4. Send notification (non-blocking)
    sendOrderConfirmation({
      userId: req.user.id,
      customerEmail: req.user.email,
      customerName: req.user.name,
      orderId: order._id,
      restaurantName: restaurant.name,
      totalAmount,
      items: orderItems,
      estimatedDeliveryTime: order.estimatedDeliveryTime
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

// GET /api/orders — Get all orders for authenticated user
exports.getUserOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = { userId: req.user.id };

    // Allow admins to see all orders
    if (req.user.role === 'admin' && req.query.all === 'true') {
      delete filter.userId;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter)
    ]);

    res.status(200).json({
      orders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id — Get single order
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Users can only view their own orders (admins can view any)
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id/status — Update order status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[order.status].includes(value.status)) {
      return res.status(400).json({
        error: `Cannot transition from '${order.status}' to '${value.status}'`
      });
    }

    order.status = value.status;
    await order.save();

    // Send notification about status change (non-blocking)
    sendStatusUpdate(order, value.status);

    res.status(200).json({ message: 'Order status updated', order });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/orders/:id — Cancel order
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        error: 'Order can only be cancelled when in pending or confirmed status'
      });
    }

    order.status = 'cancelled';
    await order.save();

    sendStatusUpdate(order, 'cancelled');

    res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    next(err);
  }
};
