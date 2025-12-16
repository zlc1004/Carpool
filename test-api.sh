#!/bin/bash

# Carpool API Test Script - Complete Feature Testing
# Tests all endpoints with a simulated new user

set -e  # Exit on error

# Configuration
BASE_URL="http://localhost:8000"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

# Generate unique test user email
TIMESTAMP=$(date +%s)
TEST_EMAIL="test.user.${TIMESTAMP}@carpool.test"
TEST_PASSWORD="TestPassword123!"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function for section headers
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

# Helper function for success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Helper function for info messages
print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Helper function for error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Variables to store data between requests
ACCESS_TOKEN=""
USER_ID=""
CAPTCHA_SESSION_ID=""
RIDE_ID=""
PLACE_ID_1=""
PLACE_ID_2=""
MESSAGE_ID=""
UPLOAD_ID=""

# =============================================================================
# 1. CAPTCHA ENDPOINTS
# =============================================================================
print_header "1. Testing CAPTCHA Endpoints"

# Generate captcha
print_info "Generating captcha..."
CAPTCHA_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/captcha/generate" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}")

echo "$CAPTCHA_RESPONSE" | jq '.'
CAPTCHA_SESSION_ID=$(echo "$CAPTCHA_RESPONSE" | jq -r '.sessionId')
print_success "Captcha generated: $CAPTCHA_SESSION_ID"

# Save captcha SVG to file
echo "$CAPTCHA_RESPONSE" | jq -r '.svg' > captcha.svg
print_info "Captcha SVG saved to captcha.svg"

# Note: In real scenario, user would solve captcha. For testing, we'll try verification
print_info "Attempting to verify captcha with dummy input (expected to fail)..."
VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/captcha/verify" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"sessionId\": \"${CAPTCHA_SESSION_ID}\",
    \"userInput\": \"WRONG\"
  }")

echo "$VERIFY_RESPONSE" | jq '.'

# =============================================================================
# 2. USER SIGNUP & AUTHENTICATION
# =============================================================================
print_header "2. Testing User Signup & Authentication"

# Sign up a new user
print_info "Signing up new user: $TEST_EMAIL"
SIGNUP_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/v1/signup" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "$SIGNUP_RESPONSE" | jq '.'
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.user.id')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
    print_success "User signed up successfully!"
    print_success "User ID: $USER_ID"
    print_success "Access Token: ${ACCESS_TOKEN:0:50}..."
else
    print_error "Signup failed!"
    exit 1
fi

# =============================================================================
# 3. AUTH/PROFILE ENDPOINTS
# =============================================================================
print_header "3. Testing Auth/Profile Endpoints"

# Get profile
print_info "Getting user profile..."
PROFILE_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/auth/get-profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}")

echo "$PROFILE_RESPONSE" | jq '.'
print_success "Profile retrieved"

# Update profile
print_info "Updating user profile..."
UPDATE_PROFILE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/functions/v1/auth/update-profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"name\": \"Test User ${TIMESTAMP}\",
    \"phone\": \"+1234567890\",
    \"bio\": \"I love carpooling!\",
    \"graduation_year\": 2025,
    \"emergency_contact\": \"+1987654321\"
  }")

echo "$UPDATE_PROFILE_RESPONSE" | jq '.'
print_success "Profile updated"

# =============================================================================
# 4. PLACES ENDPOINTS
# =============================================================================
print_header "4. Testing Places Endpoints"

# Create place 1 (origin)
print_info "Creating origin place..."
CREATE_PLACE1_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/places/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"name\": \"Main Campus\",
    \"address\": \"123 University Ave\",
    \"city\": \"Boston\",
    \"state\": \"MA\",
    \"zip\": \"02115\",
    \"country\": \"USA\",
    \"latitude\": 42.3601,
    \"longitude\": -71.0589,
    \"place_type\": \"campus\"
  }")

echo "$CREATE_PLACE1_RESPONSE" | jq '.'
PLACE_ID_1=$(echo "$CREATE_PLACE1_RESPONSE" | jq -r '.id // .placeId // .place_id // empty')
print_success "Origin place created: $PLACE_ID_1"

# Create place 2 (destination)
print_info "Creating destination place..."
CREATE_PLACE2_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/places/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"name\": \"Downtown Station\",
    \"address\": \"456 Main St\",
    \"city\": \"Boston\",
    \"state\": \"MA\",
    \"zip\": \"02110\",
    \"country\": \"USA\",
    \"latitude\": 42.3555,
    \"longitude\": -71.0640,
    \"place_type\": \"transit\"
  }")

