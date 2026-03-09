const Log = require("../models/logsModels");
const axios = require("axios");

/**
 * Extract IP address from request
 */
const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    return ips[0];
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

/**
 * Get location details from IP address using ip-api.com (free, no API key needed)
 */
const getLocationFromIp = async (ip) => {
  try {
    // Skip for localhost/private IPs
    if (!ip || ip === "unknown" || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return {
        country: "Local",
        city: "Local",
        region: "Local",
        timezone: "Local"
      };
    }

    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,timezone,isp`, {
      timeout: 3000 // 3 second timeout
    });

    if (response.data && response.data.status === "success") {
      return {
        country: response.data.country || "Unknown",
        countryCode: response.data.countryCode || "Unknown",
        region: response.data.regionName || "Unknown",
        city: response.data.city || "Unknown",
        timezone: response.data.timezone || "Unknown",
        isp: response.data.isp || "Unknown"
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching location from IP:", error.message);
    return null;
  }
};

/**
 * Extract device and browser information from User-Agent
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      browser: "Unknown",
      os: "Unknown",
      device: "Unknown"
    };
  }

  // Detect browser
  let browser = "Unknown";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  // Detect OS
  let os = "Unknown";
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  }

  // Detect device type
  let device = "Desktop";
  if (userAgent.includes("Mobile")) {
    device = "Mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    device = "Tablet";
  }

  return { browser, os, device };
};

/**
 * Log successful login to MongoDB
 */
const logSuccessfulLogin = async (req, userId, userEmail) => {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);
    const location = await getLocationFromIp(ip);

    const logData = {
      userId: userId,
      action: "login",
      timestamp: new Date(),
      details: {
        email: userEmail,
        ip: ip,
        userAgent: userAgent,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
        location: location || { country: "Unknown", city: "Unknown" },
        success: true
      }
    };

    const log = new Log(logData);
    await log.save();

    console.log(`✅ Login logged for user ${userEmail} from IP ${ip}`);
    return { success: true };
  } catch (error) {
    console.error("Error logging successful login:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Log failed login attempt to MongoDB
 */
const logFailedLogin = async (req, email, reason) => {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);
    const location = await getLocationFromIp(ip);

    const logData = {
      userId: null, // No userId for failed attempts
      action: "login_failed",
      timestamp: new Date(),
      details: {
        email: email,
        ip: ip,
        userAgent: userAgent,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
        location: location || { country: "Unknown", city: "Unknown" },
        success: false,
        reason: reason
      }
    };

    const log = new Log(logData);
    await log.save();

    console.log(`❌ Failed login logged for ${email} from IP ${ip} - Reason: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error("Error logging failed login:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  logSuccessfulLogin,
  logFailedLogin,
  getClientIp,
  getLocationFromIp,
  parseUserAgent
};
