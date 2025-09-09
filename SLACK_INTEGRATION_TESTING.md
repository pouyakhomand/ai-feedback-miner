# Slack Integration Testing Guide

## Current Issue

Your Slack integration isn't working because **Slack doesn't know where to send messages**. The webhook endpoint exists but isn't configured in Slack.

## Complete Setup Steps

### 1. Create Slack App (if not done already)

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name: "AI Feedback Miner"
4. Select your workspace

### 2. Configure Bot Permissions

1. Go to "OAuth & Permissions"
2. Add these Bot Token Scopes:
   - `channels:read`
   - `channels:history`
   - `chat:write` (optional, for responses)
3. Click "Install App to Workspace"
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 3. Configure Event Subscriptions (CRITICAL MISSING STEP)

1. Go to "Event Subscriptions"
2. Enable Events: **ON**
3. Request URL: `http://your-domain:8000/webhooks/slack`
   - For local testing: Use ngrok or similar tunneling service
   - For production: Use your actual domain
4. Subscribe to Bot Events:
   - `message.channels` (for public channels)
   - `message.groups` (for private channels)
5. Click "Save Changes"

### 4. Add Bot to Channels

1. In Slack, invite your bot to the channels you want to monitor
2. Type: `/invite @YourBotName` in each channel
3. Or use the channel settings to add the bot

### 5. Configure Integration in Your App

1. Go to your app: http://localhost:3000/integrations
2. Click "Connect Slack"
3. Enter:
   - Bot Token: `xoxb-your-token-here`
   - Workspace ID: Found in Slack URL (`TXXXXXXXXX`)
   - Channels: Add channel names (e.g., `#general`, `#feedback`)

## Testing Steps

### Test 1: Verify Webhook Endpoint

```bash
# Test if webhook endpoint is accessible
curl -X POST http://localhost:8000/webhooks/slack \
  -H "Content-Type: application/json" \
  -d '{"challenge": "test_challenge"}'
```

Expected response: `test_challenge`

### Test 2: Check Integration Status

```bash
# Check if integration is connected
curl http://localhost:8000/integrations
```

Look for Slack integration with `status: "connected"`

### Test 3: Test Message Processing

1. Send a message in a monitored Slack channel
2. Check backend logs:
   ```bash
   docker logs ai-feedback-backend
   ```
3. Look for: `New Slack feedback saved: [message text]`

### Test 4: Verify Database Storage

```bash
# Check if messages are saved to database
curl http://localhost:8000/feedback/source/slack
```

## Common Issues & Solutions

### Issue 1: "URL verification failed"

**Solution**: Make sure your webhook URL is publicly accessible. Use ngrok for local testing:

```bash
ngrok http 8000
# Use the https URL in Slack Event Subscriptions
```

### Issue 2: "No messages received"

**Solutions**:

- Verify bot is added to channels
- Check Event Subscriptions are enabled
- Ensure correct scopes are granted
- Verify channel names match exactly

### Issue 3: "Bot not in channel"

**Solution**: Add bot to channels manually:

1. Go to channel
2. Click channel name → Settings
3. Add apps → Select your bot

### Issue 4: "Permission denied"

**Solution**: Reinstall app with correct scopes:

1. Go to OAuth & Permissions
2. Add missing scopes
3. Click "Reinstall App"

## Debugging Tools

### Check Integration Status

```bash
curl http://localhost:8000/integrations | jq '.[] | select(.type == "slack")'
```

### Monitor Webhook Logs

```bash
docker logs -f ai-feedback-backend | grep -i slack
```

### Test Webhook Manually

```bash
curl -X POST http://localhost:8000/webhooks/slack \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "message",
      "text": "Test message",
      "channel": "C1234567890",
      "user": "U1234567890",
      "ts": "1234567890.123456"
    }
  }'
```

## Production Deployment

For production, you need:

1. **Public Domain**: Your webhook URL must be publicly accessible
2. **HTTPS**: Slack requires HTTPS for webhooks
3. **Environment Variables**: Set proper CORS_ORIGIN and API URLs

Example production webhook URL:

```
https://yourdomain.com/webhooks/slack
```

## Next Steps

1. Set up Event Subscriptions in Slack (most critical)
2. Use ngrok for local testing
3. Add bot to test channels
4. Send test messages
5. Monitor logs for confirmation

The key missing piece is **Event Subscriptions configuration** in your Slack app settings.
