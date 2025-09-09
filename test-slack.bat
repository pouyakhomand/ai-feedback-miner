@echo off
echo Slack Integration Quick Test
echo ============================

echo.
echo 1. Testing webhook endpoint...
curl -X POST http://localhost:8000/webhooks/slack -H "Content-Type: application/json" -d "{\"challenge\": \"test123\"}"

echo.
echo.
echo 2. Checking integration status...
curl http://localhost:8000/integrations

echo.
echo.
echo 3. Checking Slack feedback in database...
curl http://localhost:8000/feedback/source/slack

echo.
echo.
echo 4. Testing backend health...
curl http://localhost:8000/health

echo.
echo.
echo Test completed! Check the responses above.
pause
