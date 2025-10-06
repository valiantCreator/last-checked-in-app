// backend/server.js

// This line loads the secret database URL from the .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// Gemini COMMENT: ARCHITECTURAL REFACTOR - Import the new router modules.
const createAuthRouter = require("./routes/auth");
const createContactsRouter = require("./routes/contacts");
const createIndexRouter = require("./routes/index");

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// --- Firebase Admin Setup ---
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3001;

// --- Core Middleware ---
app.set("trust proxy", 1);

// Gemini COMMENT: DEPLOYMENT FIX - Replaced the overly permissive default cors()
// with a robust, production-ready configuration that explicitly whitelists the frontend.
const whitelist = [
  process.env.FRONTEND_URL, // The live Vercel URL from your Render environment variables
  "http://localhost:5173", // Your local Vite dev server
];

const corsOptions = {
  origin: function (origin, callback) {
    // The 'origin' can be undefined for server-to-server requests or some mobile apps.
    // '!origin' allows these cases. The whitelist ensures browsers are restricted.
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());

// --- Rate Limiting Middleware ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many API requests from this IP, please try again after 15 minutes.",
  },
});

// --- Shared Middleware (to be passed to routers) ---

// Authentication middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ error: "No token provided. Access denied." });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "Invalid or expired token. Access denied." });
    }
    req.userId = decodedPayload.userId;
    next();
  });
};

// Zod validation middleware factory
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (e) {
    res.status(400).json({ error: "Invalid request data", details: e.errors });
  }
};

// =================================================================
// --- ROUTE REGISTRATION ---
// =================================================================
// Gemini COMMENT: ARCHITECTURAL REFACTOR - The monolithic block of endpoints has been replaced
// with these three lines. The server's only job is to delegate requests to the correct router.

// Apply rate limiter to all API routes
app.use("/api/", apiLimiter);

// Publicly accessible authentication routes
app.use("/api/auth", createAuthRouter(pool, validate));

// All contact-related routes (which are internally protected by authMiddleware)
app.use("/api/contacts", createContactsRouter(pool, validate, authMiddleware));

// All other general API routes
app.use("/api", createIndexRouter(pool, validate, authMiddleware));

// =================================================================
// --- SCHEDULED JOB ---
// =================================================================

cron.schedule("0 9 * * *", async () => {
  console.log(
    `[${new Date().toISOString()}] Running daily check for overdue contacts...`
  );
  const client = await pool.connect();
  try {
    const usersResult = await client.query(
      "SELECT DISTINCT user_id FROM devices"
    );
    const userIds = usersResult.rows.map((row) => row.user_id);
    if (userIds.length === 0) {
      console.log(
        `[${new Date().toISOString()}] No users with registered devices. Job finished.`
      );
      return;
    }
    for (const userId of userIds) {
      console.log(
        `[${new Date().toISOString()}] Processing notifications for user: ${userId}`
      );
      const overdueResult = await client.query(
        `
          SELECT id, name FROM contacts
          WHERE user_id = $1
            AND is_archived = FALSE
            AND (snooze_until IS NULL OR CAST(snooze_until AS DATE) < CURRENT_DATE)
            AND CAST((last_checkin + checkin_frequency * INTERVAL '1 day') AS DATE) <= CURRENT_DATE
        `,
        [userId]
      );
      const overdueContacts = overdueResult.rows;
      if (overdueContacts.length === 0) {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has no overdue contacts.`
        );
        continue;
      }
      const devicesResult = await client.query(
        "SELECT token FROM devices WHERE user_id = $1",
        [userId]
      );
      const userDeviceTokens = devicesResult.rows.map((row) => row.token);
      if (userDeviceTokens.length === 0) {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has overdue contacts but no registered devices.`
        );
        continue;
      }
      let notificationBody;
      if (overdueContacts.length === 1) {
        notificationBody = `You have an overdue check-in for ${overdueContacts[0].name}.`;
      } else {
        notificationBody = `You have ${overdueContacts.length} overdue check-ins.`;
      }
      const message = {
        notification: { title: "Check-in Reminder", body: notificationBody },
        data: { app_url: "/" },
        tokens: userDeviceTokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `[${new Date().toISOString()}] User ${userId}: Successfully sent to ${
          response.successCount
        } of ${userDeviceTokens.length} devices.`
      );
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(userDeviceTokens[idx]);
          }
        });
        console.warn(
          `[${new Date().toISOString()}] User ${userId}: Failed to send to ${
            failedTokens.length
          } devices. Cleaning them up.`
        );
        await client.query(
          "DELETE FROM devices WHERE token = ANY($1::text[])",
          [failedTokens]
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] FATAL ERROR during scheduled job:`,
      error
    );
  } finally {
    client.release();
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