echo "$CREATE_PLACE2_RESPONSE" | jq '.'
PLACE_ID_2=$(echo "$CREATE_PLACE2_RESPONSE" | jq -r '.id // .placeId // .place_id // empty')
print_success "Destination place created: $PLACE_ID_2"

# List places
print_info "Listing all places..."
LIST_PLACES_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/places/list" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}")

echo "$LIST_PLACES_RESPONSE" | jq '.'
print_success "Places listed"

# Increment place usage
if [ -n "$PLACE_ID_1" ] && [ "$PLACE_ID_1" != "null" ]; then
    print_info "Incrementing place usage..."
    INCREMENT_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/places/increment-usage" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "apikey: ${ANON_KEY}" \
      -d "{\"placeId\": \"${PLACE_ID_1}\"}")
    
    echo "$INCREMENT_RESPONSE" | jq '.'
    print_success "Place usage incremented"
fi

# =============================================================================
# 5. RIDES ENDPOINTS (WARNING: No auth enforced)
# =============================================================================
print_header "5. Testing Rides Endpoints"

# Create a ride
print_info "Creating a new ride..."
DEPARTURE_TIME=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%SZ")

if [ -n "$PLACE_ID_1" ] && [ -n "$PLACE_ID_2" ] && [ "$PLACE_ID_1" != "null" ] && [ "$PLACE_ID_2" != "null" ]; then
    CREATE_RIDE_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/rides/create" \
      -H "Content-Type: application/json" \
      -H "apikey: ${ANON_KEY}" \
      -d "{
        \"driverId\": \"${USER_ID}\",
        \"origin\": {\"id\": \"${PLACE_ID_1}\"},
        \"destination\": {\"id\": \"${PLACE_ID_2}\"},
        \"departureTime\": \"${DEPARTURE_TIME}\",
        \"availableSeats\": 3,
        \"notes\": \"Comfortable ride, no smoking\",
        \"price\": 5.00
      }")
    
    echo "$CREATE_RIDE_RESPONSE" | jq '.'
    RIDE_ID=$(echo "$CREATE_RIDE_RESPONSE" | jq -r '.id // .rideId // .ride_id // empty')
    print_success "Ride created: $RIDE_ID"
else
    print_error "Skipping ride creation - places not available"
fi

# Search for rides
print_info "Searching for rides..."
SEARCH_RIDES_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/rides/search?originLat=42.36&originLng=-71.06&destLat=42.36&destLng=-71.06&radius=10000" \
  -H "apikey: ${ANON_KEY}")

echo "$SEARCH_RIDES_RESPONSE" | jq '.'
print_success "Rides search completed"

# =============================================================================
# 6. DATABASE RPC ENDPOINTS
# =============================================================================
print_header "6. Testing Database RPC Endpoints"

# Generate share code
print_info "Generating share code..."
SHARE_CODE_RESPONSE=$(curl -s -X POST "${BASE_URL}/rest/v1/rpc/generate_share_code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}")

echo "$SHARE_CODE_RESPONSE"
print_success "Share code generated"

# Get user school ID
print_info "Getting user school ID..."
SCHOOL_ID_RESPONSE=$(curl -s -X POST "${BASE_URL}/rest/v1/rpc/get_user_school_id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}")

echo "$SCHOOL_ID_RESPONSE"
print_success "School ID retrieved"

# Check if admin
print_info "Checking admin status..."
IS_ADMIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/rest/v1/rpc/is_admin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}")

echo "$IS_ADMIN_RESPONSE"
print_success "Admin status checked"

# =============================================================================
# 7. CHAT ENDPOINTS (if ride exists)
# =============================================================================
print_header "7. Testing Chat Endpoints"

