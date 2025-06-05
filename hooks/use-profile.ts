import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@clerk/clerk-expo";

export function useProfile() {
  const { user } = useUser();

  const clerkId = user?.id;

  const profile = useQuery(
    api.users.getUserByClerkId,
    clerkId ? { clerkId } : "skip"
  );

  return profile ?? null;
}
