import axios from "axios";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { DATE_FORMAT } from "../constants/date.constant.js";
import { USER_AGENT } from "../constants/user-agent.constant.js";

const GOLD_URL = "https://simplize.vn/gia-vang";

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

const FUEL_API_URL =
  "https://data.bbw.vn/api/v2/commodity-spot-prices?product=FUEL&limit=50&sort=newest";
const FUEL_WEB_URL = "https://webgia.com/gia-xang-dau/petrolimex";

/**
 * Fetches fuel prices with API priority and HTML fallback
 * @returns {Promise<{ prices: Object[], updatedAt: string }>}
 */
export async function fetchFuelPrice() {
  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://bbw.vn/",
    Origin: "https://bbw.vn",
  };

  // 1. Try API first
  try {
    console.log(`[Scraper] Attempting API fetch: ${FUEL_API_URL}`);
    const { data: apiResponse } = await axios.get(FUEL_API_URL, {
      headers: {
        ...browserHeaders,
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
      },
      timeout: 10000,
    });

    const data = apiResponse.data;
    if (data && Array.isArray(data)) {
      const fuelMap = new Map();
      let latestUpdate = "";

      data.forEach((item: any) => {
        const name = item.meta?.fuel_name;
        const zone = item.meta?.zone;
        const price = item.price?.toLocaleString("vi-VN");
        const updatedAt = item.updated_at;

        if (!name || !zone || price === undefined) return;

        if (!latestUpdate || dayjs(updatedAt).isAfter(dayjs(latestUpdate))) {
          latestUpdate = updatedAt;
        }

        if (!fuelMap.has(name)) {
          fuelMap.set(name, { name, v1: "---", v2: "---" });
        }

        const fuel = fuelMap.get(name);
        if (zone === "V1") fuel.v1 = price;
        if (zone === "V2") fuel.v2 = price;
      });

      const prices = Array.from(fuelMap.values());
      const updatedAt = latestUpdate
        ? dayjs(latestUpdate).format("HH:mm:ss DD/MM/YYYY")
        : dayjs().format("HH:mm:ss DD/MM/YYYY");

      if (prices.length > 0) {
        console.log(`[Scraper] API Success: ${prices.length} items fetched.`);
        return { prices, updatedAt };
      }
    }
  } catch (apiError: any) {
    console.warn(
      `[Scraper] API failed (${apiError.response?.status || "Error"}). Trying HTML fallback...`,
    );
  }

  // 2. Fallback to HTML Scraping (webgia.com)
  try {
    console.log(`[Scraper] Attempting HTML fallback: ${FUEL_WEB_URL}`);
    const { data: html } = await axios.get(FUEL_WEB_URL, {
      headers: {
        ...browserHeaders,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://webgia.com/",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const prices: any[] = [];
    const now = dayjs().format("HH:mm:ss DD/MM/YYYY");

    $("table.table-radius.table-hover tbody tr").each((_, el) => {
      const row = $(el);
      const name = row.find("th").text().trim();
      const cols = row.find("td.text-right");

      if (name && cols.length >= 2 && !row.find("td.donvi").length) {
        const v1 = $(cols[0]).text().trim();
        const v2 = $(cols[1]).text().trim();

        if (v1 || v2) {
          prices.push({ name, v1, v2 });
        }
      }
    });

    if (prices.length > 0) {
      console.log(`[Scraper] HTML Success: ${prices.length} items fetched.`);
      return { prices, updatedAt: now };
    }

    throw new Error("No data found in both API and HTML");
  } catch (htmlError: any) {
    console.error("[Scraper] All fetch methods failed.");
    throw htmlError;
  }
}

