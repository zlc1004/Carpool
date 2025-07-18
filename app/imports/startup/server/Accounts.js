import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { isCaptchaSolved, useCaptcha, Captcha } from "../../api/captcha/Captcha";

/* eslint-disable no-console */

Accounts.validateLoginAttempt(async (attempt) => {
  if (!attempt.allowed) {
    return false;
  }
  if (attempt.type === "password") {
    if (attempt.meathodName !== "verifyEmail") {
      return attempt.allowed;
    }
    const captchaSessionId =
      attempt.methodArguments[0].password.captchaSessionId;
    if (captchaSessionId === undefined) {
      throw new Meteor.Error(400, "Match failed");
    }
    check(captchaSessionId, String);
    const captchaSolved = await isCaptchaSolved(captchaSessionId);
    if (!captchaSolved) {
      throw new Meteor.Error("invalid-captcha", "CAPTCHA not solved");
    }
    await useCaptcha(captchaSessionId);
    return true;
  }
  return true;
});

Accounts.validateNewUser(async (user) => {
  // Validate captcha for new user registration
  const captchaSessionId = user.captchaSessionId || user.profile?.captchaSessionId;
  if (captchaSessionId === undefined) {
    throw new Meteor.Error(
      "captcha-required",
      "CAPTCHA session ID required for registration",
    );
  }
  check(captchaSessionId, String);
  const captchaSolved = await isCaptchaSolved(captchaSessionId);
  if (!captchaSolved) {
    throw new Meteor.Error("invalid-captcha", "CAPTCHA not solved");
  }
  await useCaptcha(captchaSessionId);

  // Remove captchaSessionId from user object before storing
  delete user.captchaSessionId;  // eslint-disable-line
  return true;
});

async function createUser(email, firstName, lastName, password, role) {
  const captchaSessionId = await Captcha.insertAsync({
      text: "dummy-captcha-text",
      timestamp: Date.now(),
      solved: true,
      used: false,
    });
  console.log(`  Created dummy captcha session ID: ${captchaSessionId}`);
  console.log(`  Creating user ${email}.`);
  const userID = Accounts.createUser({
    username: email,
    profile: {
      firstName: firstName,
      lastName: lastName,
      captchaSessionId: captchaSessionId,
    },
    email: email,
    password: password,
    captchaSessionId: captchaSessionId,
  });
  if (role === "admin") {
    console.log(`  Assigning admin role to user ${email} with ID ${userID}`);
    // Add admin role directly to user document
    await Meteor.users.updateAsync(userID, {
      $addToSet: { roles: ["admin"] },
    });
    console.log(`  Admin role assignment completed for user ${email}`);
  }
}

/** When running app for first time, pass a settings file to set up a default user account. */
Meteor.startup(async () => {
  if ((await Meteor.users.find().countAsync()) === 0) {
    if (Meteor.settings.defaultAccounts) {
      console.log("Creating the default user(s)");
      for (const { email, firstName, lastName, password, role } of Meteor  // eslint-disable-line
        .settings.defaultAccounts) {
        await createUser(email, firstName, lastName, password, role);
      }
    } else {
      console.log(
        "Cannot initialize the database!  Please invoke meteor with a settings file.",
      );
    }
  }
});

Accounts.emailTemplates.resetPassword.from = () => "Carpool Password Reset <no-reply@carpool.com>";
