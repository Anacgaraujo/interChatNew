//app/layout.tsx
import React from "react";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { router, Slot, useSegments, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { SubscriptionProvider } from "@/context/subscription-context";
import { View, Text, TouchableOpacity } from "react-native";
import "../global.css";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SyncUserOnLogin } from "@/components/SyncUserOnLogin";

// SplashScreen.preventAutoHideAsync(); // Optional: for a smoother loading experience
const convexClient = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!,
  {
    unsavedChangesWarning: false,
  }
);

// function Layout() {
//   const { isDark } = useTheme();
//   const { isSignedIn, isLoaded } = useAuth();
//   const segments = useSegments();

//   const createUserIfMissing = useMutation(api.users.createUserIfMissing);

//   useEffect(() => {
//     if (isSignedIn) {
//       createUserIfMissing().catch(console.error);
//     }
//   }, [isSignedIn]);

//   if (!isLoaded) return null;

//   useEffect(() => {
//     if (!isLoaded) return;
//     const inProtectedRoute = segments[0] === "(protected)";
//     if (isSignedIn && !inProtectedRoute) {
//       router.replace("/(protected)/(tabs)");
//     } else if (!isSignedIn && inProtectedRoute) {
//       router.replace("/");
//     }
//   }, [isSignedIn]);

//   return (
//     <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
//       <Slot />
//       <StatusBar style={isDark ? "light" : "dark"} />
//     </ConvexProviderWithClerk>
//   );
// }

// This component will be rendered inside ConvexProviderWithClerk
// and can use Convex hooks like useMutation.
function AppLayout() {
  const { isDark } = useTheme();
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const createUserIfMissing = useMutation(api.users.createUserIfMissing);

  const [isUserSynced, setIsUserSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAttempts, setSyncAttempts] = useState(0);

  if (!isLoaded) return null;

  // Effect for syncing user data with Convex
  useEffect(() => {
    if (isSignedIn && !isUserSynced && !isSyncing && syncAttempts < 3) {
      console.log("Starting user sync with Convex... (attempt", syncAttempts + 1, ")");
      setIsSyncing(true);
      createUserIfMissing()
        .then(() => {
          console.log("User successfully synced with Convex");
          setIsUserSynced(true);
        })
        .catch((error) => {
          console.error("Failed to sync user with Convex:", error);
          setSyncAttempts(prev => prev + 1);
          // If we've tried 3 times, give up and let the user proceed
          if (syncAttempts >= 2) {
            console.log("Giving up on user sync, allowing user to proceed");
            setIsUserSynced(true); // Force it to true to allow navigation
          }
        })
        .finally(() => setIsSyncing(false));
    }
  }, [isSignedIn, isUserSynced, isSyncing, createUserIfMissing, syncAttempts]);

  // Effect for handling navigation based on auth state
  useEffect(() => {
    if (!isLoaded) return;
    const inProtectedRoute = segments[0] === "(protected)";

    console.log("Navigation effect:", {
      isSignedIn,
      isUserSynced,
      inProtectedRoute,
      segments: segments.join("/"),
    });

    // If user is signed in, ensure they are in a protected route (regardless of sync status)
    if (isSignedIn) {
      if (!inProtectedRoute) {
        console.log("Redirecting to protected route");
        router.replace("/(protected)/(tabs)");
      }
    } else {
      // If user is not signed in, ensure they are in a public route
      if (inProtectedRoute) {
        console.log("Redirecting to public route");
        router.replace("/");
      }
      // Reset sync status on sign out
      if (isUserSynced || isSyncing) {
        setIsUserSynced(false);
        setIsSyncing(false);
        setSyncAttempts(0);
      }
    }
  }, [isLoaded, isSignedIn, segments]);

  // Show loader only while Clerk is loading or actively syncing
  if (!isLoaded || (isSignedIn && isSyncing)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      {/* <SyncUserOnLogin /> component is no longer needed here if its logic is integrated above */}
      <Slot />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ThemeProvider>
          <ConvexProviderWithClerk useAuth={useAuth} client={convexClient}>
            <SubscriptionProvider>
              <AppLayout />
            </SubscriptionProvider>
          </ConvexProviderWithClerk>
        </ThemeProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
