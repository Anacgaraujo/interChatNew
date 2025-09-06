import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // You should already have a 'users' table.
  // Add the 'preferredLanguage' field to it.
  users: defineTable({
    //   name: v.string(),
    //   username: v.optional(v.string()),
    //   imageUrl: v.optional(v.string()),
    //   email: v.string(),
    //   externalId: v.string(),
    //   isOnline: v.boolean(),
    //   phoneNumber: v.optional(v.string()),
    //   lastSeen: v.optional(v.number()),
    //   friends: v.array(v.id("users")), // Add this field
    //   preferredLanguage: v.optional(v.string()),
    //   searchableName: v.string(),
    // })
    //   .index("by_externalId", ["externalId"])
    //   .index("by_username", ["username"]) // Add this index
    //   .index("by_email", ["email"]) // Add this index
    //   .searchIndex("by_searchable_name", { searchField: "searchableName" }),

    externalId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
    friends: v.array(v.id("users")),
    isOnline: v.boolean(),
    lastSeen: v.optional(v.float64()),
    phoneNumber: v.optional(v.string()),
    searchableName: v.optional(v.string()), // 🔧 Make it optional here
    // Subscription fields
    isSubscribed: v.optional(v.boolean()),
    subscriptionExpiresAt: v.optional(v.number()),
    subscriptionProductId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_externalId", ["externalId"])
    .searchIndex("by_searchable_name", {
      searchField: "searchableName",
    }),

  // You likely have a 'chats' table like this. No changes needed here.
  chats: defineTable({
    participants: v.array(v.id("users")),
    isGroup: v.boolean(),
    name: v.optional(v.string()), // Add this field
    image: v.optional(v.string()), // Add this field
    combinedUserIds: v.optional(v.string()),
  })
    .index("by_participants", ["participants"]) // Add this index
    .index("by_combinedUserIds", ["combinedUserIds"]),

  // You likely have a 'messages' table. No changes needed here.
  messages: defineTable({
    content: v.string(),
    chatId: v.id("chats"),
    userId: v.id("users"),
    media: v.optional(
      v.array(
        v.object({
          // Added media field
          storageId: v.id("_storage"),
          type: v.string(),
          fileName: v.optional(v.string()),
          fileSize: v.optional(v.number()),
          mimeType: v.optional(v.string()),
          duration: v.optional(v.number()),
          dimensions: v.optional(
            v.object({
              width: v.number(),
              height: v.number(),
            })
          ),
        })
      )
    ),
  }).index("by_chatId", ["chatId"]), // Add this index

  // All table definitions must be properties of the object passed to defineSchema
  translations: defineTable({
    // Create this new table to store translations.
    messageId: v.id("messages"), // This acts as a cache to avoid re-translating messages.
    language: v.string(),
    text: v.string(),
  }).index("by_messageId_and_language", ["messageId", "language"]),

  stories: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("image"), v.literal("video"), v.literal("text")),
    content: v.object({
      storageId: v.id("_storage"),
      duration: v.optional(v.number()),
      dimensions: v.object({
        width: v.number(),
        height: v.number(),
      }),
    }),
    viewers: v.array(v.id("users")),
    storyGroupId: v.string(),
    sequence: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(), // Add this field
    expiresAt: v.number(), // Add this field
  }).index("by_user_and_expiration", ["userId", "expiresAt"]),

  // New subscriptions table to track payment history
  subscriptions: defineTable({
    userId: v.id("users"),
    productId: v.string(), // e.g., "chatol_monthly"
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
    price: v.number(), // Price in cents
    currency: v.string(), // e.g., "USD"
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_expiresAt", ["expiresAt"]),
});
