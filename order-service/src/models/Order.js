const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  note: { type: String }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  restaurantId: {
    type: String,
    required: [true, 'Restaurant ID is required']
  },
  restaurantName: {
    type: String,
    required: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: 'Order must have at least one item'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [statusHistorySchema],
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'Sri Lanka' }
  },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String },
  specialInstructions: { type: String, maxlength: 500 },
  estimatedDeliveryTime: { type: Number, default: 45 } // minutes
}, {
  timestamps: true
});

// Auto-populate status history on status change
orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
