import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// Get current user's subscription status
export const getCurrentUserSubscription = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const activeSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return {
      isSubscribed: user.isSubscribed || false,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionProductId: user.subscriptionProductId,
      activeSubscription,
    };
  },
});

// Update user subscription status
export const updateUserSubscription = mutation({
  args: {
    isSubscribed: v.boolean(),
    subscriptionExpiresAt: v.optional(v.number()),
    subscriptionProductId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await ctx.db.patch(user._id, {
      isSubscribed: args.isSubscribed,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
      subscriptionProductId: args.subscriptionProductId,
    });
  },
});

// Create or update subscription record
export const createSubscription = mutation({
  args: {
    productId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("pending")
    ),
    purchaseDate: v.number(),
    expiresAt: v.number(),
    originalTransactionId: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    price: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.eq(q.field("originalTransactionId"), args.originalTransactionId)
      )
      .first();

    if (existingSubscription) {
      // Update existing subscription
      await ctx.db.patch(existingSubscription._id, {
        status: args.status,
        expiresAt: args.expiresAt,
        price: args.price,
      });
    } else {
      // Create new subscription
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        productId: args.productId,
        status: args.status,
        purchaseDate: args.purchaseDate,
        expiresAt: args.expiresAt,
        originalTransactionId: args.originalTransactionId,
        platform: args.platform,
        price: args.price,
        currency: args.currency,
      });
    }

    // Update user subscription status
    await ctx.db.patch(user._id, {
      isSubscribed: args.status === "active",
      subscriptionExpiresAt: args.expiresAt,
      subscriptionProductId: args.productId,
    });
  },
});

// Get subscription history for user
export const getSubscriptionHistory = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return subscriptions;
  },
});

// Check if user has active subscription
export const hasActiveSubscription = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!user.isSubscribed) {
      return false;
    }

    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < Date.now()) {
      return false;
    }

    return true;
  },
});
