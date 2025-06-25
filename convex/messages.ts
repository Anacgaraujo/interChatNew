import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserById, userByExteRnalId } from "./users";
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
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("chatId"), chatId))
      .order("asc") // Order by creation time, assuming it's implicit or add a timestamp field
      .collect();

    const messagesWithUsers: MessageWithUser[] = await Promise.all(
      messages.map(
        async (message: Doc<"messages">): Promise<MessageWithUser> => {
          const user: Doc<"users"> | null = await getUserById(
            ctx,
            message.userId
          ); // Fetch user details
          // Assuming message also has a `media` field if it's a media message
          const media = message.media
            ? await Promise.all(
                message.media.map(async (m) => ({
                  ...m,
                  url: await ctx.runQuery(api.general.getMediaUrl, {
                    storageId: m.storageId,
                  }),
                }))
              )
            : undefined;
          return { ...message, user, media };
        }
      )
    );
    return messagesWithUsers;
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
    await ctx.db.insert("messages", {
      chatId,
      userId: user._id,
      content: text || "",
      media,
    });
  },
});

export const markMessageAsRead = mutation({
  args: { chatId: v.id("chats"), messageIds: v.array(v.id("messages")) },
  handler: async (ctx, { chatId, messageIds }) => {
    // This is a placeholder. You'll need to implement actual read receipts.
    // For example, you might have a 'readBy' array on messages or a separate 'readReceipts' table.
    // For now, we'll just acknowledge the call.
    console.log(
      `Marking messages as read in chat ${chatId}: ${messageIds.join(", ")}`
    );
    // Example: Update a read receipt for the current user in the chat document
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Not authenticated");
    // const currentUser = await userByExteRnalId(ctx, identity.subject);
    // await ctx.db.patch(chatId, { lastReadMessageId: messageIds[messageIds.length - 1] });
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const currentUser = await userByExteRnalId(ctx, identity.subject);
    if (!currentUser) throw new Error("User not found");

    // Example: Update messageStatus for each message
    for (const messageId of messageIds) {
      const existingStatus = await ctx.db
        .query("messageStatus")
        .withIndex("by_messageId_userId", (q) =>
          q.eq("messageId", messageId).eq("userId", currentUser._id)
        )
        .unique();

      if (existingStatus) {
        await ctx.db.patch(existingStatus._id, { isRead: true });
      } else {
        await ctx.db.insert("messageStatus", {
          messageId,
          userId: currentUser._id,
          isRead: true,
        });
      }
    }
  },
});
