
import fs from 'fs';
import path from 'path';

// Manual .env.local loader MUST run before importing config that uses env vars
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes if any
            process.env[key] = value;
        }
    });
    // Handle GOOGLE_PRIVATE_KEY specifically for newlines if needed
    if (process.env.GOOGLE_PRIVATE_KEY) {
        process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
} catch (e) {
    console.warn('Could not read .env.local file', e);
}

import { getGoogleSheets } from '../src/lib/googleSheets';
import { CONFIG } from '../src/lib/config';

async function debugSheet() {
    try {
        const { getGoogleSheets } = await import('../src/lib/googleSheets');
        const { CONFIG } = await import('../src/lib/config');
        const sheets = await getGoogleSheets();

        console.log('Fetching Spreadsheet Metadata...');
        const meta = await sheets.spreadsheets.get({
            spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
        });

        const sheetNames = meta.data.sheets?.map(s => s.properties?.title) || [];
        console.log('Available Sheets:', sheetNames);

        // Find the most likely match for "入退室記録"
        const targetName = sheetNames.find(n => n?.includes('入退室') || n?.includes('記録'));

        if (targetName) {
            console.log(`Found likely match: "${targetName}". Fetching data...`);
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: CONFIG.SPREADSHEET.OCCUPANCY.ID,
                range: `${targetName}!A1:G20`,
            });

            const rows = response.data.values;
            if (!rows) {
                console.log('No data found.');
                return;
            }

            console.log(`--- RAW DATA (${targetName}) ---`);
            rows.forEach((row, index) => {
                console.log(`Row ${index + 1}: ${JSON.stringify(row)}`);
            });
            console.log('-------------------------');
        } else {
            console.error('Could not find a sheet matching "入退室" or "記録".');
        }

    } catch (error) {
        console.error('Error fetching sheet:', error);
    }
}

debugSheet();
