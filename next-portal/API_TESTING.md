# Next.js Portal - API Testing Guide

## Prerequisites
Make sure you have:
1. Set up `.env.local` with all required credentials
2. Added Calendar API scope to your Service Account
3. Shared your Google Calendar with the Service Account email

## Add Calendar ID to .env.local

Add this line to your `.env.local`:
```
CALENDAR_ID=primary
```

Or use a specific calendar ID if you want to use a different calendar.

## Enable Calendar API in GCP

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" > "Library"
4. Search for "Google Calendar API"
5. Click "Enable"

## Share Calendar with Service Account

1. Open Google Calendar
2. Click on the calendar you want to use (or use your primary calendar)
3. Click "Settings and sharing"
4. Scroll to "Share with specific people"
5. Add your Service Account email (from the JSON file)
6. Grant "Make changes to events" permission

## Test the APIs

### 1. Test Meeting Reservation

```bash
curl -X POST http://localhost:3000/api/reserveMeeting \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U873f976fc1f2ab959918871c84714da9",
    "date": "2025-12-05",
    "meetingType": "面談",
    "arrivalTime": "T17:00:00",
    "leaveTime": "T18:00:00"
  }'
```

### 2. Test Rest Day Registration

```bash
curl -X POST http://localhost:3000/api/registerRestDay \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U873f976fc1f2ab959918871c84714da9",
    "date": "2025-12-06"
  }'
```

## Expected Response

Both APIs should return:
```json
{
  "status": "ok",
  "data": {
    "eventId": "...",
    "title": "...",
    ...
  }
}
```

Check your Google Calendar to confirm the events were created!
