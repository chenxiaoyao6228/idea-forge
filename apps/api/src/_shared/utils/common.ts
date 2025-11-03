import axios from "axios";
import * as iconv from "iconv-lite";

/**
 * Convert IP address to city name using pconline API
 * @param ip IP address to lookup
 * @returns City name or empty string if lookup fails
 */
export async function ipToCity(ip: string): Promise<string> {
  try {
    const response = await axios.get(`https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`, {
      responseType: "arraybuffer",
      transformResponse: [
        (data) => {
          const str = iconv.decode(data, "gbk");
          return JSON.parse(str);
        },
      ],
    });
    return response.data.addr || "";
  } catch (error) {
    console.error("Failed to get IP location:", error);
    return "";
  }
}
