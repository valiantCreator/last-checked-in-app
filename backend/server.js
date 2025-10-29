// backend/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const createAuthRouter = require("./routes/auth");
const createContactsRouter = require("./routes/contacts");
const createIndexRouter = require("./routes/index");

// Gemini COMMENT: INFRASTRUCTURE REFACTOR - The isDevelopment flag is moved to the top.
// This flag is now used for both Firebase and Database configuration.
const isDevelopment = process.env.NODE_ENV === "development";

// Gemini COMMENT: INFRASTRUCTURE REFACTOR - The database configuration is now dynamic.
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  // Gemini COMMENT: CRITICAL FIX - The 'ssl' object is ONLY included for production.
  // The '...isDevelopment' part evaluates to nothing in dev, effectively removing the ssl key.
  // Render's production DB requires SSL. Local PostgreSQL does not support it by default.
  // This resolves the "The server does not support SSL connections" error.
  ...(!isDevelopment && { ssl: { rejectUnauthorized: false } }),
};
const pool = new Pool(dbConfig);

// Gemini COMMENT: INFRASTRUCTURE REFACTOR - This block now dynamically selects the correct Firebase service account key.
const serviceAccountPath = isDevelopment
  ? process.env.DEV_SERVICE_ACCOUNT_PATH // From .env file: './serviceAccountKey.dev.json'
  : "./serviceAccountKey.json"; // The production default

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

const whitelist = [process.env.FRONTEND_URL, "http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many API requests from this IP, please try again after 15 minutes.",
  },
});

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
app.use("/api/", apiLimiter);
app.use("/api/auth", createAuthRouter(pool, validate));
app.use("/api/contacts", createContactsRouter(pool, validate, authMiddleware));
// Gemini COMMENT: REVERT - The index router is no longer passed the job function.
app.use("/api", createIndexRouter(pool, validate, authMiddleware));

// =================================================================
// --- SCHEDULED JOB ---
// =================================================================
// Gemini COMMENT: REVERT - The cron job logic is now self-contained again.
cron.schedule("0 9 * * *", async () => {
  console.log(
    `[${new Date().toISOString()}] Running daily notifications job...`
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
      const devicesResult = await client.query(
        "SELECT token FROM devices WHERE user_id = $1",
        [userId]
      );
      const userDeviceTokens = devicesResult.rows.map((row) => row.token);

      if (userDeviceTokens.length === 0) {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has no registered devices. Skipping.`
        );
        continue;
      }

      // --- Block 1: Overdue Check-ins ---
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

      if (overdueContacts.length > 0) {
        let notificationBody;
        if (overdueContacts.length === 1) {
          notificationBody = `Time to check in with ${overdueContacts[0].name}.`;
        } else {
          notificationBody = `You have ${overdueContacts.length} overdue check-ins.`;
        }
        const message = {
          notification: { title: "Check-in Reminder", body: notificationBody },
          data: { app_url: "/" },
          tokens: userDeviceTokens,
        };
        await admin.messaging().sendEachForMulticast(message);
        console.log(
          `[${new Date().toISOString()}] User ${userId}: Sent ${
            overdueContacts.length
          } overdue notification(s).`
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has no overdue contacts.`
        );
      }

      // --- Block 2: Birthday Check ---
      const birthdayResult = await client.query(
        `
          SELECT name FROM contacts
          WHERE user_id = $1
            AND is_archived = FALSE
            AND birthday IS NOT NULL
            AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(DAY FROM birthday) = EXTRACT(DAY FROM CURRENT_DATE)
        `,
        [userId]
      );
      const birthdayContacts = birthdayResult.rows;

      if (birthdayContacts.length > 0) {
        let birthdayBody;
        if (birthdayContacts.length === 1) {
          birthdayBody = `It's ${birthdayContacts[0].name}'s birthday today! Don't forget to reach out.`;
        } else {
          const names = birthdayContacts.map((c) => c.name).join(", ");
          birthdayBody = `It's a special day for a few people: ${names}. Don't forget to wish them a happy birthday!`;
        }
        const birthdayMessage = {
          notification: { title: "Birthday Reminder", body: birthdayBody },
          data: { app_url: "/" },
          tokens: userDeviceTokens,
        };
        await admin.messaging().sendEachForMulticast(birthdayMessage);
        console.log(
          `[${new Date().toISOString()}] User ${userId}: Sent ${
            birthdayContacts.length
          } birthday notification(s).`
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has no birthdays today.`
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
  // Gemini COMMENT: Add a log to confirm which environment the backend is running in.
  console.log(
    isDevelopment
      ? `Firebase Admin using DEV key: ${serviceAccountPath}`
      : `Firebase Admin using PROD key: ${serviceAccountPath}`
  );
  // Gemini COMMENT: Add a log to confirm which database is being used.
  console.log(
    isDevelopment
      ? `Connected to LOCAL database.`
      : `Connected to PRODUCTION database.`
  );
});
