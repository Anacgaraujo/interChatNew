import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values"; // This import is used
import { api, internal } from "./_generated/api"; // This import is used

export const getOrTranslateMessage = action({
  args: {
    messageId: v.id("messages"),
    targetLanguage: v.string(),
  },
  handler: async (
    ctx,
    { messageId, targetLanguage }
  ): Promise<string | null> => {
    // 1. Check if we have a cached translation already.
    const existing: { text: string } | null = await ctx.runQuery(
      internal.translate.get,
      {
        messageId,
        language: targetLanguage,
      }
    );
    if (existing) {
      return existing.text;
    }

    // 2. If not, get the original message content.
    const message: { content: string } | null = await ctx.runQuery(
      api.messages.getMessage,
      { messageId }
    );
    if (!message) {
      return null;
    }

    // 3. Call the Google Translate API.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is not set in Convex environment variables.");
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: message.content,
        target: targetLanguage,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Translation API failed: ${response.status} ${errorBody}`
      );
    }

    const result: { data: { translations: { translatedText: string }[] } } =
      await response.json();
    const translatedText: string = result.data.translations[0].translatedText;

    // 4. Store the new translation in our cache.
    await ctx.runMutation(internal.translate.store, {
      messageId,
      language: targetLanguage,
      text: translatedText,
    });

    return translatedText;
  },
});

// Internal helper to get a cached translation.
export const get = internalQuery({
  args: { messageId: v.id("messages"), language: v.string() },
  handler: async (ctx, { messageId, language }) => {
    return await ctx.db
      .query("translations")
      .withIndex("by_messageId_and_language", (q) =>
        q.eq("messageId", messageId).eq("language", language)
      )
      .unique();
  },
});

// Internal helper to store a new translation.
export const store = internalMutation({
  args: {
    messageId: v.id("messages"),
    language: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("translations", args);
  },
});

//Note: Ensure this module is exposed in `convex/api.ts` like `export * as translate from "./translate";`
