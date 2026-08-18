import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import path from "path";

import authMiddleware from "./middlewares/auth.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";
import sharingRoutes from "./routes/sharingRoutes.js";

dotenv.config();

const app = express();

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = new Set([clientUrl]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowedLocalhost =
        /^http:\/\/localhost:\d+$/i.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/i.test(origin);

      if (allowedOrigins.has(origin) || isAllowedLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "medvault-backend" });
});

app.use("/", authRoutes);
app.use("/appointments", authMiddleware, appointmentRoutes);
app.use("/records", authMiddleware, recordRoutes);
app.use("/sharing", authMiddleware, sharingRoutes);
app.use("/dashboard", authMiddleware, dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
