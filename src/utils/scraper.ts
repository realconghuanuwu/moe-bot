import axios from "axios";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { DATE_FORMAT } from "../constants/date.constant.js";
import { USER_AGENT } from "../constants/user-agent.constant.js";

const GOLD_URL = "https://simplize.vn/gia-vang";
const FUEL_URL = "https://www.pvoil.com.vn/tin-gia-xang-dau";

/**
 * Fetches gold prices from simplize.vn
 * @returns {Promise<{ prices: Object[], updatedAt: string }>}
 */
export async function fetchGoldPrice() {
  try {
    const { data } = await axios.get(GOLD_URL, {
      headers: {
        "User-Agent": USER_AGENT.WEB,
      },
    });
    const $ = cheerio.load(data);
    const prices: {
      name: string;
      buy: string;
      sell: string;
      buyDiff?: string;
      sellDiff?: string;
    }[] = [];

    const now = dayjs();
    const updatedAt = now.format(DATE_FORMAT.TIME_DATE_ONE);

    // Targeting the table rows
    $("tr.simplize-table-row").each((i, el) => {
      const row = $(el);
      const cols = row.find("td");
      if (cols.length >= 3) {
        const name = $(cols[0]).find("h6").first().text().trim();

        const buyCol = $(cols[1]);
        const buy = buyCol.find("h6").first().text().trim();
        const buyDiff = buyCol.find("span").first().text().trim();

        const sellCol = $(cols[2]);
        const sell = sellCol.find("h6").first().text().trim();
        const sellDiff = sellCol.find("span").first().text().trim();

        if (name && buy && sell) {
          prices.push({
            name,
            buy,
            sell,
            buyDiff,
            sellDiff,
          });
        }
      }
    });

    return { prices, updatedAt };
  } catch (error) {
    console.error("Error fetching gold price:", error);
    throw error;
  }
}

/**
 * Fetches fuel prices from PVOIL
 * @returns {Promise<{ prices: Object[], updatedAt: string }>}
 */
export async function fetchFuelPrice() {
  try {
    const { data } = await axios.get(FUEL_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const $ = cheerio.load(data);
    const prices: { name: string; price: string }[] = [];

    const updatedAt =
      $('.oilpricescontainer table thead tr:first-child td[colspan="1"]')
        .text()
        .trim() || "Không rõ";

    // PVOIL table structure: .oilpricescontainer table.table tbody tr
    $(".oilpricescontainer table.table tbody tr").each((i, el) => {
      const cols = $(el).find("td");
      if (cols.length >= 3) {
        const name = $(cols[1]).text().trim().replace(/\s+/g, " ");
        const price = $(cols[2]).text().trim();

        if (
          name &&
          price &&
          (name.includes("Xăng") ||
            name.includes("Dầu") ||
            name.includes("RON"))
        ) {
          prices.push({ name, price });
        }
      }
    });

    return { prices, updatedAt };
  } catch (error) {
    console.error("Error fetching fuel price:", error);
    throw error;
  }
}
