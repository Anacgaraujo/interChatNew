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
import { View, Text } from "react-native";
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

  if (!isLoaded) return null;

  // Effect for syncing user data with Convex
  useEffect(() => {
    if (isSignedIn && !isUserSynced && !isSyncing) {
      console.log("Starting user sync with Convex...");
      setIsSyncing(true);
      createUserIfMissing()
        .then(() => {
          console.log("User successfully synced with Convex");
          setIsUserSynced(true);
        })
        .catch((error) => {
          console.error("Failed to sync user with Convex:", error);
          // If user creation fails, try again after a short delay
          setTimeout(() => {
            setIsUserSynced(false);
            setIsSyncing(false);
          }, 1000);
        })
        .finally(() => setIsSyncing(false));
    }
  }, [isSignedIn, isUserSynced, isSyncing, createUserIfMissing]);

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

    // If user is signed in and synced, ensure they are in a protected route
    if (isSignedIn && isUserSynced) {
      if (!inProtectedRoute) {
        console.log("Redirecting to protected route");
        router.replace("/(protected)/(tabs)");
      }
    } else if (!isSignedIn) {
      // If user is not signed in, ensure they are in a public route
      if (inProtectedRoute) {
        console.log("Redirecting to public route");
        router.replace("/");
      }
      // Reset sync status on sign out
      if (isUserSynced || isSyncing) {
        setIsUserSynced(false);
        setIsSyncing(false);
      }
    }
  }, [isLoaded, isSignedIn, isUserSynced, segments]);

  // Show loader while Clerk is loading, or if user is signed in but still syncing/not_synced
  if (!isLoaded || (isSignedIn && (isSyncing || !isUserSynced))) {
    // Consider using your <Loader /> component if you have one for a better UX
    // e.g. import { Loader } from '@/components/loader'; return <Loader />;
    // SplashScreen.hideAsync(); // If you used preventAutoHideAsync
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
            <AppLayout />
          </ConvexProviderWithClerk>
        </ThemeProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
