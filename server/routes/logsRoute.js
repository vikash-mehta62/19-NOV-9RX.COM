const express = require("express");
const router = express.Router();
const { createLog, getAllLogs, filterLogs } = require("../controllers/logTrack");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Any authenticated user can create activity logs.
router.post("/create", requireAuth, createLog);

// Only admins can view logs.
router.get("/get-logs", requireAdmin, getAllLogs);
router.get("/logs/filter", requireAdmin, filterLogs);

module.exports = router;
