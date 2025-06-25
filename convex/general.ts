import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// This is a general utility to get a media URL from a storage ID.
// It's used by the `getMessages` query to resolve media URLs for display.
export const getMediaUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
});

// This mutation generates a URL for uploading files to Convex storage.
export const generateUploadURL = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});
