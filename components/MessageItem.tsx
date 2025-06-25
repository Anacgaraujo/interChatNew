import { useTheme } from "@/context/theme-context";
import { Doc } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/use-profile";
import { Id } from "@/convex/_generated/dataModel"; // Import Id
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

// This interface assumes your `getMessages` query returns the message
// with the sender's user document nested inside it.
export interface MessageWithUser extends Doc<"messages"> {
  user: Doc<"users">;
  media?: {
    storageId: Id<"_storage">; // Changed from string to Id<"_storage">
    type: string;
    fileName?: string;
    url?: string;
  }[];
}

// MediaCard sub-component for displaying images, videos, or files
const MediaCard = ({
  media,
  handleMediaPress,
}: {
  media: MessageWithUser["media"];
  handleMediaPress: (media: any) => void;
}) => {
  // The 'any' type for handleMediaPress's media parameter can be refined further if needed.
  if (!media || media.length === 0) return null;

  return (
    <View className="w-full mt-2">
      {media.map((item) => (
        <TouchableOpacity
          key={item.storageId}
          onPress={() => handleMediaPress(item)}
        >
          {item.type.startsWith("image") ? (
            <Image
              source={{ uri: item.url }}
              className="w-full h-64 rounded-xl"
              resizeMode="cover"
            />
          ) : item.type.startsWith("video") ? (
            <View className="items-center justify-center w-full h-64 bg-gray-700 rounded-xl">
              <MaterialCommunityIcons
                name="play-circle"
                size={48}
                color={"white"}
              />
            </View>
          ) : (
            <View className="flex-row items-center justify-center w-full h-12 bg-gray-700 rounded-lg">
              <MaterialCommunityIcons name="file" size={24} color="white" />
              <Text className="ml-2 text-white" numberOfLines={1}>
                {item?.fileName || "File"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const MessageItem = ({
  message,
  isGroup,
  handleMediaPress,
}: {
  message: MessageWithUser;
  isGroup: boolean | undefined;
  handleMediaPress: (media: any) => void;
}) => {
  const { isDark } = useTheme();
  const currentUser = useProfile();
  const getOrTranslate = useAction(api.translate.getOrTranslate);

  const [displayText, setDisplayText] = useState(message.content);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);

  const isMyMessage = currentUser?._id === message.userId;

  const formattedTime = formatDistanceToNow(new Date(message._creationTime), {
    addSuffix: true,
  });

  useEffect(() => {
    if (!currentUser) return;

    const needsTranslation =
      !isMyMessage && currentUser.preferredLanguage && message.content;

    if (needsTranslation) {
      setIsLoadingTranslation(true);
      getOrTranslate({
        messageId: message._id,
        targetLanguage: currentUser.preferredLanguage!,
      })
        .then((translatedText) => {
          if (translatedText && translatedText !== message.content) {
            setDisplayText(translatedText);
            setIsTranslated(true);
          } else {
            setDisplayText(message.content);
            setIsTranslated(false);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingTranslation(false));
    } else {
      // Reset state if it doesn't need translation (e.g. message changed)
      setDisplayText(message.content);
      setIsTranslated(false);
    }
  }, [message, currentUser, isMyMessage, getOrTranslate]);

  return (
    <TouchableOpacity>
      <View
        className={`flex-row mb-2 mx-4 ${isMyMessage ? "justify-end" : "justify-start"}`}
      >
        <View
          className={`p-3 rounded-2xl max-w-[80%] ${isMyMessage ? `${isDark ? "bg-blue-700" : "bg-blue-500"}` : `${isDark ? "bg-gray-800" : "bg-gray-200"}`} ${message.media && message.media.length > 0 && !message.content ? "bg-transparent p-0" : ""}`}
        >
          {!isMyMessage && isGroup && (
            <Text
              className={`text-xs font-semibold mb-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}
            >
              {message.user.name}
            </Text>
          )}

          {isLoadingTranslation ? (
            <ActivityIndicator
              size="small"
              color={isMyMessage ? "white" : isDark ? "white" : "black"}
            />
          ) : (
            message.content && (
              <Text
                className={`text-lg ${isMyMessage ? "text-white" : isDark ? "text-white" : "text-gray-800"}`}
              >
                {displayText}
              </Text>
            )
          )}

          {message.media && message.media.length > 0 && (
            <MediaCard
              media={message.media}
              handleMediaPress={handleMediaPress}
            />
          )}

          <View className="flex-row items-center self-end justify-end mt-1 gap-x-2">
            {isTranslated && !isLoadingTranslation && (
              <Text
                className={`text-xs ${isMyMessage ? "text-blue-200" : isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                Translated
              </Text>
            )}
            <Text
              className={`text-xs ${isMyMessage ? "text-gray-300" : isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              {formattedTime}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
