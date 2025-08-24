import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { Schools } from "./Schools";

/**
 * Publish all active schools (public info only)
 */
Meteor.publish("schools.active", function publishActiveSchools() {
  return Schools.find(
    { isActive: true },
    {
      fields: {
        name: 1,
        shortName: 1,
        code: 1,
        location: 1,
        settings: 1,
      },
      sort: { name: 1 },
    },
  );
});

/**
 * Publish all schools (system admins only)
 */
Meteor.publish("schools.all", async function publishAllSchools() {
  const user = await Meteor.users.findOneAsync(this.userId);
  if (!user || !user.roles?.includes("system")) {
    return this.ready();
  }

  return Schools.find({}, { sort: { name: 1 } });
});

/**
 * Publish single school by ID
 */
Meteor.publish("schools.byId", function publishSchoolById(schoolId) {
  check(schoolId, String);

  return Schools.find(
    { _id: schoolId, isActive: true },
    {
      fields: {
        name: 1,
        shortName: 1,
        code: 1,
        location: 1,
        settings: 1,
      },
    },
  );
});
