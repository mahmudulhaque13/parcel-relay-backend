import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV,

  port: process.env.PORT,

  database_url: process.env.DATABASE_URL,

  frontend_url: process.env.FRONTEND_URL,

  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || "10",

  jwt_access_secret: process.env.JWT_ACCESS_SECRET!,

  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,

  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,

  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,

  google_client_id: process.env.GOOGLE_CLIENT_ID!,

  rate_limit_window_ms: process.env.RATE_LIMIT_WINDOW_MS || "900000",

  rate_limit_max: process.env.RATE_LIMIT_MAX || "100",

  admin_name: process.env.ADMIN_NAME!,

  admin_email: process.env.ADMIN_EMAIL!,

  admin_password: process.env.ADMIN_PASSWORD!,

  stripe_secret_key: process.env.STRIPE_SECRET_KEY!,

  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET!,

  stripe_success_url: process.env.STRIPE_SUCCESS_URL!,

  stripe_cancel_url: process.env.STRIPE_CANCEL_URL!,

  email_user: process.env.EMAIL_USER!,

  email_password: process.env.EMAIL_PASSWORD!,

  email_from: process.env.EMAIL_FROM!,

  redis_url: process.env.REDIS_URL!,
};
