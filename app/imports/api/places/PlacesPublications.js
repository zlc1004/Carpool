/* eslint-disable consistent-return */
import { Meteor } from "meteor/meteor";
import { Places } from "./Places";
import { Rides } from "../ride/Rides";

/**
 * Publish places that the current user created or places used in their rides
 * Rate limited to prevent performance issues and DoS attacks
 */
Meteor.publish("places.mine", async function publishMyPlaces() {
  if (!this.userId) {
    this.ready();
    return;
  }

  // Rate limit to 1 call per 3 seconds to prevent DoS attacks (fixes V021)
  // Syncs to database for persistence across server restarts
  const canProceed = await Meteor.callAsync("rateLimit.checkCall", "places.mine", 3000);
  if (!canProceed) {
    this.ready();
    return;
  }

  // Find rides where user is driver or rider
  const userRides = await Rides.find({
    $or: [{ driver: this.userId }, { riders: this.userId }],
  }).fetchAsync();

  // Extract unique place IDs from origin and destination
  const placeIds = new Set();
  userRides.forEach((ride) => {
    if (ride.origin) placeIds.add(ride.origin);
    if (ride.destination) placeIds.add(ride.destination);
  });

  // Query for places created by user OR used in their rides
  const query = {
    $or: [{ createdBy: this.userId }, { _id: { $in: Array.from(placeIds) } }],
  };

  return Places.find(query, {
    fields: {
      _id: 1,
      text: 1,
      value: 1,
      createdBy: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  });
});

/**
 * Publish all places for admin users with creator information
 */
Meteor.publish("places.admin", async function publishAllPlaces() {
  if (!this.userId) {
    return this.ready();
  }

  const currentUser = await Meteor.users.findOneAsync(this.userId);
  const { isSystemAdmin, isSchoolAdmin } = await import("../accounts/RoleUtils");

  const isSystem = await isSystemAdmin(this.userId);
  const isSchool = await isSchoolAdmin(this.userId);

  if (!isSystem && !isSchool) {
    throw new Meteor.Error("access-denied", "Admin access required");
  }

  // System admins see all places, school admins only see their school's places
  const filter = isSystem ? {} : { schoolId: currentUser.schoolId };

  return Places.find(
    filter,
    {
      fields: {
        _id: 1,
        text: 1,
        value: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        schoolId: 1,
      },
    },
  );
});

/**
 * Publish places for dropdown options - only returns id, text, value
 * Users see their own places plus places used in rides they're involved in, admins see all
 */
Meteor.publish("places.options", async function publishPlaceOptions() {
  if (!this.userId) {
    return this.ready();
  }

  const currentUser = await Meteor.users.findOneAsync(this.userId);
  const { isSystemAdmin, isSchoolAdmin } = await import("../accounts/RoleUtils");
  const isAdmin = await isSystemAdmin(this.userId) || await isSchoolAdmin(this.userId);

  let query;

  if (isAdmin) {
    query = {};
  } else {
    // Find rides where user is driver or rider
    const userRides = await Rides.find({
      $or: [{ driver: this.userId }, { riders: this.userId }],
    }).fetchAsync();

    // Extract unique place IDs from origin and destination
    const placeIds = new Set();
    userRides.forEach((ride) => {
      if (ride.origin) placeIds.add(ride.origin);
      if (ride.destination) placeIds.add(ride.destination);
    });

    // Query for places created by user OR used in their rides
    query = {
      $or: [{ createdBy: this.userId }, { _id: { $in: Array.from(placeIds) } }],
    };
  }

  return Places.find(query, {
    fields: {
      _id: 1,
      text: 1,
      value: 1,
      createdBy: 1,
      createdAt: 1,
      updatedAt: 1,
    },
    sort: { text: 1 },
  });
});
