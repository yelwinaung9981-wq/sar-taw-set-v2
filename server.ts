import express from "express";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Body parser to accept JSON payloads (Vercel automatically parses bodies, so we skip if already an object)
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return next();
    }
    express.json()(req, res, next);
  });

  // Helper function to extract high-fidelity fields from Google Places API (New) components
  function parseGooglePlace(place: any) {
    const name = place.displayName?.text || "";
    const formattedAddress = place.formattedAddress || "";
    const components = place.addressComponents || [];

    let state = "";
    let city = "";
    let postcode = "";
    let street_address = "";

    const findComponent = (types: string[]) => {
      return components.find((c: any) => c && Array.isArray(c.types) && c.types.some((t: string) => types.includes(t)))?.longText || "";
    };

    postcode = findComponent(["postal_code"]);
    state = findComponent(["administrative_area_level_1"]);

    // Choose city/township
    city = findComponent(["locality"]) || 
           findComponent(["sublocality_level_1"]) || 
           findComponent(["administrative_area_level_2"]) ||
           "Kuala Lumpur";

    // Build street address from components
    const streetNo = findComponent(["street_number"]);
    const route = findComponent(["route"]);
    const neighborhood = findComponent(["neighborhood"]) || findComponent(["sublocality"]);

    const parts: string[] = [];
    if (streetNo) parts.push(streetNo);
    if (route) parts.push(route);
    if (neighborhood) parts.push(neighborhood);

    street_address = parts.join(", ");

    // If street address is too short, generate from formattedAddress
    if (!street_address || street_address.length < 5) {
      const rawParts = formattedAddress.split(',').map((p: string) => p.trim());
      const filtered = rawParts.filter((p: string) => {
        const l = p.toLowerCase();
        if (l === 'malaysia') return false;
        if (postcode && l.includes(postcode)) return false;
        if (state && (l.includes(state.toLowerCase()) || state.toLowerCase().includes(l))) return false;
        if (city && (l.includes(city.toLowerCase()) || city.toLowerCase().includes(l))) return false;
        if (name && (l.includes(name.toLowerCase()) || name.toLowerCase().includes(l))) return false;
        return true;
      });
      street_address = filtered.join(', ');
    }

    // Default fallback to stripped address
    if (!street_address) {
      street_address = formattedAddress.replace(/,\s*Malaysia$/i, "");
    }

    const latitude = place.location?.latitude || 3.1390;
    const longitude = place.location?.longitude || 101.6869;

    return {
      building_name: name || "N/A",
      street_address: street_address,
      postcode: postcode || "50000",
      city: city,
      state: state,
      country: "Malaysia",
      latitude: latitude,
      longitude: longitude
    };
  }

  // API Routes FIRST - Securely proxy address search via Google Maps or Gemini
  app.get("/api/config/google-maps-key", (req, res) => {
    const key = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
    res.json({ key });
  });

  app.get("/api/config/mapbox-token", (req, res) => {
    const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || "";
    res.json({ token });
  });

  app.post("/api/gemini/autocomplete-address", async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: "Search query is required." });
      return;
    }

    const trimmedQuery = query.trim();

    // 1. Mapbox Search API - Tier 1
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (mapboxToken && mapboxToken !== "YOUR_API_KEY") {
      try {
        console.log(`[Autocomplete] MAPBOX_ACCESS_TOKEN is available. querying Mapbox Search API for "${trimmedQuery}"`);
        const searchURL = new URL(`https://api.mapbox.com/search/searchbox/v1/forward`);
        searchURL.searchParams.append("q", trimmedQuery);
        searchURL.searchParams.append("country", "my");
        searchURL.searchParams.append("access_token", mapboxToken);
        searchURL.searchParams.append("limit", "10");
        const response = await fetch(searchURL.toString());
        
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.features)) {
            const parsed = data.features.map((feature: any) => {
              const context = feature.properties?.context || {};
              const postcode = context.postcode?.name || "50000";
              const city = context.place?.name || context.locality?.name || "Kuala Lumpur";
              const state = context.region?.name || "WP Kuala Lumpur";
              const country = context.country?.name || "Malaysia";
              
              let fullAddr = feature.properties?.full_address || feature.properties?.address || "";
              if (fullAddr) {
                if (country) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${country}$`, 'i'), '');
                if (postcode) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${postcode}$`, 'i'), '');
                if (state && state !== "WP Kuala Lumpur") fullAddr = fullAddr.replace(new RegExp(`,?\\s*${state}$`, 'i'), '');
                if (city) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${city}$`, 'i'), '');
                // Try again in case order was different
                if (postcode) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${postcode}$`, 'i'), '');
                fullAddr = fullAddr.replace(/,\s*$/, '').trim();
              }
              
              const building = feature.properties?.name || "Selected Location";
              const address = fullAddr || feature.properties?.address || "";
              
              return {
                building_name: building,
                street_address: address,
                postcode: postcode,
                city: city,
                state: state,
                country: "Malaysia",
                latitude: Number(feature.geometry?.coordinates?.[1] || 3.139),
                longitude: Number(feature.geometry?.coordinates?.[0] || 101.686)
              };
            });
            if (parsed.length > 0) {
              console.log(`[Autocomplete] Mapbox API successfully returned ${parsed.length} results.`);
              res.json({ results: parsed, source: "mapbox" });
              return;
            } else {
              console.log(`[Autocomplete] Mapbox API returned 0 results, falling through to Google Geocode API...`);
            }
          }
        } else {
          const errText = await response.text();
          console.warn("[Autocomplete] Mapbox HTTP fallback error:", response.status, errText);
        }
      } catch (err) {
        console.error("[Autocomplete] Mapbox API fetch error:", err);
      }
    }

    // 2. Google Maps Platform Geocoding API - Tier 2
    const googleKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY;
    if (googleKey && googleKey !== "YOUR_API_KEY") {
      console.log(`[Autocomplete] GOOGLE_MAPS_PLATFORM_KEY is available. querying Google Maps Geocoding API for "${trimmedQuery}"`);
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmedQuery)}&components=country:MY&key=${googleKey}&language=en`;
        const response = await fetch(geocodeUrl, {
          method: "GET",
          headers: {
            ...(req.headers.referer ? { "Referer": req.headers.referer } : {}),
            ...(req.headers.origin ? { "Origin": req.headers.origin } : {})
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.results)) {
            const parsed = data.results.map((result: any) => {
              const components = result.address_components || [];
              const findComponent = (types: string[]) => {
                return components.find((c: any) => c && Array.isArray(c.types) && c.types.some((t: string) => types.includes(t)))?.long_name || "";
              };
              
              const postcode = findComponent(["postal_code"]);
              const state = findComponent(["administrative_area_level_1"]);
              const city = findComponent(["locality"]) || findComponent(["sublocality_level_1"]) || findComponent(["administrative_area_level_2"]);
              
              const streetNo = findComponent(["street_number"]);
              const route = findComponent(["route"]);
              const neighborhood = findComponent(["neighborhood"]) || findComponent(["sublocality"]);
              
              const parts: string[] = [];
              if (streetNo) parts.push(streetNo);
              if (route) parts.push(route);
              if (neighborhood) parts.push(neighborhood);
              let street_address = parts.join(", ");
              
              if (!street_address) {
                street_address = result.formatted_address || "N/A";
              }
              
              const pName = findComponent(["point_of_interest"]) || findComponent(["establishment"]) || street_address;

              return {
                building_name: pName,
                street_address: street_address,
                postcode: postcode || "50000",
                city: city,
                state: state,
                country: "Malaysia",
                latitude: result.geometry?.location?.lat || 3.1390,
                longitude: result.geometry?.location?.lng || 101.6869
              };
            });
            if (parsed.length > 0) {
              console.log(`[Autocomplete] Google Geocode API successfully returned ${parsed.length} results.`);
              res.json({ results: parsed, source: "google" });
              return;
            } else {
              console.log(`[Autocomplete] Google Geocode API returned 0 results, falling through to Gemini API...`);
            }
          } else if (data && data.status && data.status !== 'OK') {
             console.warn(`[Autocomplete] Google Geocode API returned status: ${data.status}`);
          }
        } else {
          const errText = await response.text();
          console.warn("[Autocomplete] Google Geocode API HTTP fallback error:", response.status, errText);
        }
      } catch (err) {
        console.error("[Autocomplete] Google Geocode API fetch error:", err);
      }
    }

    // 3. Gemini AI Grounding Search - Tier 3
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "YOUR_API_KEY" && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        console.log(`[Autocomplete] Querying Gemini for address search: "${trimmedQuery}"`);

        const systemInstruction = `You are Malaysia Address Autocomplete System (similar to TikTok Shop).
