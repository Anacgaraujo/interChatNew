// components/SyncUserOnLogin.tsx
import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export const SyncUserOnLogin = () => {
  const { isSignedIn } = useAuth();
  const createUserIfMissing = useMutation(api.users.createUserIfMissing);

  useEffect(() => {
    if (isSignedIn) {
      createUserIfMissing().catch(console.error);
    }
  }, [isSignedIn]);

  return null;
};
