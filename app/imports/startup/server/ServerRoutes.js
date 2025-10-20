import { WebApp } from "meteor/webapp";
import { Accounts } from "meteor/accounts-base";
import { Images } from "../../api/images/Images";

// Set Content Security Policy headers for OneSignal support
WebApp.connectHandlers.use("/", (req, res, next) => {
  // Only set CSP for HTML responses to avoid breaking API responses
  if (req.url === "/" || req.url.endsWith(".html") || !req.url.includes(".")) {

    // In development, use a more permissive CSP for easier testing
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (isDevelopment && process.env.DISABLE_CSP === "true") {
      // Completely disable CSP for development testing
    } else {
      const cspHeader = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
        "https://cdn.onesignal.com https://onesignal.com https://api.onesignal.com",
        "connect-src 'self' https://onesignal.com https://*.onesignal.com " +
        "https://api.onesignal.com https://cdn.onesignal.com wss: ws: " +
        "https://nominatim.carp.school https://tileserver.carp.school https://osrm.carp.school",
        "img-src 'self' data: https: http: https://onesignal.com https://*.onesignal.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https: https://fonts.gstatic.com",
        "worker-src 'self' blob: https://cdn.onesignal.com",
        "frame-src https://onesignal.com https://*.onesignal.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ");

      res.setHeader("Content-Security-Policy", cspHeader);
    }
  }
  next();
});

// Create endpoint to serve images directly: /image/<uuid>
WebApp.connectHandlers.use("/image", async (req, res, _next) => {
  try {
    // Extract UUID from URL path (remove leading slash)
    const uuid = req.url.substring(1);

    if (!uuid) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request: UUID required");
      return;
    }

    // Find image in database
    const image = await Images.findOneAsync({ uuid: uuid });

    if (!image) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Image not found");
      return;
    }

    // Check permissions for private images
    if (image.private) {
      // Get user from request (check for DDP connection first, then session)
      let userId = null;

      // Try to get user from DDP connection header
      const loginToken = req.headers['meteor-login-token'] || req.headers.authorization?.replace('Bearer ', '');

      if (loginToken) {
        // Look up the user by login token
        const hashedToken = Accounts._hashLoginToken(loginToken);
        const user = await Meteor.users.findOneAsync({
          "services.resume.loginTokens.hashedToken": hashedToken
        });
        if (user) {
          userId = user._id;
        }
      }

      // If no user found and image is private, deny access
      if (!userId) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Access denied: Authentication required for private images");
        return;
      }

      // Check if user can view this private image
      const { isSystemAdmin } = await import("../../api/accounts/RoleUtils");
      const { isSchoolAdmin } = await import("../../api/accounts/RoleUtils");

      let canView = false;

      // System admin can view all images
      if (await isSystemAdmin(userId)) {
        canView = true;
      }
      // Image uploader can view their own images
      else if (image.user === userId) {
        canView = true;
      }
      // School admin can view images in their school
      else if (image.school && await isSchoolAdmin(userId, image.school)) {
        canView = true;
      }

      if (!canView) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Access denied: You do not have permission to view this image");
        return;
      }
    }

    // Convert base64 to buffer
    let imageBuffer;
    try {
      if (Buffer.isBuffer(image.imageData)) {
        // Already a buffer
        imageBuffer = image.imageData;
      } else {
        // Convert base64 string to buffer
        imageBuffer = Buffer.from(image.imageData, "base64");
      }
    } catch (bufferError) {
      console.error("Error converting image data:", bufferError);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error: Invalid image data");
      return;
    }

    // Set proper headers
    res.writeHead(200, {
      "Content-Type": image.mimeType || "image/jpeg",
      "Content-Length": imageBuffer.length,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      "Content-Disposition": `inline; filename="${image.fileName || "image"}"`,
    });

    // Send image data
    res.end(imageBuffer);
  } catch (error) {
    console.error("Error serving image:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

// Health check endpoint
WebApp.connectHandlers.use("/health", (req, res, _next) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

// Client-side routing fallback for BrowserRouter
// Serve index.html for all client-side routes that don't match API endpoints or static files
WebApp.connectHandlers.use((req, res, next) => {
  // Skip if this is an API endpoint, static file, or already handled
  if (req.url.startsWith("/api") ||
      req.url.startsWith("/sockjs") ||
      req.url.startsWith("/packages") ||
      req.url.startsWith("/image") ||
      req.url.startsWith("/health") ||
      req.url.includes(".") || // Skip requests for files with extensions
      req.method !== "GET") {
    return next();
  }

  // For client-side routes, let Meteor handle serving the main HTML
  // This ensures BrowserRouter routes work properly
  next();
});
