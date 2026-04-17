import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

let doc: GoogleSpreadsheet | null = null;

export async function getGoogleSheet() {
  if (doc) return doc;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      "Thiếu cấu hình GOOGLE_SERVICE_ACCOUNT_EMAIL hoặc GOOGLE_PRIVATE_KEY trong file .env",
    );
  }

  const serviceAccountAuth = new JWT({
    email: email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const spreadsheetId = process.env.SPREADSHEET_ID_YT;
  if (!spreadsheetId) {
    throw new Error(
      "Thiếu SPREADSHEET_ID_YT trong file .env. Vui lòng thêm nó vào.",
    );
  }

  doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
  await doc.loadInfo(); // Load document properties and worksheets

  return doc;
}
