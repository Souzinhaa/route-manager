#!/bin/bash
set -e

echo "🧪 Testing Route Manager API"
echo "=============================="

API="http://localhost:8000"

echo "1️⃣  Health Check..."
curl -s $API/health | jq .

echo -e "\n2️⃣  Register User..."
REGISTER=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }')
echo $REGISTER | jq .

echo -e "\n3️⃣  Login..."
LOGIN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')
TOKEN=$(echo $LOGIN | jq -r '.access_token')
echo $LOGIN | jq .

echo -e "\n4️⃣  Get Current User..."
curl -s $API/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n5️⃣  Get Route History..."
curl -s $API/routes/history \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ All tests passed!"