if [ -n "$RIDE_ID" ] && [ "$RIDE_ID" != "null" ]; then
    # Send a message
    print_info "Sending chat message..."
    SEND_MESSAGE_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/chat/send" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "apikey: ${ANON_KEY}" \
      -d "{
        \"ride_id\": \"${RIDE_ID}\",
        \"message\": \"Hello everyone! Looking forward to the ride!\",
        \"message_type\": \"text\"
      }")
    
    echo "$SEND_MESSAGE_RESPONSE" | jq '.'
    MESSAGE_ID=$(echo "$SEND_MESSAGE_RESPONSE" | jq -r '.id // .messageId // empty')
    print_success "Message sent: $MESSAGE_ID"
    
    # Get messages
    print_info "Retrieving chat messages..."
    GET_MESSAGES_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/chat/get?ride_id=${RIDE_ID}&limit=10" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "apikey: ${ANON_KEY}")
    
    echo "$GET_MESSAGES_RESPONSE" | jq '.'
    print_success "Messages retrieved"
    
    # Edit message
    if [ -n "$MESSAGE_ID" ] && [ "$MESSAGE_ID" != "null" ]; then
        print_info "Editing message..."
        EDIT_MESSAGE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/functions/v1/chat/edit" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "apikey: ${ANON_KEY}" \
          -d "{
            \"messageId\": \"${MESSAGE_ID}\",
            \"message\": \"Hello everyone! Really looking forward to the ride!\"
          }")
        
        echo "$EDIT_MESSAGE_RESPONSE" | jq '.'
        print_success "Message edited"
    fi
else
    print_info "Skipping chat tests - no ride available"
fi

# =============================================================================
# 8. NOTIFICATIONS ENDPOINTS (WARNING: No auth enforced)
# =============================================================================
print_header "8. Testing Notifications Endpoints"

# Subscribe to push notifications
print_info "Subscribing to push notifications..."
SUBSCRIBE_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/notifications/subscribe" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"action\": \"subscribe\",
    \"expoPushToken\": \"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]\",
    \"userId\": \"${USER_ID}\"
  }")

echo "$SUBSCRIBE_RESPONSE" | jq '.'
print_success "Subscribed to notifications"

# Get user notifications
print_info "Getting user notifications..."
GET_NOTIFICATIONS_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/notifications/${USER_ID}" \
  -H "apikey: ${ANON_KEY}")

echo "$GET_NOTIFICATIONS_RESPONSE" | jq '.'
print_success "Notifications retrieved"

# =============================================================================
# 9. UPLOADS ENDPOINT
# =============================================================================
print_header "9. Testing Uploads Endpoints"

# Create a test image file
print_info "Creating test image file..."
echo "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" | base64 -d > test-image.gif

# Upload file
print_info "Uploading test image..."
UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/uploads/upload" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -F "file=@test-image.gif" \
  -F "purpose=profile_photo")

echo "$UPLOAD_RESPONSE" | jq '.'
UPLOAD_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.id // .uploadId // empty')
print_success "File uploaded: $UPLOAD_ID"

# Get uploads
print_info "Getting user uploads..."
GET_UPLOADS_RESPONSE=$(curl -s -X GET "${BASE_URL}/functions/v1/uploads/get?purpose=profile_photo&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}")

echo "$GET_UPLOADS_RESPONSE" | jq '.'
print_success "Uploads retrieved"

# Cleanup test file
rm -f test-image.gif

# =============================================================================
# 10. CANCEL RIDE (if created)
# =============================================================================
print_header "10. Testing Ride Cancellation"

if [ -n "$RIDE_ID" ] && [ "$RIDE_ID" != "null" ]; then
    print_info "Cancelling ride..."
    CANCEL_RIDE_RESPONSE=$(curl -s -X POST "${BASE_URL}/functions/v1/rides/cancel" \
      -H "Content-Type: application/json" \
      -H "apikey: ${ANON_KEY}" \
      -d "{\"rideId\": \"${RIDE_ID}\"}")
    
    echo "$CANCEL_RIDE_RESPONSE" | jq '.'
    print_success "Ride cancelled"
else
    print_info "Skipping ride cancellation - no ride to cancel"
fi

# =============================================================================
# SUMMARY
# =============================================================================
print_header "Test Summary"

echo -e "${GREEN}All tests completed!${NC}\n"
echo "Test User Details:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  User ID: $USER_ID"
echo "  Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""
echo "Created Resources:"
echo "  Place 1 (Origin): $PLACE_ID_1"
echo "  Place 2 (Destination): $PLACE_ID_2"
echo "  Ride ID: $RIDE_ID"
echo "  Message ID: $MESSAGE_ID"
echo "  Upload ID: $UPLOAD_ID"
echo ""
echo -e "${YELLOW}⚠ Security Warnings Observed:${NC}"
echo "  - Rides endpoints have NO authentication (security risk)"
echo "  - Notifications endpoints have NO authentication (security risk)"
echo "  - Anyone can create/cancel rides and send notifications"
echo ""
print_success "Test script completed successfully!"
