import { useTheme } from "@/context/theme-context";
import { NoImage } from "@/dummyData";
import { useProfile } from "@/hooks/use-profile";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActionSheetIOS,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscription } from "@/context/subscription-context";

const SettingItem = ({
  icon,
  title,
  subTitle,
  showArrow,
  showToggle,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subTitle?: string;
  showArrow?: boolean;
  showToggle?: boolean;
  onPress?: () => void;
}) => {
  const { isDark } = useTheme();

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between"
      onPress={onPress}
    >
      <View>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={isDark ? "#9CA3AF" : "#4B5563"}
        />
      </View>
      <View className="flex-1 ml-4">
        <Text
          className={`text-[16px] font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}
        >
          {title}
        </Text>

        <Text
          className={`text-[14px] mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          {subTitle || "N/A"}
        </Text>
      </View>

      {showArrow && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={isDark ? "#9CA3AF" : "#4B5563"}
        />
      )}
    </TouchableOpacity>
  );
};

import { useState } from "react";
// Define interfaces for better type safety
interface LanguageItem {
  code: string;
  name: string;
}

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (language: LanguageItem) => void;
  languages: LanguageItem[]; // Pass languages as a prop
}

// LanguagePicker component (moved outside Profile)
const LanguagePicker = ({
  visible,
  onClose,
  onSelectLanguage,
  languages,
}: LanguagePickerProps) => {
  const { isDark } = useTheme();
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        className="items-center justify-center bg-black/50"
        onPress={onClose}
      >
        <View
          className={`w-3/4 rounded-lg p-4 ${isDark ? "bg-gray-800" : "bg-white"}`}
          onStartShouldSetResponder={() => true} // Prevent touch from closing modal
        >
          <Text
            className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-black"}`}
          >
            Select Language
          </Text>
          <FlatList
            data={languages}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="py-3"
                onPress={() => {
                  onSelectLanguage(item);
                  onClose();
                }}
              >
                <Text
                  className={`text-base ${isDark ? "text-gray-200" : "text-gray-800"}`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View
                className={`h-[1px] ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
              />
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const Profile = () => {
  const { isDark, theme, setTheme } = useTheme();
  const user = useProfile();
  const { signOut } = useAuth();
  const updateUser = useMutation(api.users.updateUser);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const { isSubscribed } = useSubscription();

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "pt", name: "Portuguese" },
  ];

  const handleSelectLanguage = () => {
    // ActionSheetIOS is for iOS. For a cross-platform solution,
    // you might use a library like 'react-native-modal' or a custom component.
    if (Platform.OS === "ios") {
      const options = [...languages.map((l) => l.name), "Cancel"];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Select Preferred Language",
        },
        (buttonIndex) => {
          if (buttonIndex !== undefined && buttonIndex !== cancelButtonIndex) {
            const selectedLanguage = languages[buttonIndex];
            updateUser({ preferredLanguage: selectedLanguage.code })
              .then(() => {
                Alert.alert(
                  "Success",
                  `Language updated to ${selectedLanguage.name}`
                );
              })
              .catch((err) => {
                console.error(err);
                Alert.alert("Error", "Failed to update language.");
              });
          }
        }
      );
    } else {
      setShowLanguagePicker(true);
    }
  };

  const themeText = useMemo(() => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "Light";
    }
  }, [theme]);

  const preferredLanguageName = useMemo(() => {
    const lang = languages.find((l) => l.code === user?.preferredLanguage);
    return lang ? lang.name : "Not Set";
  }, [languages, user?.preferredLanguage]);

  const handleTheme = () => {
    switch (theme) {
      case "light":
        setTheme("dark");
        break;
      case "dark":
        setTheme("light");
        break;
      default:
        setTheme("light");
        break;
    }
  };

  const logOut = async () => {
    await signOut();
    router.replace("/");
  };

  const handleSubscription = () => {
    router.push("/(protected)/(modals)/subscription" as any);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-gray-900" : "bg-white"}`}>
      {/* header */}
      <View className="flex-row items-center justify-between p-4">
        <Text
          className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"}`}
        >
          Profile
        </Text>
      </View>

      {/* content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className={`items-center py-8`}>
          <View className="relative">
            <Image
              source={{ uri: user?.imageUrl || NoImage }}
              className="rounded-full w-28 h-28"
            />

            <TouchableOpacity
              className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full"
              onPress={() => console.log("edit profile")}
            >
              <MaterialCommunityIcons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <Text
            className={`text-2xl font-semibold mt-4 ${isDark ? "text-white" : "text-black"}`}
          >
            {user?.name}
          </Text>

          <View className="items-center">
            <Text
              className={`text-gray-500 ${isDark ? "text-white" : "text-black"}`}
            >
              @{user?.username}
            </Text>

            <TouchableOpacity className="flex-row items-center gap-2 mt-4">
              <MaterialCommunityIcons name="pencil" size={20} color="blue" />
              <Text className="text-blue-600">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-4 mt-4">
          {/* Subscription Section */}
          <View className="mb-8">
            <Text
              className={`text-[12px] font-semibold ${isDark ? "text-white" : "text-black"}`}
            >
              Subscription
            </Text>

            <View className="gap-4 mt-4">
              <TouchableOpacity
                className={`flex-row items-center justify-between p-4 rounded-lg ${
                  isSubscribed
                    ? isDark
                      ? "bg-green-900"
                      : "bg-green-100"
                    : isDark
                      ? "bg-yellow-900"
                      : "bg-yellow-100"
                }`}
                onPress={handleSubscription}
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name={isSubscribed ? "crown" : "crown-outline"}
                    size={20}
                    color={isSubscribed ? "#10b981" : "#f59e0b"}
                  />
                  <View className="ml-4">
                    <Text
                      className={`text-[16px] font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {isSubscribed ? "Premium Active" : "Upgrade to Premium"}
                    </Text>
                    <Text
                      className={`text-[14px] mt-0.5 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {isSubscribed
                        ? "Enjoy all premium features"
                        : "$1.00/month - Unlock all features"}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={isDark ? "#9CA3AF" : "#4B5563"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-8">
            <Text
              className={`text-[12px] font-semibold ${isDark ? "text-white" : "text-black"}`}
            >
              Account Settings
            </Text>

            <View className="gap-4 mt-4">
              <SettingItem
                icon="account"
                title="Username"
                subTitle={user?.username}
                showArrow={false}
                // preferredLanguage={use?.preferredLanguage}
              />
              <View
                style={{ height: StyleSheet.hairlineWidth }}
                className={`${isDark ? "bg-gray-800" : "bg-gray-200"}`}
              />
              <SettingItem
                icon="email"
                title="Email"
                subTitle={user?.email}
                showArrow={false}
              />
              <View
                style={{ height: StyleSheet.hairlineWidth }}
                className={`${isDark ? "bg-gray-800" : "bg-gray-200"}`}
              />
              <SettingItem
                icon="translate"
                title="Preferred Language"
                subTitle={preferredLanguageName}
                showArrow={true}
                onPress={handleSelectLanguage}
              />
              <View
                style={{ height: StyleSheet.hairlineWidth }}
                className={`${isDark ? "bg-gray-800" : "bg-gray-200"}`}
              />
              <SettingItem
                icon="phone"
                title="Phone Number"
                subTitle={user?.phoneNumber}
                showArrow={false}
              />
            </View>
          </View>

          <View className="mb-8">
            <Text
              className={`text-[12px] font-semibold ${isDark ? "text-white" : "text-black"}`}
            >
              Appearance
            </Text>

            <View className="gap-4 mt-4">
              <SettingItem
                icon="theme-light-dark"
                title="Theme"
                subTitle={isDark ? "Dark" : "Light"}
                showArrow={true}
                onPress={() => handleTheme()}
              />
              <View
                style={{ height: StyleSheet.hairlineWidth }}
                className={`${isDark ? "bg-gray-800" : "bg-gray-200"}`}
              />
            </View>
          </View>

          <TouchableOpacity
            className="items-center justify-center p-4 mt-4 bg-red-500 rounded-lg"
            onPress={logOut}
          >
            <Text className="text-base font-semibold text-white">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        languages={languages} // Pass languages to the picker
        onSelectLanguage={async (selectedLanguage) => {
          await updateUser({ preferredLanguage: selectedLanguage.code });
          Alert.alert(
            "Success",
            `Language updated to ${selectedLanguage.name}`
          );
        }}
      />
    </SafeAreaView>
  );
};

export default Profile;