The user will input an incomplete address, building name, shop name, or landmark in Malaysia.
Your task is to:
1. Search Google to identify the real-life candidates and their precise physical addresses in Malaysia.
2. Return a JSON array of up to 5 matched candidates. Every candidate object in the array MUST strictly have these exact keys and format:
{
  "building_name": "Name of building, condo, mall, landmark, or shop name (leave as empty string or 'N/A' if none)",
  "street_address": "Street address, division, block number, or road name",
  "postcode": "5-digit postal code (postcode)",
  "city": "City/Township in Malaysia (e.g., Petaling Jaya, Shah Alam, Kuala Lumpur)",
  "state": "State in Malaysia (e.g., Selangor, Kuala Lumpur, Johor, Penang, Perak, Sabah, Sarawak, Kedah, Pahang, Kelantan, Terengganu, Melaka, Negeri Sembilan, Perlis, Putrajaya, Labuan)",
  "country": "Malaysia",
  "latitude": 3.1234, // estimated or real latitude coordinate
  "longitude": 101.5678 // estimated or real longitude coordinate
}
Ensure all keys are populated. Return ONLY a valid JSON array of objects. Do not write markdown blocks or any conversational talk outside of the JSON wrapper.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Search and autocomplete this Malaysian query: "${trimmedQuery}"`,
          config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }]
          }
        });

        const responseText = response.text || "[]";
        console.log("[Autocomplete] Received Raw Response:", responseText);

        let parsedResults = [];
        try {
          parsedResults = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON parsing failed, attempting fallback substring strategy.", parseError);
          const match = responseText.match(/\[[\s\S]*\]/);
          if (match) {
            parsedResults = JSON.parse(match[0]);
          }
        }

        res.json({ results: parsedResults, source: "gemini" });
        return;

      } catch (error: any) {
        console.warn("[Autocomplete] Gemini API error, dropping to Mapbox fallback.", error.message || error);
      }
    }

    // 3. Simple fallback when Google Places is exhausted and Gemini fails
    console.log(`[Autocomplete] Both Google Places API and Gemini failed or keys are missing for query: "${trimmedQuery}"`);
    res.status(500).json({ error: "လိပ်စာ အလိုအလျောက်ရှာဖွေမှု အဆင်မပြေပါ၊ ကျေးဇူးပြု၍ ကိုယ်တိုင်ရိုက်ထည့်ပါ", results: [], source: "error" });
  });

  // Secure translation proxy endpoint using Gemini API
  app.post("/api/gemini/translate", async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: "Text to translate is required." });
      return;
    }

    // High-Fidelity Local Translation dictionary fallback to guarantee success always, even without an active key
    const LOCAL_TRANSLATIONS: Record<string, { mmName: string, thName: string, zhName: string, msName: string }> = {
      apple: { mmName: "ပန်းသီး", thName: "แอปเปิ้ล", zhName: "苹果", msName: "Epal" },
      banana: { mmName: "ငှက်ပျောသီး", thName: "กล้วย", zhName: "香蕉", msName: "Pisang" },
      orange: { mmName: "လိမ္မော်သီး", thName: "ส้ม", zhName: "橙子", msName: "Oren" },
      grape: { mmName: "စပျစ်သီး", thName: "องุ่น", zhName: "葡萄", msName: "Anggur" },
      strawberry: { mmName: "စတော်ဘယ်ရီသီး", thName: "สตรอเบอร์รี่", zhName: "草莓", msName: "Strawberi" },
      mango: { mmName: "သရက်သီး", thName: "มะม่วง", zhName: "芒果", msName: "Mangga" },
      watermelon: { mmName: "ဖရဲသီး", thName: "แตงโม", zhName: "西瓜", msName: "Tembikai" },
      pineapple: { mmName: "နာနတ်သီး", thName: "สับปะรด", zhName: "菠萝", msName: "Nanas" },
      avocado: { mmName: "ထောပတ်သီး", thName: "อะโวคาโด", zhName: "牛油果", msName: "Alpukat" },
      papaya: { mmName: "သင်္ဘောသီး", thName: "มะละกอ", zhName: "木瓜", msName: "Betik" },
      coconut: { mmName: "အုန်းသီး", thName: "มะพร้าว", zhName: "椰子", msName: "Kelapa" },
      lemon: { mmName: "သံပရာသီး", thName: "มะนาว", zhName: "柠檬", msName: "Lemon" },
      lime: { mmName: "သံပရာသီး", thName: "มะนาวแป้น", zhName: "青柠", msName: "Limau Nipis" },
      potato: { mmName: "အာလူး", thName: "มันฝรั่ง", zhName: "土豆", msName: "Kentang" },
      onion: { mmName: "ကြက်သွန်နီ", thName: "หัวหอม", zhName: "洋葱", msName: "Bawang" },
      garlic: { mmName: "ကြက်သွန်ဖြူ", thName: "กระเทียม", zhName: "大蒜", msName: "Bawang Putih" },
      ginger: { mmName: "ဂျင်း", thName: "ขิง", zhName: "生姜", msName: "Halia" },
      tomato: { mmName: "ခရမ်းချဉ်သီး", thName: "มะเขือเทศ", zhName: "番茄", msName: "Tomato" },
      carrot: { mmName: "ကတ်ရတ်", thName: "แครอท", zhName: "胡萝卜", msName: "Lobak Merah" },
      cabbage: { mmName: "ဂေါ်ဖီထုပ်", thName: "กะหล่ำปลี", zhName: "卷心菜", msName: "Kubis" },
      broccoli: { mmName: "ပန်းဂေါ်ဖီစိမ်း", thName: "บล็อคโคลี่", zhName: "西兰花", msName: "Brokoli" },
      spinach: { mmName: "ဟင်းနုနွယ်", thName: "ผักโขม", zhName: "菠菜", msName: "Bayam" },
      cucumber: { mmName: "သခွားသီး", thName: "แตงกวา", zhName: "黄瓜", msName: "Timun" },
      pumpkin: { mmName: "ရွှေဖရုံသီး", thName: "ฟักทอง", zhName: "南瓜", msName: "Labu" },
      corn: { mmName: "ပြောင်းဖူး", thName: "ข้าวโพด", zhName: "玉米", msName: "Jagung" },
      eggplant: { mmName: "ခရမ်းသီး", thName: "มะเขือยาว", zhName: "茄子", msName: "Terong" },
      milk: { mmName: "လတ်ဆတ်သောနို့", thName: "นมสด", zhName: "鲜牛奶", msName: "Susu Segar" },
      yogurt: { mmName: "ဒိန်ချဉ်", thName: "โยเกิร์ต", zhName: "酸奶", msName: "Yogurt" },
      cheese: { mmName: "ဒိန်ခဲ", thName: "ชีส", zhName: "奶酪", msName: "Keju" },
      butter: { mmName: "ထောပတ်", thName: "เนย", zhName: "黄油", msName: "Mentega" },
      egg: { mmName: "ကြက်ဥ", thName: "ไข่ไก่", zhName: "鸡蛋", msName: "Telur" },
      eggs: { mmName: "ကြက်ဥ", thName: "ไข่ไก่", zhName: "鸡蛋", msName: "Telur" },
      chicken: { mmName: "ကြက်သား", thName: "เนื้อไก่", zhName: "鸡肉", msName: "Ayam" },
      pork: { mmName: "ဝက်သား", thName: "เนื้อหมู", zhName: "猪肉", msName: "Daging Babi" },
      beef: { mmName: "အမဲသား", thName: "เนื้อวัว", zhName: "牛肉", msName: "Daging Lembu" },
      mutton: { mmName: "ဆိတ်သား", thName: "เนื้อแพะ", zhName: "羊肉", msName: "Daging Kambing" },
      fish: { mmName: "လတ်ဆတ်သောငါး", thName: "ปลาสด", zhName: "鲜鱼", msName: "Ikan Segar" },
      shrimp: { mmName: "ပုစွန်", thName: "กุ้ง", zhName: "虾", msName: "Udang" },
      crab: { mmName: "ဂဏန်း", thName: "ปู", zhName: "螃蟹", msName: "Ketam" },
      squid: { mmName: "ပြည်ကြီးငါး", thName: "ปลาหมึก", zhName: "鱿鱼", msName: "Sotong" },
      rice: { mmName: "ဆန်", thName: "ข้าวสาร", zhName: "大米", msName: "Beras" },
      bread: { mmName: "ပေါင်မုန့်", thName: "ขนมปัง", zhName: "面包", msName: "Roti" },
      noodle: { mmName: "ခေါက်ဆွဲ", thName: "บะหมี่", zhName: "面条", msName: "Mi" },
      water: { mmName: "သောက်ရေသန့်", thName: "น้ำดื่ม", zhName: "饮用水", msName: "Air Minuman" },
      juice: { mmName: "သစ်သီးဖျော်ရည်", thName: "น้ำผลไม้", zhName: "果汁", msName: "Jus" },
      soda: { mmName: "အချိုရည်", thName: "น้ำอัดลม", zhName: "汽水", msName: "Soda" },
      beer: { mmName: "ဘီယာ", thName: "เบียร์", zhName: "啤酒", msName: "Bir" },
      wine: { mmName: "ဝိုင်", thName: "ไวน์", zhName: "葡萄酒", msName: "Wain" },
      coffee: { mmName: "ကော်ဖီ", thName: "กาแฟ", zhName: "咖啡", msName: "Kopi" },
      tea: { mmName: "လက်ဖက်ရည်", thName: "ชา", zhName: "茶", msName: "Teh" },
      sugar: { mmName: "သကြား", thName: "น้ำตาล", zhName: "糖", msName: "Gula" },
      salt: { mmName: "ဆား", thName: "เกลือ", zhName: "盐", msName: "Garam" },
      oil: { mmName: "ဟင်းချက်ဆီ", thName: "น้ำมันพืช", zhName: "食用油", msName: "Minyak Masak" },
      sauce: { mmName: "ဆော့စ်", thName: "ซอส", zhName: "酱汁", msName: "Sos" },
      pepper: { mmName: "ငရုတ်ကောင်း", thName: "พริกไทย", zhName: "胡椒粉", msName: "Lada" },
      chili: { mmName: "ငရုတ်သီး", thName: "พริก", zhName: "辣椒", msName: "Cili" },
      soap: { mmName: "ဆပ်ပြာ", thName: "สบู่", zhName: "肥皂", msName: "Sabun" },
      shampoo: { mmName: "ခေါင်းလျှော်ရည်", thName: "ยาสระผม", zhName: "洗发水", msName: "Syampu" },
      toothpaste: { mmName: "သွားတိုက်ဆေး", thName: "ยาสีฟัน", zhName: "牙膏", msName: "Ubat Gigi" },
      snack: { mmName: "မုန့်ပဲသွားရည်စာ", thName: "ขนมขบเคี้ยว", zhName: "零食", msName: "Snek" },
      chocolate: { mmName: "ချောကလက်", thName: "ช็อกโกแลต", zhName: "巧克力", msName: "Coklat" },
      biscuit: { mmName: "ဘီစကွတ်", thName: "บิสกิต", zhName: "饼干", msName: "Biskut" },
      honey: { mmName: "ပျားရည်", thName: "น้ำผึ้ง", zhName: "蜂蜜", msName: "Madu" },
      meat: { mmName: "အသား", thName: "เนื้อสัตว์", zhName: "肉类", msName: "Daging" },
    };

    const getLocalFallback = (inputText: string) => {
      const normalized = inputText.toLowerCase().trim();
      
      // 1. Direct match
      if (LOCAL_TRANSLATIONS[normalized]) {
        return LOCAL_TRANSLATIONS[normalized];
      }
      
      // 2. Token/partial match (split words and find key elements)
      const tokens = normalized.split(/\s+/);
      for (const token of tokens) {
        if (LOCAL_TRANSLATIONS[token] && token.length > 2) {
          const match = LOCAL_TRANSLATIONS[token];
          const isOrganic = normalized.includes("organic");
          const isPremium = normalized.includes("premium");
          
          const prefixMM = isOrganic ? "အော်ဂဲနစ် " : isPremium ? "ပရီမီယံ " : "";
          const prefixTH = isOrganic ? "ออร์แกนิก " : isPremium ? "พรีเมียม " : "";
          const prefixZH = isOrganic ? "有机" : isPremium ? "优质" : "";
          const prefixMS = isOrganic ? "Organik " : isPremium ? "Premium " : "";

          return {
            mmName: prefixMM + match.mmName,
            thName: prefixTH + match.thName,
            zhName: prefixZH + match.zhName,
            msName: prefixMS + match.msName
          };
        }
      }

      // Generic default
      return {
        mmName: inputText,
        thName: inputText,
        zhName: inputText,
        msName: inputText
      };
    };

    const fallbackResult = getLocalFallback(text);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "YOUR_API_KEY" || apiKey === "MY_GEMINI_API_KEY") {
      console.log(`[Translate] No API key, serving local dictionary fallback for: "${text}"`);
      res.json({
        ...fallbackResult,
        warning: "Translation API Key not configured. Using intelligent dictionary lookup."
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      console.log(`[Translate] Requesting Gemini translation for: "${text}"`);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Translate the following grocery/supermarket product name into Myanmar (Burmese), Thai, Chinese (Simplified/Universal), and Malay. 
        Return the result as a detailed JSON object with keys: mmName, thName, zhName, msName.
        Do not output any markdown blocks or formatting outside of raw JSON.
        Product Name: ${text.trim()}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mmName: { type: Type.STRING, description: "Myanmar (Burmese) translation" },
              thName: { type: Type.STRING, description: "Thai translation" },
              zhName: { type: Type.STRING, description: "Chinese Simplified translation" },
              msName: { type: Type.STRING, description: "Malay translation" },
            },
            required: ["mmName", "thName", "zhName", "msName"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text from Gemini API.");
      }

      console.log("[Translate] Success:", responseText);
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error("[Translate Exception]:", error);
      // Serve direct high-fidelity fallback on model error or quota block
      res.json({
        ...fallbackResult,
        warning: "Gemini server failed. Using dictionary backup."
      });
    }
  });

  // Highlighted Addition: API Route for reverse-geocoding of raw GPS coordinates to resolve accurate address fields
  app.post("/api/google/reverse-geocode", async (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: "Missing latitude and longitude in body." });
      return;
    }

    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (mapboxToken && mapboxToken !== "YOUR_API_KEY") {
      try {
        console.log(`[Reverse Geocode] Routing reverse-geocody lookup to Mapbox for lat: ${latitude}, lng: ${longitude}`);
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${mapboxToken}`);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.features) && data.features.length > 0) {
            const firstResult = data.features[0];
            const context = firstResult.properties?.context || {};
            
            const postcode = context.postcode?.name || "50000";
            const city = context.place?.name || context.locality?.name || "Kuala Lumpur";
            const state = context.region?.name || "WP Kuala Lumpur";
            const country = context.country?.name || "Malaysia";
            
            let fullAddr = firstResult.properties?.full_address || firstResult.properties?.address || "";
            if (fullAddr) {
              if (country) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${country}$`, 'i'), '');
              if (postcode) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${postcode}$`, 'i'), '');
              if (state && state !== "WP Kuala Lumpur") fullAddr = fullAddr.replace(new RegExp(`,?\\s*${state}$`, 'i'), '');
              if (city) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${city}$`, 'i'), '');
              if (postcode) fullAddr = fullAddr.replace(new RegExp(`,?\\s*${postcode}$`, 'i'), '');
              fullAddr = fullAddr.replace(/,\s*$/, '').trim();
            }
            
            const building = firstResult.properties?.name || "Selected Location";
            const address = fullAddr || firstResult.properties?.address || "";
            
            res.json({
              building_name: building,
              street_address: address,
              postcode: postcode,
              city: city,
              state: state,
              country: "Malaysia",
              latitude: Number(latitude),
              longitude: Number(longitude)
            });
            return;
          }
        }
      } catch (err) {
        console.error("[Reverse Geocode Error] Mapbox API endpoint failure:", err);
      }
    }

    const googleKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY;
    if (googleKey && googleKey !== "YOUR_API_KEY") {
      try {
        console.log(`[Reverse Geocode] Routing reverse-geocody lookup to Google Maps for lat: ${latitude}, lng: ${longitude}`);
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}&language=en`, {
          headers: {
            ...(req.headers.referer ? { "Referer": req.headers.referer } : {}),
            ...(req.headers.origin ? { "Origin": req.headers.origin } : {})
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            const firstResult = data.results[0];
            const formattedAddress = firstResult.formatted_address || "";
            const components = firstResult.address_components || [];

            let state = "";
            let city = "";
            let postcode = "";
            let street_address = "";

            const findComponent = (types: string[]) => {
              return components.find((c: any) => c && Array.isArray(c.types) && c.types.some((t: string) => types.includes(t)))?.long_name || "";
            };

            postcode = findComponent(["postal_code"]);
            state = findComponent(["administrative_area_level_1"]);
            city = findComponent(["locality"]) || findComponent(["sublocality_level_1"]) || findComponent(["administrative_area_level_2"]);

            const streetNo = findComponent(["street_number"]);
            const route = findComponent(["route"]);
            const neighborhood = findComponent(["neighborhood"]) || findComponent(["sublocality"]);

            const parts: string[] = [];
            if (streetNo) parts.push(streetNo);
            if (route) parts.push(route);
            if (neighborhood) parts.push(neighborhood);

            street_address = parts.join(", ");

            if (!street_address || street_address.length < 5) {
              const rawParts = formattedAddress.split(',').map((p: string) => p.trim());
              const filtered = rawParts.filter((p: string) => {
                const l = p.toLowerCase();
                if (l === 'malaysia') return false;
                if (postcode && l.includes(postcode)) return false;
                if (state && (l.includes(state.toLowerCase()) || state.toLowerCase().includes(l))) return false;
                if (city && (l.includes(city.toLowerCase()) || city.toLowerCase().includes(l))) return false;
                return true;
              });
              street_address = filtered.join(', ');
            }

            if (!street_address) {
              street_address = formattedAddress.replace(/,\s*Malaysia$/i, "");
            }

            res.json({
              building_name: "Selected Location",
              street_address: street_address,
              postcode: postcode || "50000",
              city: city || "Kuala Lumpur",
              state: state || "WP Kuala Lumpur",
              country: "Malaysia",
              latitude: Number(latitude),
              longitude: Number(longitude)
            });
            return;
          }
        }
      } catch (err) {
        console.error("[Reverse Geocode Error] Google Maps API endpoint failure:", err);
      }
    }

    // Standard hardcoded smart coordinate euclidean hubs mapping fallback as final tier
    const hubs = [
      { state: "WP Kuala Lumpur", city: "Kuala Lumpur", postcode: "50000", lat: 3.139, lng: 101.686 },
      { state: "Selangor", city: "Petaling Jaya", postcode: "46000", lat: 3.107, lng: 101.606 },
      { state: "Johor", city: "Johor Bahru", postcode: "80000", lat: 1.492, lng: 103.741 },
      { state: "Penang", city: "George Town", postcode: "10000", lat: 5.414, lng: 100.329 },
      { state: "Sabah", city: "Kota Kinabalu", postcode: "88000", lat: 5.978, lng: 116.075 },
      { state: "Sarawak", city: "Kuching", postcode: "93000", lat: 1.553, lng: 110.359 }
    ];

    let matchedHub = hubs[0];
    let minDistance = Infinity;

    hubs.forEach((h) => {
      const distance = Math.sqrt(Math.pow(latitude - h.lat, 2) + Math.pow(longitude - h.lng, 2));
      if (distance < minDistance) {
        minDistance = distance;
        matchedHub = h;
      }
    });

    res.json({
      building_name: "Selected Location",
      street_address: "Jalan Utama",
      postcode: matchedHub.postcode,
      city: matchedHub.city,
      state: matchedHub.state,
      country: "Malaysia",
      latitude: Number(latitude),
      longitude: Number(longitude)
    });
  });

  // API route to securely delete a Cloudinary asset if API Key and Secret are configured
  app.post("/api/cloudinary/delete", async (req, res) => {
    let { publicId, imageUrl, cloudName, apiKey: bodyApiKey, apiSecret: bodyApiSecret } = req.body;

    const apiKey = bodyApiKey || process.env.CLOUDINARY_API_KEY;
    const apiSecret = bodyApiSecret || process.env.CLOUDINARY_API_SECRET;
    const defaultCloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const activeCloudName = cloudName || defaultCloudName;

    if (!apiKey || !apiSecret || !activeCloudName) {
      console.warn("[Cloudinary Delete] Server-side Cloudinary credentials are not fully configured. Skipping actual Cloudinary asset deletion.");
      res.status(200).json({ 
        success: false, 
        message: "Cloudinary credentials (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, or Cloud Name) are not configured." 
      });
      return;
    }

    try {
      // If publicId was not supplied but imageUrl was, try to parse publicId from URL
      if (!publicId && imageUrl) {
        console.log(`[Cloudinary Delete] Parsing public ID from url: ${imageUrl}`);
        const parts = imageUrl.split('/image/upload/');
        if (parts.length >= 2) {
          let pathAndId = parts[1];
          if (pathAndId.match(/^v\d+\//)) {
            pathAndId = pathAndId.replace(/^v\d+\//, '');
          }
          const dotIndex = pathAndId.lastIndexOf('.');
          if (dotIndex !== -1) {
            pathAndId = pathAndId.substring(0, dotIndex);
          }
          publicId = pathAndId;
        }
      }

      if (!publicId) {
        res.status(400).json({ error: "Missing publicId or parseable imageUrl in body." });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      const url = `https://api.cloudinary.com/v1_1/${activeCloudName}/image/destroy`;
      
      console.log(`[Cloudinary Delete] Requesting asset destruction for publicId: "${publicId}" in cloud: "${activeCloudName}"`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: apiKey,
          timestamp: timestamp,
          signature: signature
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary Destroy API returned HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log("[Cloudinary Delete] Destroy response received:", responseData);
      
      res.json({
        success: true,
        data: responseData
      });
    } catch (destroyError: any) {
      console.error("[Cloudinary Delete Exception]:", destroyError);
      res.status(500).json({ error: destroyError.message || "Failed to delete asset from Cloudinary" });
    }
  });

  // API route to securely proxy Telegram notifications and bypass client-side connection/CORS limitations/blocks
  app.post("/api/telegram/send", async (req, res) => {
    const { token, chatId, message } = req.body;
    
    if (!token || !chatId || !message) {
      res.status(400).json({ error: "Missing token, chatId, or message in request body" });
      return;
    }

    try {
      console.log(`[Telegram Proxy] Sending notification to chat ID: ${chatId}...`);
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML"
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Telegram API returned HTTP ${response.status}: ${errText}`);
      }

      const responseData = await response.json();
      console.log(`[Telegram Proxy] Successfully sent message to chat ID: ${chatId}`);
      res.json({ success: true, data: responseData });
    } catch (error: any) {
      console.error("[Telegram Proxy Error]:", error);
      res.status(500).json({ error: error.message || "Failed to send Telegram notification" });
    }
  });

  // Serve static assets or use Vite dev middleware
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const viteMod = "vi" + "te";
    import(viteMod).then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Development server running on http://localhost:${PORT}`);
        });
      });
    });
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running securely on port ${PORT}`);
    });
  }

  export default app;

