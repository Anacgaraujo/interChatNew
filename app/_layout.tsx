//app/layout.tsx
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { router, Slot, useSegments, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider, useTheme } from "@/context/theme-context";
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

  useEffect(() => {
    if (!isLoaded) return; // Should be redundant due to the check above, but good for safety

    const inProtectedRoute = segments[0] === "(protected)";

    if (isSignedIn) {
      // If user is signed in, try to sync them if not already synced or syncing
      if (!isUserSynced && !isSyncing) {
        setIsSyncing(true);
        createUserIfMissing()
          .then(() => {
            setIsUserSynced(true);
            // After successful sync, if not in a protected route, navigate.
            if (!inProtectedRoute) {
              router.replace("/(protected)/(tabs)");
            }
          })
          .catch((error) => {
            console.error("Failed to sync user with Convex:", error);
            // Handle error: maybe redirect to a generic error page or public page
            if (inProtectedRoute) router.replace("/");
          })
          .finally(() => {
            setIsSyncing(false);
          });
      } else if (isUserSynced && !inProtectedRoute) {
        // If user is already synced and not in a protected route, navigate.
        router.replace("/(protected)/(tabs)");
      }
    } else {
      // User is not signed in
      setIsUserSynced(false); // Reset sync status
      setIsSyncing(false); // Reset syncing status
      if (inProtectedRoute) {
        router.replace("/"); // Redirect from protected to public route
      }
    }
  }, [
    isLoaded,
    isSignedIn,
    segments,
    createUserIfMissing,
    isUserSynced,
    isSyncing,
  ]);

  // Show loader while Clerk is loading, or if user is signed in but still syncing/not_synced
  if (!isLoaded || (isSignedIn && (isSyncing || !isUserSynced))) {
    // Consider using your <Loader /> component if you have one for a better UX
    // e.g. import { Loader } from '@/components/loader'; return <Loader />;
    // SplashScreen.hideAsync(); // If you used preventAutoHideAsync
    return null; // Or a loading indicator
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
