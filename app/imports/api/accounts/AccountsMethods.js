import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { isCaptchaSolved, useCaptcha } from "../captcha/Captcha";
import { isEmailVerified } from "./Accounts";
import { Profiles } from "../profile/Profile";

Meteor.methods({
  async "accounts.email.send.verification"(captchaSessionId) {
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error("not-logged-in", "Please login first");
    }

    if (await isEmailVerified(userId)) {
      throw new Meteor.Error(
        "email-already-verified",
        "Your email is already verified",
      );
    }

    // Verify captcha
    check(captchaSessionId, String);
    if (!(await isCaptchaSolved(captchaSessionId))) {
      throw new Meteor.Error(
        "captcha-not-solved",
        "Please complete the security verification",
      );
    }

    // Use the captcha (invalidate it)
    await useCaptcha(captchaSessionId);

    const result = await Accounts.sendVerificationEmail(userId);
    return result;
  },

  async "users.remove"(userId) {
    check(userId, String);

    // Check if user is admin
    const user = await Meteor.userAsync();
    if (!user || !user.roles || !user.roles.includes("admin")) {
      throw new Meteor.Error(
        "access-denied",
        "You must be an admin to delete users"
      );
    }

    // Prevent self-deletion
    if (userId === Meteor.userId()) {
      throw new Meteor.Error(
        "invalid-operation",
        "You cannot delete your own account"
      );
    }

    await Meteor.users.removeAsync(userId);
  },

  async "users.update"(userId, updateData) {
    check(userId, String);
    check(updateData, {
      username: String,
      profileName: String,
      email: String,
      emailVerified: Boolean,
    });

    // Check if user is admin
    const user = await Meteor.userAsync();
    if (!user || !user.roles || !user.roles.includes("admin")) {
      throw new Meteor.Error(
        "access-denied",
        "You must be an admin to edit users"
      );
    }

    // Update user data including email and verification status
    await Meteor.users.updateAsync(userId, {
      $set: {
        username: updateData.username,
        "emails.0.address": updateData.email,
        "emails.0.verified": updateData.emailVerified,
      },
    });

    // Update or create profile with the new name
    if (updateData.profileName.trim()) {
      const existingProfile = await Profiles.findOneAsync({ Owner: userId });

      if (existingProfile) {
        // Update existing profile
        await Profiles.updateAsync(existingProfile._id, {
          $set: { Name: updateData.profileName.trim() },
        });
      } else {
        // Create new profile if it doesn't exist
        await Profiles.insertAsync({
          Name: updateData.profileName.trim(),
          Location: "",
          Image: "",
          Ride: "",
          Phone: "",
          Other: "",
          UserType: "Both",
          Owner: userId,
        });
      }
    }
  },

  async "users.toggleAdmin"(userId, action) {
    check(userId, String);
    check(action, String);

    // Check if user is admin
    const user = await Meteor.userAsync();
    if (!user || !user.roles || !user.roles.includes("admin")) {
      throw new Meteor.Error(
        "access-denied",
        "You must be an admin to modify user roles"
      );
    }

    // Prevent removing admin role from self
    if (userId === Meteor.userId() && action === "remove") {
      throw new Meteor.Error(
        "invalid-operation",
        "You cannot remove admin role from yourself"
      );
    }

    if (action === "add") {
      await Meteor.users.updateAsync(userId, { $addToSet: { roles: "admin" } });
    } else if (action === "remove") {
      await Meteor.users.updateAsync(userId, { $pull: { roles: "admin" } });
    }
  },

  async "users.getUsername"(userId) {
    check(userId, String);

    // Only logged-in users can fetch usernames
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-logged-in", "Please login first");
    }

    const user = await Meteor.users.findOneAsync(userId, {
      fields: { username: 1 }
    });

    return user?.username || null;
  },
});
