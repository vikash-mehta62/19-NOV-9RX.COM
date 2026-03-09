const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  loginMethod: {
    type: String,
    enum: ['otp', 'password', 'magic_link', 'oauth'],
    default: 'otp'
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'blocked'],
    required: true
  },
  failureReason: {
    type: String,
    default: null
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
loginLogSchema.index({ userId: 1, timestamp: -1 });
loginLogSchema.index({ ipAddress: 1, timestamp: -1 });
loginLogSchema.index({ email: 1, timestamp: -1 });

module.exports = mongoose.model("LoginLog", loginLogSchema);
