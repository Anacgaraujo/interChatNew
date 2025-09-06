import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscription } from "@/context/subscription-context";
import { useTheme } from "@/context/theme-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const SubscriptionScreen = () => {
  const { isSubscribed, isLoading, purchaseSubscription, restorePurchases } =
    useSubscription();
  const { isDark } = useTheme();

  const handlePurchase = async () => {
    try {
      await purchaseSubscription();
      Alert.alert(
        "Success!",
        "Your subscription has been activated. Enjoy premium features!"
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to purchase subscription. Please try again."
      );
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert("Success!", "Your previous purchases have been restored.");
    } catch (error) {
      Alert.alert("Error", "No previous purchases found to restore.");
    }
  };

  if (isSubscribed) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-gray-900" : "bg-white"}`}>
        <View className="flex-1 justify-center items-center px-6">
          <MaterialCommunityIcons
            name="check-circle"
            size={80}
            color={isDark ? "#10b981" : "#059669"}
          />
          <Text
            className={`text-2xl font-bold mt-4 text-center ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            You're Subscribed!
          </Text>
          <Text
            className={`text-lg mt-2 text-center ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Enjoy all premium features of Chatol
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-gray-900" : "bg-white"}`}>
      <View className="flex-1 justify-center items-center px-6">
        <MaterialCommunityIcons
          name="crown"
          size={80}
          color={isDark ? "#fbbf24" : "#f59e0b"}
        />

        <Text
          className={`text-3xl font-bold mt-6 text-center ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Upgrade to Premium
        </Text>

        <Text
          className={`text-lg mt-4 text-center ${
            isDark ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Unlock all features and enjoy an ad-free experience
        </Text>

        <View className="mt-8 w-full">
          <View
            className={`p-6 rounded-2xl border-2 ${
              isDark
                ? "bg-gray-800 border-yellow-500"
                : "bg-gray-50 border-yellow-400"
            }`}
          >
            <Text
              className={`text-2xl font-bold text-center ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              $1.00/month
            </Text>
            <Text
              className={`text-center mt-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Cancel anytime
            </Text>
          </View>

          <TouchableOpacity
            onPress={handlePurchase}
            disabled={isLoading}
            className={`mt-6 p-4 rounded-xl ${
              isLoading
                ? "bg-gray-400"
                : isDark
                  ? "bg-yellow-500"
                  : "bg-yellow-400"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color={isDark ? "#1f2937" : "#ffffff"} />
            ) : (
              <Text
                className={`text-center font-bold text-lg ${
                  isDark ? "text-gray-900" : "text-white"
                }`}
              >
                Subscribe Now
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={isLoading}
            className={`mt-4 p-4 rounded-xl border-2 ${
              isDark
                ? "border-gray-600 bg-transparent"
                : "border-gray-300 bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Restore Purchases
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8 w-full">
          <Text
            className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Premium Features:
          </Text>

          <View className="space-y-3">
            {[
              "Unlimited messages",
              "Advanced chat features",
              "Priority support",
              "Ad-free experience",
              "Custom themes",
            ].map((feature, index) => (
              <View key={index} className="flex-row items-center">
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={isDark ? "#10b981" : "#059669"}
                />
                <Text
                  className={`ml-3 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
