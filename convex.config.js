//convex.config.js
import { defineConfig } from "convex/config";
import { clerkAuth } from "convex/auth/clerk";

export default defineConfig({
  auth: clerkAuth(),
});
