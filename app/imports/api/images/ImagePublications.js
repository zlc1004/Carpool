import { Meteor } from "meteor/meteor";
import { Images } from "./Images";

/** This subscription publishes image metadata (without image data) for admin users */
Meteor.publish("ImagesMetadata", async function () {
  if (this.userId) {
    const { isSystemAdmin } = await import("../accounts/RoleUtils");
    if (await isSystemAdmin(this.userId)) {
      return Images.find(
        {},
        {
          fields: {
            uuid: 1,
            sha256Hash: 1,
            fileName: 1,
            mimeType: 1,
            fileSize: 1,
            uploadedAt: 1,
            uploadedBy: 1,
            // Exclude imageData for performance
          },
        },
      );
    }
  }
  return this.ready();
});
