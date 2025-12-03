# Next.js Portal Setup Instructions

To run the Next.js portal with Google Sheets integration, follow these steps:

## 1. Google Cloud Platform (GCP) Setup

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (or use an existing one).
3.  Enable the **Google Sheets API**.
    *   Go to "APIs & Services" > "Library".
    *   Search for "Google Sheets API" and enable it.
4.  Create a **Service Account**.
    *   Go to "APIs & Services" > "Credentials".
    *   Click "Create Credentials" > "Service Account".
    *   Give it a name (e.g., "next-portal-sa").
    *   Click "Create and Continue".
    *   (Optional) Grant "Editor" role if you plan to write to sheets, or "Viewer" if only reading.
    *   Click "Done".
5.  Generate a **Key**.
    *   Click on the newly created Service Account email.
    *   Go to the "Keys" tab.
    *   Click "Add Key" > "Create new key".
    *   Select **JSON** and create.
    *   A JSON file will be downloaded. **Keep this safe!**

## 2. Share Spreadsheet

1.  Open your Student Master Spreadsheet in Google Sheets.
2.  Click "Share".
3.  Paste the **client_email** from the downloaded JSON key file (e.g., `next-portal-sa@...`).
4.  Grant "Viewer" (or "Editor") access.

## 3. Environment Variables

1.  Rename `.env.example` to `.env.local` in the `next-portal` directory.
2.  Fill in the values:
    *   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: The `client_email` from the JSON file.
    *   `GOOGLE_PRIVATE_KEY`: The `private_key` from the JSON file. **Copy the entire string including `-----BEGIN PRIVATE KEY...`**.
    *   `SPREADSHEET_ID`: The ID of your spreadsheet (found in the URL: `docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit`).

## 4. Run Development Server

```bash
cd next-portal
npm run dev
```

## 5. Test

You can test the API using curl:

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_TEST_LINE_ID"}'
```
