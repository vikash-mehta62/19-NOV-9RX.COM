const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    feedbackType: {
      type: String,
      enum: ["bug", "suggestion", "other"],
      default: "bug",
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    pageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved"],
      default: "new",
      index: true,
    },
    images: [
      {
        fileName: { type: String, default: null },
        originalName: { type: String, default: null },
        mimeType: { type: String, default: null },
        size: { type: Number, default: 0 },
        path: { type: String, default: null },
        url: { type: String, default: null },
      },
    ],
    pharmacy: {
      profileId: { type: String, default: null },
      email: { type: String, default: null },
      firstName: { type: String, default: null },
      lastName: { type: String, default: null },
      displayName: { type: String, default: null },
      companyName: { type: String, default: null },
      mobilePhone: { type: String, default: null },
      workPhone: { type: String, default: null },
      role: { type: String, default: null },
      type: { type: String, default: null },
      groupId: { type: String, default: null },
    },
    meta: {
      ipAddress: { type: String, default: null },
      userAgent: { type: String, default: null },
      source: { type: String, default: "web" },
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
