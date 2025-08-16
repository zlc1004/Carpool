import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import svgCaptcha from "svg-captcha";
import crypto from "crypto";
import { Captcha } from "./Captcha";

// Mongo collection for captchas
export const Captcha = new Mongo.Collection("captchas");

// Generate secure random token
function generateToken() {
  return crypto.randomBytes(32).toString("hex"); // 64-character hex
}

// Hash captcha answer
function hashAnswer(answer) {
  return crypto.createHash("sha256")
    .update(answer.toLowerCase().trim())
    .digest("hex");
}

if (Meteor.isServer) {
  // Unique token index
  Captcha.rawCollection().createIndex({ token: 1 }, { unique: true });

  // auto-expire after 10 minutes
  Captcha.rawCollection().createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 600 }
  );
}

Meteor.methods({
  async "captcha.generate"() {
    const captcha = svgCaptcha.create({
      size: 5,
      noise: 2,
      color: true,
      background: "#f0f0f0",
      width: 150,
      height: 50,
      fontSize: 40,
    });

    const token = generateToken();

    await Captcha.insertAsync({
      token,
      hash: hashAnswer(captcha.text),
      timestamp: new Date(),
      used: false,
      attempts: 0, // track failed attempts
    });

    return {
      token,
      svg: captcha.data,
    };
  },

  async "captcha.verify"(token, userInput) {
    check(token, String);
    check(userInput, String);

    const session = await Captcha.findOneAsync({ token });

    if (!session) {
      throw new Meteor.Error("invalid-captcha", "CAPTCHA not found or expired");
    }

    if (session.used) {
      throw new Meteor.Error("captcha-used", "CAPTCHA already used");
    }

    if (session.attempts >= 3) {
      // Auto-expire after too many attempts
      await Captcha.updateAsync({ token }, { $set: { used: true } });
      throw new Meteor.Error("too-many-attempts", "CAPTCHA invalidated due to too many failed attempts");
    }

    const isValid = session.hash === hashAnswer(userInput);

    if (isValid) {
      await Captcha.updateAsync({ token }, { $set: { used: true } });
    } else {
      await Captcha.updateAsync(
        { token },
        { $inc: { attempts: 1 } }
      );
    }

    return isValid;
  },
});
