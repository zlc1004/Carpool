module.exports = {
  // Database configuration
  db: {
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE,
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: "mysql",
    logging: false,
    operatorsAliases: false,
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    retry_strategy: function (options) {
      if (options.error && options.error.code === "ECONNREFUSED") {
        console.log("Redis connection refused");
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error("Retry time exhausted");
      }
      if (options.attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    },
  },

  // JWT configuration
  jwt: {
    tokenSecret: process.env.CODEPUSH_JWT_SECRET || "carp-school-codepush-jwt-secret-key-change-in-production-2024",
    expirationTime: 60 * 60 * 24 * 30, // 30 days
  },

  // Storage configuration
  storage: {
    type: "local",
    storageDir: process.env.STORAGE_DIR || "/data/storage",
    downloadUrl: process.env.DOWNLOAD_URL,
  },

  // Temporary directory for processing uploads
  dataDir: process.env.DATA_DIR || "/data/tmp",

  // Server configuration
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 3000,
    proxy: {
      "/download": {
        target: process.env.DOWNLOAD_URL,
        changeOrigin: true,
      },
    },
  },

  // Email configuration (optional)
  smtpConfig: {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
  },

  // Security configuration
  security: {
    // Rate limiting
    rateLimits: {
      updateCheck: "100/hour",
      download: "1000/hour",
      reportDeployment: "50/hour",
    },
    
    // CORS settings
    cors: {
      origin: ["http://localhost:3000", "https://carp.school"],
      credentials: true,
    },
    
    // File upload limits
    uploadLimits: {
      maxFileSize: "100mb",
      maxFiles: 10,
    },
  },

  // Logging configuration
  logging: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    file: "/var/log/codepush/app.log",
  },
};
