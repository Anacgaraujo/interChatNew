# Subscription Setup Guide for Chat-yt App

## 🚀 Overview

This guide will help you set up a $1/month subscription system for your Chat-yt app using RevenueCat for in-app purchases.

## 📋 Prerequisites

1. **Apple Developer Account** (for iOS App Store)
2. **Google Play Console Account** (for Android)
3. **RevenueCat Account** (free tier available)

## 🔧 Step-by-Step Setup

### 1. RevenueCat Setup

#### Create RevenueCat Account

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign up for a free account
3. Create a new project called "Chat-yt"

#### Configure Products

1. In RevenueCat dashboard, go to **Products**
2. Create a new product:
   - **Product ID**: `chatyt_monthly`
   - **Display Name**: `Chat-yt Premium Monthly`
   - **Price**: $1.00 USD
   - **Duration**: Monthly (recurring)

#### Get API Keys

1. Go to **Project Settings** → **API Keys**
2. Copy your **Public API Key**
3. Add it to your environment variables:
   ```
   EXPO_PUBLIC_REVENUECAT_API_KEY=your_public_api_key_here
   ```

### 2. App Store Connect Setup (iOS)

#### Access Your Existing App

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to your existing app: **"chat-yt"**
   - **Bundle ID**: `com.actanaaraujo.chatyt`
   - **SKU**: EX1748992955425
   - **Apple ID**: 6746772847

#### Configure In-App Purchases

1. Go to **Features** → **In-App Purchases**
2. Create a new subscription:
   - **Product ID**: `chatyt_monthly`
   - **Reference Name**: `Chat-yt Premium Monthly`
   - **Subscription Group**: Create new group "Chat-yt Premium"
   - **Subscription Duration**: 1 Month
   - **Price**: $1.00 USD

#### Submit for Review

1. Fill in all required metadata
2. Submit for App Store review
3. Wait for approval (typically 1-3 days)

### 3. Google Play Console Setup (Android)

#### Create App

1. Go to [Google Play Console](https://play.google.com/console/)
2. Create a new app:
   - **Package name**: `com.actanaaraujo.chatyt`
   - **App name**: Chat-yt

#### Configure In-App Products

1. Go to **Monetize** → **Products** → **Subscriptions**
2. Create a new subscription:
   - **Product ID**: `chatyt_monthly`
   - **Name**: `Chat-yt Premium Monthly`
   - **Description**: `Unlock all premium features`
   - **Price**: $1.00 USD
   - **Billing period**: Monthly

### 4. Environment Variables

Add these to your `.env` file:

```
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_public_key
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
EXPO_PUBLIC_CONVEX_URL=your_convex_url
```

### 5. RevenueCat Dashboard Configuration

#### Entitlements

1. Go to **Entitlements**
2. Create a new entitlement:
   - **Name**: `chatyt_premium`
   - **Description**: `Premium features access`

#### Products to Entitlements

1. Link `chatyt_monthly` product to `chatyt_premium` entitlement

### 6. Testing

#### TestFlight (iOS)

1. Upload your app to TestFlight
2. Add test users
3. Test subscription flow

#### Internal Testing (Android)

1. Upload APK to Google Play Console
2. Add test users
3. Test subscription flow

## 🧪 Testing the Implementation

### Local Testing

1. Run the app: `npm start`
2. Navigate to Profile → Subscription
3. Test purchase flow (will use sandbox)

### Sandbox Testing

1. Use test accounts provided by Apple/Google
2. Test subscription purchase
3. Test subscription restoration
4. Test subscription cancellation

## 📱 App Store Submission

### iOS

1. Build production app: `eas build --platform ios --profile production`
2. Submit to App Store: `eas submit --platform ios --profile production`
3. Wait for review (1-7 days)

### Android

1. Build production app: `eas build --platform android --profile production`
2. Submit to Google Play: `eas submit --platform android --profile production`
3. Wait for review (1-3 days)

## 🔍 Monitoring

### RevenueCat Analytics

- Track subscription conversions
- Monitor churn rates
- Analyze revenue metrics

### App Store Analytics

- Monitor app performance
- Track user engagement
- Analyze subscription metrics

## 🛠️ Troubleshooting

### Common Issues

1. **Subscription not working**

   - Check RevenueCat API key
   - Verify product IDs match
   - Ensure entitlements are configured

2. **Purchase fails**

   - Check sandbox/test accounts
   - Verify app store configuration
   - Check network connectivity

3. **Restore not working**
   - Ensure user is signed in
   - Check RevenueCat configuration
   - Verify platform-specific setup

### Debug Commands

```bash
# Check RevenueCat logs
npx expo start --clear

# Test subscription locally
npx expo run:ios
npx expo run:android
```

## 📊 Analytics Setup

### RevenueCat Events

- `subscription_started`
- `subscription_renewed`
- `subscription_cancelled`
- `subscription_restored`

### Custom Events

Track user engagement with premium features:

- `premium_feature_used`
- `subscription_upgrade_attempted`
- `subscription_restore_attempted`

## 🎯 Next Steps

1. **Implement premium features** that require subscription
2. **Add subscription gating** to premium features
3. **Set up analytics** to track subscription metrics
4. **Create marketing materials** for premium features
5. **Plan pricing strategy** for different tiers

## 📞 Support

- **RevenueCat Docs**: https://docs.revenuecat.com/
- **Apple Developer**: https://developer.apple.com/
- **Google Play Console**: https://play.google.com/console/

## 🔐 Security Notes

- Never expose private API keys in client code
- Use environment variables for sensitive data
- Implement server-side receipt validation
- Monitor for fraudulent purchases

---

**Note**: This setup assumes you're using the free tier of RevenueCat. For production apps with high volume, consider upgrading to a paid plan for additional features and support.
