import axios from 'axios';
import * as cheerio from 'cheerio';

const GOLD_URL = 'https://simplize.vn/gia-vang';
const FUEL_URL = 'https://www.pvoil.com.vn/tin-gia-xang-dau';

/**
 * Fetches gold prices from simplize.vn
 * @returns {Promise<{ prices: Object[], updatedAt: string }>}
 */
export async function fetchGoldPrice() {
    try {
        const { data } = await axios.get(GOLD_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const prices = [];
        
        // Simpize doesn't have a clear "Updated At" text in the HTML, so we use current time
        const now = new Date();
        const updatedAt = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        // Targeting the main sections (.css-o7msgt)
        $('.css-o7msgt').each((i, el) => {
            const section = $(el);
            // Get text and split by ".css-" or take only the first part to avoid injected style text
            let title = section.find('h3.css-1lwpzfn').text().split('.css-')[0].trim();
            
            if (title.includes('vàng miếng') || title.includes('vàng nhẫn')) {
                const buy = section.find('.css-oija88').first().text().trim();
                const sell = section.find('.css-g6koi7').first().text().trim();
                
                if (title && buy && sell) {
                    prices.push({ 
                        name: title.replace('(vnđ/lượng)', '').trim(), 
                        buy, 
                        sell 
                    });
                }
            } else if (title.includes('vàng thế giới')) {
                // World gold has USD and VNĐ prices
                const usdPrice = section.find('.css-nxq5or').first().text().trim();
                const vndPrice = section.find('.css-nxq5or').last().text().trim();
                
                if (usdPrice) {
                    prices.push({ 
                        name: 'Vàng thế giới', 
                        buy: `${usdPrice} USD`, 
                        sell: `${vndPrice} VNĐ` 
                    });
                }
            }
        });

        return { prices, updatedAt };
    } catch (error) {
        console.error('Error fetching gold price:', error);
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const prices = [];

        const updatedAt = $('.oilpricescontainer table thead tr:first-child td[colspan="1"]').text().trim() || 'Không rõ';

        // PVOIL table structure: .oilpricescontainer table.table tbody tr
        $('.oilpricescontainer table.table tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 3) {
                const name = $(cols[1]).text().trim().replace(/\s+/g, ' ');
                const price = $(cols[2]).text().trim();

                if (name && price && (name.includes('Xăng') || name.includes('Dầu') || name.includes('RON'))) {
                    prices.push({ name, price });
                }
            }
        });

        return { prices, updatedAt };
    } catch (error) {
        console.error('Error fetching fuel price:', error);
        throw error;
    }
}
