import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow, getUserById } from "./users";
import { Doc, Id } from "./_generated/dataModel";

export const createChat = mutation({
  args: {
    participants: v.array(v.string()),
    name: v.optional(v.string()),
    isGroup: v.optional(v.boolean()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const allParticipants = [...new Set([...args.participants, user._id])];

    // user1_user2 user2_user1
    if (!args.isGroup) {
      const existingChat = await ctx.db
        .query("chats")
        .filter((q) =>
          q.or(
            q.eq(q.field("combinedUserIds"), allParticipants.sort().join("_")), // Use combinedUserIds field
            q.eq(
              q.field("combinedUserIds"), // Use combinedUserIds field
              allParticipants.sort().reverse().join("_")
            )
          )
        )
        .first();

      if (existingChat) {
        return existingChat._id;
      }
    }

    const combinedUserIds = allParticipants.sort().join("_");
    const chatId = await ctx.db.insert("chats", {
      combinedUserIds,
      name: args.name || "",
      isGroup: args.isGroup || false,
      participants: allParticipants as Id<"users">[], // Cast to Id<"users">[]
      // createdBy: user._id, // Not in schema
      // createdAt: Date.now(), // Not in schema
      // updatedAt: Date.now(), // Not in schema
    });

    return chatId;
  },
});

type ChatWithDetails = Doc<"chats"> & {
  lastMessage: Doc<"messages"> | null;
  participantsInfo: (Doc<"users"> | null)[];
  unreadCount: number;
  name: string;
  image: string;
};

export const getChats = query({
  args: {},
  handler: async (ctx): Promise<ChatWithDetails[]> => {
    try {
      const user = await getCurrentUserOrThrow(ctx);

      if (!user) {
        return [];
      }

      const rawChats = await ctx.db
        .query("chats")
        .withIndex("by_participants", (q) =>
          q.eq("participants", user._id as any)
        )
        .order("desc")
        .collect();

      const chatsWithLastMessage = await Promise.all(
        rawChats.map(async (chat): Promise<ChatWithDetails> => {
          const lastMessage = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
            .order("desc")
            .first();

          const participantsInfo: (Doc<"users"> | null)[] = await Promise.all(
            chat.participants
              .filter((id) => id !== user._id)
              .map(async (userId) => {
                return await getUserById(ctx, userId);
              })
          );

          const chatName: string =
            (chat.isGroup ? chat.name : participantsInfo[0]?.name) || "Unknown";

          const chatImage: string =
            (chat.isGroup ? chat.image : participantsInfo[0]?.imageUrl) || "";

          // TODO: Implement unread count when messageStatus table is added back
          const unreadCount = 0;

          return {
            ...chat,
            name: chatName,
            image: chatImage,
            lastMessage,
            participantsInfo,
            unreadCount,
          };
        })
      );

      return chatsWithLastMessage;
    } catch (error) {
      console.error("Error in getChats:", error);
      return [];
    }
  },
});

type ChatByIdResult = Doc<"chats"> & {
  name: string;
  image: string;
  participantsInfo: (Doc<"users"> | null)[];
};

export const getChatById = query({
  args: {
    id: v.id("chats"),
  },
  handler: async (ctx, args): Promise<ChatByIdResult | null> => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!user) {
      return null;
    }

    const chat = await ctx.db.get(args.id);

    if (!chat) {
      return null;
    }

    if (!chat.participants.includes(user._id)) {
      throw new ConvexError("You are not a participant of this chat");
    }

    const participantsInfo: (Doc<"users"> | null)[] = await Promise.all(
      chat.participants.map(async (userId) => {
        return await getUserById(ctx, userId);
      })
    );

    const chatName: string =
      (chat.isGroup ? chat.name : participantsInfo[0]?.name) || "Unknown";

    const chatImage: string =
      (chat.isGroup ? chat.image : participantsInfo[0]?.imageUrl) || "";

    return {
      ...chat,
      name: chatName,
      image: chatImage,
      participantsInfo,
    };
  },
});
