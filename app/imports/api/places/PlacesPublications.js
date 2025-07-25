import { Meteor } from "meteor/meteor";
import { Places } from "./Places";
import { Rides } from "../ride/Rides";

/**
 * Publish places that the current user created or places used in their rides
 */
Meteor.publish("places.mine", async function publishMyPlaces() {
  if (!this.userId) {
    return this.ready();
  }

  const currentUser = await Meteor.users.findOneAsync(this.userId);

  // Find rides where user is driver or rider
  const userRides = await Rides.find({
    $or: [{ driver: currentUser.username }, { riders: currentUser.username }],
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
      createdAt: 1,
      updatedAt: 1,
      createdBy: 1,
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
  if (
    !currentUser ||
    !currentUser.roles ||
    !currentUser.roles.includes("admin")
  ) {
    throw new Meteor.Error("access-denied", "Admin access required");
  }

  return Places.find(
    {},
    {
      fields: {
        _id: 1,
        text: 1,
        value: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
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
  const isAdmin =
    currentUser && currentUser.roles && currentUser.roles.includes("admin");

  let query;

  if (isAdmin) {
    query = {};
  } else {
    // Find rides where user is driver or rider
    const userRides = await Rides.find({
      $or: [{ driver: currentUser.username }, { riders: currentUser.username }],
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
    },
    sort: { text: 1 },
  });
});
