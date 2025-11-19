const express = require("express");
const router = express.Router();
const { createLog, getAllLogs, filterLogs } = require("../controllers/logTrack");

router.post("/create", createLog);
router.get("/get-logs", getAllLogs);
router.get("/logs/filter", filterLogs);

module.exports = router;
