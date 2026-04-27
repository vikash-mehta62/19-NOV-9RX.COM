const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Feedback = require("../models/feedbackModel");
const { requireAuth, requireAdmin, getSupabaseAdmin } = require("../middleware/auth");

const feedbackUploadDir = path.join(__dirname, "..", "uploads", "feedback");
if (!fs.existsSync(feedbackUploadDir)) {
  fs.mkdirSync(feedbackUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, feedbackUploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || "file")
      .replace(/[^\w.-]/g, "_")
      .slice(-80);
    const ext = path.extname(safeName) || ".jpg";
    const base = path.basename(safeName, ext).replace(/[^\w-]/g, "_").slice(0, 40) || "feedback";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
  },
});

const imageFileFilter = (_req, file, cb) => {
  const isImage = typeof file.mimetype === "string" && file.mimetype.startsWith("image/");
  if (!isImage) {
    return cb(new Error("Only image files are allowed"));
  }
  return cb(null, true);
};

const uploadFeedbackImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/", requireAuth, uploadFeedbackImages.array("images", 5), async (req, res) => {
  try {
    const authUserId = req.auth?.user?.id;
    const authEmail = req.auth?.user?.email || null;
    const authProfile = req.auth?.profile || null;

    if (!authUserId || !authProfile) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const normalizedType = String(authProfile.type || "").toLowerCase();
    if (normalizedType !== "pharmacy") {
      return res.status(403).json({
        success: false,
        message: "Only pharmacy users can submit feedback from this endpoint",
      });
    }

    const feedbackType = String(req.body?.feedbackType || "bug").toLowerCase();
    const allowedTypes = new Set(["bug", "suggestion", "other"]);
    const safeFeedbackType = allowedTypes.has(feedbackType) ? feedbackType : "bug";

    const message = String(req.body?.message || "").trim();
    const pageUrl = String(req.body?.pageUrl || "").trim();

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Feedback message must be at least 10 characters",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Feedback message is too long",
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: fullProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,email,first_name,last_name,display_name,company_name,mobile_phone,work_phone,role,type,group_id"
      )
      .eq("id", authUserId)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: "Failed to load profile context",
      });
    }

    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor || "").split(",")[0].trim();
    const ipAddress = forwardedIp || req.ip || null;

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    const images = uploadedFiles.map((file) => ({
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: `uploads/feedback/${file.filename}`,
      url: `/uploads/feedback/${file.filename}`,
    }));

    const feedback = await Feedback.create({
      userId: authUserId,
      feedbackType: safeFeedbackType,
      message,
      pageUrl,
      images,
      pharmacy: {
        profileId: fullProfile?.id || authUserId,
        email: fullProfile?.email || authEmail,
        firstName: fullProfile?.first_name || null,
        lastName: fullProfile?.last_name || null,
        displayName: fullProfile?.display_name || null,
        companyName: fullProfile?.company_name || null,
        mobilePhone: fullProfile?.mobile_phone || null,
        workPhone: fullProfile?.work_phone || null,
        role: fullProfile?.role || authProfile.role || null,
        type: fullProfile?.type || authProfile.type || null,
        groupId: fullProfile?.group_id || authProfile.group_id || null,
      },
      meta: {
        ipAddress,
        userAgent: req.get("user-agent") || null,
        source: "web",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        id: feedback._id,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.error("Feedback submit error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to submit feedback",
    });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      feedbackType,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && ["new", "reviewed", "resolved"].includes(String(status))) {
      filter.status = String(status);
    }
    if (feedbackType && ["bug", "suggestion", "other"].includes(String(feedbackType))) {
      filter.feedbackType = String(feedbackType);
    }
    if (search) {
      const safeSearch = String(search).trim();
      if (safeSearch) {
        filter.$or = [
          { message: { $regex: safeSearch, $options: "i" } },
          { "pharmacy.email": { $regex: safeSearch, $options: "i" } },
          { "pharmacy.companyName": { $regex: safeSearch, $options: "i" } },
          { "pharmacy.displayName": { $regex: safeSearch, $options: "i" } },
        ];
      }
    }

    const [items, totalCount] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Feedback list error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback list",
    });
  }
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const nextStatus = String(req.body?.status || "").trim().toLowerCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Feedback id is required",
      });
    }

    if (!["new", "reviewed", "resolved"].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updated = await Feedback.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    return res.json({
      success: true,
      message: "Status updated successfully",
      data: {
        id: updated._id,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("Feedback status update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Each image must be 5MB or smaller",
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || "File upload error",
    });
  }

  if (error && /Only image files are allowed/i.test(String(error.message || ""))) {
    return res.status(400).json({
      success: false,
      message: "Only image files are allowed",
    });
  }

  return next(error);
});

module.exports = router;
