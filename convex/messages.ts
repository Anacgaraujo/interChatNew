import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserById, userByExternalId } from "./users";
import { getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

type MessageWithUser = Doc<"messages"> & {
  user: Doc<"users"> | null;
  media?: (NonNullable<Doc<"messages">["media"]>[number] & {
    url: string | null;
  })[];
};

// Helper to get a single message by its ID.
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    return await ctx.db.get(messageId);
  },
});

export const getMessages = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }): Promise<MessageWithUser[]> => {
    // 1. Get all messages for the chat, using the index for performance.
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))
      .order("asc") // Order by creation time (_creationTime is the default)
      .collect();

    // 2. Collect all unique user IDs and media storage IDs to fetch them in batches.
    const userIds = new Set<Id<"users">>();
    const mediaStorageIds = new Set<Id<"_storage">>();

    messages.forEach((message) => {
      userIds.add(message.userId);
      if (message.media) {
        message.media.forEach((m) => mediaStorageIds.add(m.storageId));
      }
    });

    // 3. Fetch all users and media URLs in parallel.
    const usersPromise = Promise.all(
      Array.from(userIds).map((userId) => getUserById(ctx, userId))
    );
    const mediaUrlsPromise = Promise.all(
      Array.from(mediaStorageIds).map(async (storageId) => {
        const url = await ctx.storage.getUrl(storageId);
        return { storageId, url };
      })
    );

    const [users, mediaUrls] = await Promise.all([
      usersPromise,
      mediaUrlsPromise,
    ]);

    // 4. Create maps for easy and efficient lookup.
    const usersMap = new Map(
      users.filter(Boolean).map((user) => [user!._id, user!])
    );
    const mediaUrlsMap = new Map(
      mediaUrls.map(({ storageId, url }) => [storageId, url])
    );

    // 5. Combine all the data together.
    return messages.map((message) => {
      const user = usersMap.get(message.userId) ?? null;
      const media = message.media?.map((m) => ({
        ...m,
        url: mediaUrlsMap.get(m.storageId) ?? null,
      }));
      return { ...message, user, media };
    });
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    text: v.optional(v.string()),
    media: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          type: v.string(),
          fileName: v.optional(v.string()),
          fileSize: v.optional(v.number()),
          mimeType: v.optional(v.string()),
          duration: v.optional(v.number()),
          dimensions: v.optional(
            v.object({ width: v.number(), height: v.number() })
          ),
        })
      )
    ),
  },
  handler: async (ctx, { chatId, text, media }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // The `content` field is required by the schema.
    // We'll use the provided text, or an empty string for media-only messages.
    const messageId = await ctx.db.insert("messages", {
      content: text || "",
      userId: user._id,
      chatId,
      media,
    });

    // TODO: Implement message status tracking when messageStatus table is added back
    console.log(`Message sent: ${messageId}`);
  },
});

export const markMessageAsRead = mutation({
  args: { chatId: v.id("chats"), messageIds: v.array(v.id("messages")) },
  handler: async (ctx, { chatId, messageIds }) => {
    // TODO: Implement read receipts when messageStatus table is added back
    console.log(
      `Marking messages as read in chat ${chatId}: ${messageIds.join(", ")}`
    );
  },
});
