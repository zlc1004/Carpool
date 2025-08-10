import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import svgCaptcha from "svg-captcha";
import crypto from "crypto";
import { Captcha } from "./Captcha";

Meteor.methods({
  async "captcha.generate"() {
    // Generate CAPTCHA
    const captcha = svgCaptcha.create({
      size: 5,
      noise: 2,
      color: true,
      background: "#f0f0f0",
      width: 150,
      height: 50,
      fontSize: 40,
    });

    // Hash the CAPTCHA text so it’s not stored in plain text
    const captchaHash = crypto
      .createHash("sha256")
      .update(captcha.text.toLowerCase())
      .digest("hex");

    // Generate secure random session token (not predictable)
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Store CAPTCHA (expires after 10 minutes)
    await Captcha.insertAsync({
      token: sessionToken,
      hash: captchaHash,
      timestamp: Date.now(),
      used: false,
    });

    // Cleanup expired CAPTCHAs
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    await Captcha.removeAsync({ timestamp: { $lt: tenMinutesAgo } });

    return {
      sessionToken,
      svg: captcha.data,
    };
  },

  async "captcha.verify"(sessionToken, userInput) {
    check(sessionToken, String);
    check(userInput, String);

    const session = await Captcha.findOneAsync({ token: sessionToken });
    if (!session) {
      throw new Meteor.Error("invalid-captcha", "CAPTCHA session not found or expired");
    }

    // Check expiration
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    if (session.timestamp < tenMinutesAgo) {
      await Captcha.removeAsync({ token: sessionToken });
      throw new Meteor.Error("expired-captcha", "CAPTCHA has expired");
    }

    // Prevent reuse
    if (session.used) {
      throw new Meteor.Error("captcha-reused", "CAPTCHA has already been used");
    }

    // Compare hashed input
    const inputHash = crypto
      .createHash("sha256")
      .update(userInput.toLowerCase())
      .digest("hex");

    const isValid = session.hash === inputHash;

    // Mark as used regardless of success to block brute force
    await Captcha.updateAsync(session._id, { $set: { used: true } });

    // Cleanup expired CAPTCHAs
    await Captcha.removeAsync({ timestamp: { $lt: tenMinutesAgo } });

    return isValid;
  },
});
