#!/bin/bash

# Production Deployment Script for Chatol App
echo "🚀 Starting production deployment for Chatol..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Please install it with: npm install -g eas-cli"
    exit 1
fi

# Check if logged in to Expo
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to Expo. Please run: eas login"
    exit 1
fi

# Check if environment variables are set
if [ -z "$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" ] || [ -z "$EXPO_PUBLIC_CONVEX_URL" ]; then
    echo "❌ Environment variables not set. Please set:"
    echo "   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
    echo "   EXPO_PUBLIC_CONVEX_URL"
    exit 1
fi

echo "✅ Environment check passed"

# Build for iOS
echo "📱 Building for iOS..."
eas build --platform ios --profile production --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ iOS build completed successfully"
else
    echo "❌ iOS build failed"
    exit 1
fi

# Build for Android
echo "🤖 Building for Android..."
eas build --platform android --profile production --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ Android build completed successfully"
else
    echo "❌ Android build failed"
    exit 1
fi

echo "🎉 All builds completed successfully!"
echo ""
echo "Next steps:"
echo "1. Submit to App Store: eas submit --platform ios --profile production"
echo "2. Submit to Google Play: eas submit --platform android --profile production"
echo "3. Monitor build status at: https://expo.dev/accounts/actanaaraujo/projects/chatol/builds" 