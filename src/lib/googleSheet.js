import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Singleton instance to prevent reloading on every command
let doc = null;

export async function getGoogleSheet() {
    if (doc) return doc;

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
        throw new Error('Thiếu cấu hình GOOGLE_SERVICE_ACCOUNT_EMAIL hoặc GOOGLE_PRIVATE_KEY trong file .env');
    }

    const serviceAccountAuth = new JWT({
        email: email,
        // Re-format chuỗi xuống dòng cho private_key sau khi lấy từ .env
        key: key.replace(/\\n/g, '\n'),
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    // LƯU Ý: User thường nhầm lẫn giữa Spreadsheet ID (Document ID) và Sheet ID (gid).
    // Con số '2112995111' rất có thể là Sheet ID (gid). 
    // Bạn cần mở file .env và thêm SPREADSHEET_ID_YT={Một chuỗi dài trên URL Google Sheet}
    const spreadsheetId = process.env.SPREADSHEET_ID_YT;
    if (!spreadsheetId) {
        throw new Error('Thiếu SPREADSHEET_ID_YT trong file .env. Vui lòng thêm nó vào.');
    }

    doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    await doc.loadInfo(); // Load document properties and worksheets

    return doc;
}
