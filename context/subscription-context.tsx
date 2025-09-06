import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Purchases, { PurchasesOffering } from "react-native-purchases";

interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  purchaseSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  subscriptionExpiresAt: number | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};

export const SubscriptionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  // Get subscription status from Convex
  const subscriptionData = useQuery(
    api.subscriptions.getCurrentUserSubscription,
    isSignedIn ? undefined : "skip"
  );

  const createSubscriptionMutation = useMutation(
    api.subscriptions.createSubscription
  );

  // Initialize RevenueCat
  useEffect(() => {
    const initializePurchases = async () => {
      try {
        // Initialize RevenueCat with your API keys
        // You'll need to get these from RevenueCat dashboard
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

        if (apiKey) {
          await Purchases.configure({ apiKey });

          // Get available offerings
          const offerings = await Purchases.getOfferings();
          if (offerings.current) {
            setOffering(offerings.current);
          }

          // Check current subscription status
          const customerInfo = await Purchases.getCustomerInfo();
          const hasActiveEntitlement =
            customerInfo.entitlements.active["chatyt_premium"] !== undefined;

          // Update Convex if there's a mismatch
          if (hasActiveEntitlement && !subscriptionData?.isSubscribed) {
            // User has active subscription but Convex doesn't know about it
            const activeSubscription = customerInfo.activeSubscriptions.find(
              (sub: string) => sub === "chatyt_monthly"
            );

            if (activeSubscription) {
              const purchase =
                customerInfo.allPurchaseDates[activeSubscription];
              const expirationDate =
                customerInfo.allExpirationDates[activeSubscription];

              await createSubscriptionMutation({
                productId: "chatyt_monthly",
                status: "active",
                purchaseDate: purchase
                  ? new Date(purchase).getTime()
                  : Date.now(),
                expiresAt: expirationDate
                  ? new Date(expirationDate).getTime()
                  : Date.now() + 30 * 24 * 60 * 60 * 1000,
                originalTransactionId: activeSubscription,
                platform: "ios", // You'll need to detect platform
                price: 100, // $1.00 in cents
                currency: "USD",
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize RevenueCat:", error);
      }
    };

    if (isSignedIn) {
      initializePurchases();
    }
  }, [isSignedIn, subscriptionData?.isSubscribed, createSubscriptionMutation]);

  const purchaseSubscription = async () => {
    if (!offering?.monthly) {
      console.error("No monthly package available");
      return;
    }

    setIsLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(
        offering.monthly
      );

      if (customerInfo.entitlements.active["chatyt_premium"]) {
        // Subscription successful, update Convex
        const activeSubscription = customerInfo.activeSubscriptions.find(
          (sub: string) => sub === "chatyt_monthly"
        );

        if (activeSubscription) {
          const purchase = customerInfo.allPurchaseDates[activeSubscription];
          const expirationDate =
            customerInfo.allExpirationDates[activeSubscription];

          await createSubscriptionMutation({
            productId: "chatyt_monthly",
            status: "active",
            purchaseDate: purchase ? new Date(purchase).getTime() : Date.now(),
            expiresAt: expirationDate
              ? new Date(expirationDate).getTime()
              : Date.now() + 30 * 24 * 60 * 60 * 1000,
            originalTransactionId: activeSubscription,
            platform: "ios", // You'll need to detect platform
            price: 100, // $1.00 in cents
            currency: "USD",
          });
        }
      }
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async () => {
    setIsLoading(true);
    try {
      const { customerInfo } = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active["chatyt_premium"]) {
        // Restore successful, update Convex
        const activeSubscription = customerInfo.activeSubscriptions.find(
          (sub: string) => sub === "chatyt_monthly"
        );

        if (activeSubscription) {
          const purchase = customerInfo.allPurchaseDates[activeSubscription];
          const expirationDate =
            customerInfo.allExpirationDates[activeSubscription];

          await createSubscriptionMutation({
            productId: "chatyt_monthly",
            status: "active",
            purchaseDate: purchase ? new Date(purchase).getTime() : Date.now(),
            expiresAt: expirationDate
              ? new Date(expirationDate).getTime()
              : Date.now() + 30 * 24 * 60 * 60 * 1000,
            originalTransactionId: activeSubscription,
            platform: "ios", // You'll need to detect platform
            price: 100, // $1.00 in cents
            currency: "USD",
          });
        }
      }
    } catch (error) {
      console.error("Restore failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: SubscriptionContextType = {
    isSubscribed: subscriptionData?.isSubscribed || false,
    isLoading,
    offering,
    purchaseSubscription,
    restorePurchases,
    subscriptionExpiresAt: subscriptionData?.subscriptionExpiresAt || null,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
