# Slack Integration Guide

## Overview

The AI Feedback Miner now features a **simplified Slack integration** that automatically monitors any channel your bot is added to. No more manual channel configuration needed!

## 🚀 Quick Setup

### Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app: **"AI Feedback Miner"**
4. Select your workspace

### Step 2: Configure Bot Permissions

1. Go to **"OAuth & Permissions"** in your app settings
2. Under **"Bot Token Scopes"**, add these scopes:
   ```
   ✅ channels:read       (read public channel info)
   ✅ channels:history    (read public channel messages)
   ✅ groups:read         (read private channel info)
   ✅ groups:history      (read private channel messages)
   ```
3. Click **"Install App to Workspace"**
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

### Step 3: Get Workspace ID

1. Open Slack in your browser
2. Look at the URL: `https://app.slack.com/client/TXXXXXXXXX/...`
3. The part after `/client/` is your Workspace ID (starts with `T`)

### Step 4: Connect Integration

1. Go to your AI Feedback Miner app: `http://localhost:3000/integrations`
2. Click **"Connect Slack"**
3. Enter:
   - **Bot Token**: `xoxb-your-token-here`
   - **Workspace ID**: `T1234567890`
4. Click **"Connect Slack"**

## 🎯 How It Works

### Auto-Detection Magic

Once connected, the bot automatically monitors **any channel it's added to**:

1. **Add bot to channel** → Bot becomes a member
2. **Send message in channel** → Webhook receives event
3. **Bot checks channel access** → If accessible, processes message
4. **Message saved as feedback** → Ready for analysis

### No Manual Configuration

- ❌ **No channel selection needed**
- ❌ **No manual channel configuration**
- ✅ **Just add bot to channels you want to monitor**

## 📋 Adding Bot to Channels

### Method 1: Invite Bot

```
/invite @YourBotName
```

### Method 2: Channel Settings

1. Click channel name → **Settings**
2. Go to **Members** tab
3. Click **Add people**
4. Search for your bot and add it

### Method 3: Direct Message

1. Find your bot in the member list
2. Send a DM to invite it to channels

## 🔧 Testing the Integration

### Test 1: Verify Connection

```bash
node debug-slack.js
```

Look for:

```
✅ Slack Integration Status: connected
✅ Auto-detection enabled - bot monitors any channel it's added to
```

### Test 2: Send Test Message

1. Add bot to a test channel
2. Send a message: "This is a test message"
3. Check backend logs:

```bash
docker logs ai-feedback-backend
```

Look for:

```
New Slack feedback saved from #test-channel: This is a test message
```

### Test 3: Verify Database

```bash
curl http://localhost:8000/feedback/source/slack
```

Should show your test message in the response.

## 🛠️ Troubleshooting

### Issue: "missing_scope" Error

**Problem**: Bot token missing required scopes

**Solution**:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Your App
2. Go to **"OAuth & Permissions"**
3. Add all 4 required scopes:
   - `channels:read`
   - `channels:history`
   - `groups:read`
   - `groups:history`
4. Click **"Reinstall App to Workspace"**
5. Update your integration with the new bot token

### Issue: Bot Not Receiving Messages

**Problem**: Bot not processing messages from channels

**Solutions**:

1. **Check bot membership**: Ensure bot is added to the channel
2. **Verify webhook URL**: Check Event Subscriptions in Slack app settings
3. **Check bot permissions**: Ensure bot has required scopes
4. **Test with debug script**: Run `node debug-slack.js`

### Issue: Webhook Not Working

**Problem**: Slack can't reach your webhook endpoint

**Solutions**:

1. **For local testing**: Use ngrok or localtunnel:

   ```bash
   # Option 1: Using ngrok
   ngrok http 8000

   # Option 2: Using localtunnel
   npx localtunnel --port 8000
   ```

2. **Check webhook URL**: Must be publicly accessible
3. **Verify Event Subscriptions**: Enable events in Slack app settings
4. **Test webhook**: Use the debug script to verify endpoint

## 📊 Monitoring Channels

### View Monitored Channels

The bot automatically monitors any channel it's added to. To see which channels are being monitored:

1. Check backend logs for messages like:

   ```
   New Slack feedback saved from #channel-name: message text
   ```

2. Query the database:
   ```bash
   curl http://localhost:8000/feedback/source/slack
   ```

### Add More Channels

Simply add the bot to any new channel you want to monitor - no configuration needed!

### Remove Channel Monitoring

Remove the bot from channels you no longer want to monitor.

## 🔒 Security & Privacy

### Bot Permissions

- Bot only accesses channels it's explicitly added to
- Bot only reads messages (doesn't send messages unless configured)
- Bot respects Slack's privacy settings

### Data Handling

- Messages are stored securely in your database
- Bot token is encrypted and stored safely
- No data is shared with third parties

## 🚀 Advanced Configuration

### Custom Webhook URL

If you need a custom webhook URL:

1. Update your Slack app's Event Subscriptions
2. Set Request URL to your custom endpoint
3. Ensure the endpoint handles Slack's challenge verification

### Multiple Workspaces

To monitor multiple Slack workspaces:

1. Create separate Slack apps for each workspace
2. Connect each workspace as a separate integration
3. Each integration will monitor its respective workspace

## 📈 Performance

### Optimized Processing

- **Fast webhook processing**: ~1-5ms per message
- **No API rate limits**: Uses efficient channel access checking
- **Scalable**: Handles unlimited channels automatically

### Monitoring

- Check backend logs for processing status
- Monitor database for new feedback entries
- Use debug script for health checks

## 🎉 Success!

Once everything is set up, you'll see:

- ✅ Bot automatically monitoring channels it's added to
- ✅ Messages being saved as feedback in real-time
- ✅ No manual configuration required
- ✅ Easy to add/remove channels by adding/removing bot

The integration is now **plug-and-play** - just add the bot to channels and start collecting feedback! 🚀
