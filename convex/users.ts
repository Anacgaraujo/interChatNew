//convex/users.ts
import { v } from "convex/values";
import {
  internalMutation,
  query,
  QueryCtx,
  mutation,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getMediaUrl } from "./general"; // Corrected typo
import { api } from "./_generated/api";

export const updateUser = mutation({
  args: {
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject)) // Corrected index
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      preferredLanguage: args.preferredLanguage,
    });
  },
});

export const createUserIfMissing = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const existingUser = await ctx.db
    .query("users") // Corrected index
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  if (existingUser) return;

  const name = identity.name ?? identity.subject;
  const email = identity.email ?? "";

  await ctx.db.insert("users", {
    externalId: identity.subject,
    email,
    name,
    imageUrl: identity.pictureUrl,
    friends: [], // Initialize friends as an empty array
    isOnline: false,
    searchableName: [name, identity.preferredUsername, email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  });
});

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUsername = await ctx.db
      .query("users") // Corrected index
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername) {
      throw new Error("Username already exists");
    }

    const existingEmail = await ctx.db
      .query("users") // Corrected index
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const existingClerkId = await ctx.db
      .query("users") // Corrected index
      .withIndex("by_externalId", (q) => q.eq("externalId", args.clerkId))
      .first();

    if (existingClerkId) {
      throw new Error("Clerk ID already exists");
    }

    const searchableName = [args.name, args.username, args.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const userId = await ctx.db.insert("users", {
      // Corrected insert
      externalId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      username: args.username || args.name, // Use provided username or default to name
      searchableName,
      preferredLanguage: args.preferredLanguage,
      friends: [], // Initialize friends as an empty array
      isOnline: false, // Default to offline
    });

    return userId;
  },
});

const withImageUrl = async (ctx: QueryCtx, user: Doc<"users">) => {
  // If imageUrl is missing or is already a full URL, return the user as is.
  if (!user.imageUrl || user.imageUrl.startsWith("http")) {
    return user;
  }
  // Otherwise, it's a storageId. Get the URL.
  const url = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">);
  return {
    ...user,
    imageUrl: url ?? undefined,
  };
};

export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.clerkId))
      .unique();

    if (!user) {
      return null;
    }

    return withImageUrl(ctx, user);
  },
});

export const getUserById = async (
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Doc<"users"> | null> => {
  const user = await ctx.db.get(userId);

  if (!user) {
    return null;
  }

  return withImageUrl(ctx, user);
};

// CHECK IDENTITY

export const current = query({
  args: {},
  handler: async (ctx, args) => {
    return await getCurrentUser(ctx);
  },
});

export const getCurrentUser = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized");
  }

  // Try to get the user by external ID
  const user = await userByExternalId(ctx, identity.subject);

  // If user doesn't exist, throw an error - this should be handled by the client
  if (!user) {
    throw new Error("User not found - please try logging in again");
  }

  return user;
};

export const userByExternalId = async (ctx: QueryCtx, externalId: string) => {
  return await ctx.db // Corrected index
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .unique();
};

export const getCurrentUserOrThrow = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrThrow(ctx);

    const searchQuery = args.query.trim();

    if (!searchQuery) return [];

    const users = await ctx.db
      .query("users")
      .withSearchIndex("by_searchable_name", (q) =>
        q.search("searchableName", searchQuery)
      )
      .filter((q) => q.neq(q.field("_id"), currentUser._id))
      .take(20);

    return Promise.all(users.map((user) => withImageUrl(ctx, user)));
  },
});
