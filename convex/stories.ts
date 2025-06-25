import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { getCurrentUserOrThrow, getUserById } from "./users";
import { api } from "./_generated/api";

export const createStory = mutation({
  args: {
    type: v.union(v.literal("image"), v.literal("video"), v.literal("text")),
    content: v.object({
      storageId: v.id("_storage"),
      duration: v.optional(v.number()),
      dimensions: v.object({
        width: v.number(),
        height: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const latestStory = await ctx.db
      .query("stories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id)) // Corrected index name
      .order("desc")
      .first();

    const sequence = (latestStory?.sequence ?? 0) + 1;
    const now = Date.now();

    const expiresAt = now + 24 * 60 * 60 * 1000;

    return await ctx.db.insert("stories", {
      userId: user._id,
      type: args.type,
      content: args.content,
      createdAt: now,
      expiresAt,
      viewers: [],
      isActive: true,
      sequence,
      storyGroupId: `${user._id}_${now}`,
    });
  },
});

// Define a type for stories with user details and media URL
type StoryWithMedia = Doc<"stories"> & {
  user: Doc<"users"> | null;
  content: Doc<"stories">["content"] & { media?: string | null };
};

export const getStories = query({
  args: {
    friends: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    args
  ): Promise<Record<Id<"users">, StoryWithMedia[]>> => {
    const user = await getCurrentUserOrThrow(ctx);

    const now = Date.now();

    // Combine the current user ID and their friends' IDs
    const friendsId: Id<"users">[] = [user._id, ...(user.friends ?? [])];

    // Query stories for each user in parallel
    const storiesPromises = friendsId.map((friendId: Id<"users">) =>
      ctx.db
        .query("stories")
        .withIndex("by_userId", (q) => q.eq("userId", friendId)) // Use the correct index
        .filter((q) => q.gt(q.field("expiresAt"), now))
        .collect()
    );

    // Wait for all queries to complete
    const storiesArrays: Doc<"stories">[][] =
      await Promise.all(storiesPromises);

    // Flatten the array of arrays into a single array
    const stories: Doc<"stories">[] = storiesArrays.flat();

    // Get media for each story
    const storyWithMedia: StoryWithMedia[] = await Promise.all(
      stories.map(async (story: Doc<"stories">): Promise<StoryWithMedia> => {
        const [mediaUrl, userDetails]: [string | null, Doc<"users"> | null] =
          await Promise.all([
            story.content.storageId
              ? ctx.runQuery(api.general.getMediaUrl, {
                  storageId: story.content.storageId,
                })
              : null,
            getUserById(ctx, story.userId),
          ]);

        return {
          ...story,
          content: {
            ...story.content,
            media: mediaUrl,
          },
          user: userDetails, // userDetails can be null
        };
      })
    );

    // Group stories by user
    const storiesByUser: Record<
      Id<"users">,
      StoryWithMedia[]
    > = storyWithMedia.reduce(
      (acc: Record<Id<"users">, StoryWithMedia[]>, story: StoryWithMedia) => {
        if (!acc[story.userId]) {
          acc[story.userId] = [];
        }
        acc[story.userId].push(story);
        return acc;
      },
      {} as Record<Id<"users">, StoryWithMedia[]>
    );

    // Sort stories by sequence within each user's group
    Object.keys(storiesByUser).forEach((userId) => {
      // userId is a string here, cast it to Id<"users"> for indexing
      storiesByUser[userId as Id<"users">].sort(
        (a: StoryWithMedia, b: StoryWithMedia) => a.sequence - b.sequence
      );
    });

    return storiesByUser;
  },
});

export const markStoryAsViewed = mutation({
  args: {
    storyId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const story = await ctx.db.get(args.storyId as Id<"stories">);

    if (!story) {
      throw new Error("Story not found");
    }

    if (story.viewers.includes(user._id)) {
      return;
    }

    if (story.isActive && !story.viewers.includes(user._id)) {
      await ctx.db.patch(args.storyId as Id<"stories">, {
        viewers: [...story.viewers, user._id],
      });
    }

    return { success: true };
  },
});

export const deleteExpiredStories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // get all expired stories
    const expiredStories = await ctx.db
      .query("stories")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // delete each image
    for (const story of expiredStories) {
      if (story.content.storageId) {
        await ctx.storage.delete(story.content.storageId as Id<"_storage">);
      }

      await ctx.db.delete(story._id as Id<"stories">);
    }
    console.log(`Deleted ${expiredStories.length} expired stories`);
    return `Deleted ${expiredStories.length} expired stories`;
  },
});
