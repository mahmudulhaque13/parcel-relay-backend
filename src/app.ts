import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";

import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { apiRateLimiter } from "./app/middleware/rateLimiter";
import { authRoutes } from "./app/module/auth/auth.route";
import { healthRoutes } from "./app/module/health/health.route";
import { userRoutes } from "./app/module/user/user.route";
import { zoneRoutes } from "./app/module/zone/zone.route";
import { hubRoutes } from "./app/module/hub/hub.route";
import { pricingRoutes } from "./app/module/pricing/pricing.route";
import { shipmentRoutes } from "./app/module/shipment/shipment.route";
import { paymentRoutes } from "./app/module/payment/payment.route";
import { paymentController } from "./app/module/payment/payment.controller";
import { courierRoutes } from "./app/module/courier/courier.route";

const app: Application = express();

// Trust the platform proxy (Render) so client IPs / rate limiting work correctly.
app.set("trust proxy", 1);

// ---- Security middleware ----

app.use(helmet());

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

// Stripe webhook MUST be before express.json()
app.post(
  "/api/v1/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  paymentController.handleWebhook,
);

// ---- Body parsing ----

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true }));

// ---- Rate limiting (baseline for the whole API) ----

app.use("/api", apiRateLimiter);

// ---- Root info route ----

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "ParcelRelay API",
    data: {
      name: "ParcelRelay",
      version: "v1",
      docs: "/api/v1/health",
    },
  });
});

// ---- API v1 routes ----

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/zones", zoneRoutes);
app.use("/api/v1/hubs", hubRoutes);
app.use("/api/v1/pricing", pricingRoutes);
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/courier", courierRoutes);

// ---- 404 + centralized error handling (must be last) ----

app.use(notFound);

app.use(globalErrorHandler);

export default app;
