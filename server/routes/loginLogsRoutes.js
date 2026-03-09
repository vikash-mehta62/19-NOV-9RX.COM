const express = require("express");
const router = express.Router();
const Log = require("../models/logsModels");
const { requireAuth, requireAdmin } = require("../middleware/auth");

/**
 * Get login logs with filtering and pagination
 * GET /api/login-logs
 * Query params:
 *   - userId: Filter by user ID
 *   - email: Filter by email
 *   - action: Filter by action (login, login_failed)
 *   - startDate: Filter logs from this date
 *   - endDate: Filter logs until this date
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50, max: 200)
 *   - sortBy: Sort field (default: timestamp)
 *   - sortOrder: asc or desc (default: desc)
 */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      email,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = "timestamp",
      sortOrder = "desc"
    } = req.query;

    // Build filter
    const filter = {};
    
    // Filter by action (login or login_failed)
    if (action) {
      if (action === "login" || action === "login_failed") {
        filter.action = action;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Use 'login' or 'login_failed'"
        });
      }
    } else {
      // Default: only show login-related actions
      filter.action = { $in: ["login", "login_failed"] };
    }

    // Filter by userId
    if (userId) {
      filter.userId = userId;
    }

    // Filter by email
    if (email) {
      filter["details.email"] = { $regex: email, $options: "i" };
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortField = sortBy || "timestamp";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    // Execute query
    const [logs, totalCount] = await Promise.all([
      Log.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Log.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error("Error fetching login logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch login logs"
    });
  }
});

/**
 * Get login statistics
 * GET /api/login-logs/stats
 * Query params:
 *   - startDate: Stats from this date
 *   - endDate: Stats until this date
 *   - userId: Filter by specific user
 */
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    // Build filter
    const filter = {
      action: { $in: ["login", "login_failed"] }
    };

    if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    // Get statistics
    const [
      totalLogins,
      successfulLogins,
      failedLogins,
      uniqueUsers,
      recentLogins,
      topFailureReasons,
      loginsByDevice,
      loginsByBrowser,
      loginsByCountry
    ] = await Promise.all([
      // Total login attempts
      Log.countDocuments(filter),
      
      // Successful logins
      Log.countDocuments({ ...filter, action: "login" }),
      
      // Failed logins
      Log.countDocuments({ ...filter, action: "login_failed" }),
      
      // Unique users who logged in
      Log.distinct("userId", { ...filter, action: "login", userId: { $ne: null } }),
      
      // Recent 10 logins
      Log.find(filter)
        .sort({ timestamp: -1 })
        .limit(10)
        .select("userId action timestamp details.email details.ip details.location")
        .lean(),
      
      // Top failure reasons
      Log.aggregate([
        { $match: { ...filter, action: "login_failed" } },
        { $group: { _id: "$details.reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Logins by device type
      Log.aggregate([
        { $match: filter },
        { $group: { _id: "$details.device", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Logins by browser
      Log.aggregate([
        { $match: filter },
        { $group: { _id: "$details.browser", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Logins by country
      Log.aggregate([
        { $match: filter },
        { $group: { _id: "$details.location.country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const successRate = totalLogins > 0 
      ? ((successfulLogins / totalLogins) * 100).toFixed(2) 
      : 0;

    return res.json({
      success: true,
      stats: {
        totalLogins,
        successfulLogins,
        failedLogins,
        uniqueUsers: uniqueUsers.length,
        successRate: `${successRate}%`,
        recentLogins,
        topFailureReasons: topFailureReasons.map(r => ({
          reason: r._id || "Unknown",
          count: r.count
        })),
        loginsByDevice: loginsByDevice.map(d => ({
          device: d._id || "Unknown",
          count: d.count
        })),
        loginsByBrowser: loginsByBrowser.map(b => ({
          browser: b._id || "Unknown",
          count: b.count
        })),
        loginsByCountry: loginsByCountry.map(c => ({
          country: c._id || "Unknown",
          count: c.count
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching login stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch login statistics"
    });
  }
});

/**
 * Get login logs for a specific user
 * GET /api/login-logs/user/:userId
 */
router.get("/user/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if user is requesting their own logs or is admin
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "superadmin";

    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own login logs"
      });
    }

    const filter = {
      action: { $in: ["login", "login_failed"] },
      $or: [
        { userId: userId },
        { "details.email": req.user?.email }
      ]
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalCount] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Log.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error("Error fetching user login logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user login logs"
    });
  }
});

module.exports = router;
