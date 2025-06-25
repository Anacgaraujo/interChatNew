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

  await ctx.db.insert("users", {
    externalId: identity.subject,
    email: identity.email ?? "",
    name: identity.name ?? identity.subject,
    imageUrl: identity.pictureUrl,
    friends: [], // Initialize friends as an empty array
    isOnline: false,
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
      .withIndex("by_username", (q) => q.eq("username", args.username)); // Use by_username index      .first();

    if (existingUsername) {
      throw new Error("Username already exists");
    }

    const existingEmail = await ctx.db
      .query("users") // Corrected index
      .withIndex("by_email", (q) => q.eq("email", args.email)); // Use by_email index      .first();

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

    const userId = await ctx.db.insert("users", {
      // Corrected insert
      externalId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      username: args.username || args.name, // Use provided username or default to name
      preferredLanguage: args.preferredLanguage,
      friends: [], // Initialize friends as an empty array
      isOnline: false, // Default to offline
    });

    return userId;
  },
});

export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    const user = await ctx.db
      .query("users") // Corrected index
      .withIndex("by_externalId", (q) => q.eq("externalId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.imageUrl || user.imageUrl.startsWith("http")) {
      // This logic might need review if imageUrl is always a storageId
      return user;
    }

    const url: string | null = await ctx.runQuery(api.general.getMediaUrl, {
      storageId: user.imageUrl as Id<"_storage">,
    }); // Corrected typo and usage

    return {
      ...user,
      imageUrl: url ?? undefined, // Coalesce null to undefined
    };
  },
});

export const getUserById = async (
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Doc<"users"> | null> => {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.imageUrl || user.imageUrl.startsWith("http")) {
    return user;
  }

  const url: string | null = await ctx.runQuery(api.general.getMediaUrl, {
    storageId: user.imageUrl as Id<"_storage">,
  });
  return {
    ...user,
    imageUrl: url ?? undefined, // Coalesce null to undefined
  };
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
  // Assuming userByExteRnalId is meant to fetch by the externalId (Clerk ID)
  return userByExteRnalId(ctx, identity.subject); // Corrected typo
};

export const userByExteRnalId = async (ctx: QueryCtx, externalId: string) => {
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

    const searchQuery = args.query.toLowerCase().trim();

    if (!searchQuery) return [];

    const allUsers = await ctx.db.query("users").collect();

    // filters

    const filteredUsers = allUsers.filter((user) => {
      if (user._id === currentUser._id) return false;

      return (
        (user.email && user.email.toLowerCase().includes(searchQuery)) ||
        (user.name && user.name.toLowerCase().includes(searchQuery)) ||
        (user.username && user.username.toLowerCase().includes(searchQuery)) ||
        (user.phoneNumber &&
          user.phoneNumber.toLowerCase().includes(searchQuery))
      );
    });

    filteredUsers.sort((a, b) => {
      const aExactUser =
        a.email?.toLowerCase() === searchQuery ||
        a.name?.toLowerCase() === searchQuery ||
        a.username?.toLowerCase() === searchQuery ||
        a.phoneNumber?.toLowerCase() === searchQuery;

      const bExactUser =
        b.email?.toLowerCase() === searchQuery ||
        b.name?.toLowerCase() === searchQuery ||
        b.username?.toLowerCase() === searchQuery ||
        b.phoneNumber?.toLowerCase() === searchQuery;

      if (aExactUser && !bExactUser) return -1;
      if (!aExactUser && bExactUser) return 1;

      return a.name.localeCompare(b.name);
    });

    const first20Users = filteredUsers.slice(0, 20);

    const userList = await Promise.all(
      first20Users.map(async (user) => {
        if (user.imageUrl && user.imageUrl.startsWith("http")) {
          return user;
        }

        const url = await ctx.storage.getUrl(user.imageUrl as Id<"_storage">);

        return {
          ...user,
          imageUrl: url,
        };
      })
    );

    return userList;
  },
});
