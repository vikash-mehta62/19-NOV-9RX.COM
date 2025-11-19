const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  userId: String,
  orderId: String,
  action: {
    type: String,
    enum: [
      'order_created',
      'order_edited',
      'payment_success',
      'payment_failed',
      'order_and_payment_success'
    ]
  },
  timestamp: { type: Date, default: Date.now },
  details: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model("Log", logSchema);
