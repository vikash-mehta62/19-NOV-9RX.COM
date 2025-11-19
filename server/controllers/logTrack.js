const Log = require("../models/logsModels");

// ✅ Create a new log
const createLog = async (req, res) => {
  try {
    const { user_id="NA", order_id, action, details } = req.body;
console.log(req.body)
    // Validation
    if ( !action) {
      return res.status(400).json({ success: false, message: "userId and action are required" });
    }

    const newLog = new Log({ userId:user_id, orderId:order_id, action, details });
    await newLog.save();

    res.status(201).json({
      success: true,
      message: "Log created successfully",
      log: newLog,
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: "Failed to create log", error: err.message });
  }
};

// ✅ Get all logs
const getAllLogs = async (req, res) => {
  try {
    // Extract query params
    const {
      page = 1,
      limit = 50,
      orderNumber,
      startDate,
      endDate,
      actions,
    } = req.query;

    // Build filter object
    const filter = {};

    if (orderNumber) {
      filter["details.message"] = { $regex: orderNumber, $options: "i" }; 
      // Assuming orderNumber is part of message string; adjust if you store separately
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (actions) {
      // actions query param is a comma-separated string, e.g. "order_and_payment_success,login"
      const actionsArray = actions.split(",");
      filter.action = { $in: actionsArray };
    }

    // Pagination options
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Query logs with filter, sort, paginate
    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize);

    // Total count for pagination
    const total = await Log.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
      logs,
      total,
      page: pageNumber,
      limit: pageSize,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
      error: err.message,
    });
  }
};

// ✅ Filter logs
const filterLogs = async (req, res) => {
  try {
    const { userId, orderId, action, startDate, endDate } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (orderId) filter.orderId = orderId;
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await Log.find(filter).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      message: "Filtered logs fetched successfully",
      logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to filter logs", error: err.message });
  }
};

module.exports = {
  createLog,
  getAllLogs,
  filterLogs,
};
