"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var path_1 = __importDefault(require("path"));
var crypto_1 = __importDefault(require("crypto"));
var genai_1 = require("@google/genai");
var app = (0, express_1.default)();
var PORT = 3000;
// Body parser to accept JSON payloads (Vercel automatically parses bodies, so we skip if already an object)
app.use(function (req, res, next) {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return next();
    }
    express_1.default.json()(req, res, next);
});
// Helper function to extract high-fidelity fields from Google Places API (New) components
function parseGooglePlace(place) {
    var _a, _b, _c;
    var name = ((_a = place.displayName) === null || _a === void 0 ? void 0 : _a.text) || "";
    var formattedAddress = place.formattedAddress || "";
    var components = place.addressComponents || [];
    var state = "";
    var city = "";
    var postcode = "";
    var street_address = "";
    var findComponent = function (types) {
        var _a;
        return ((_a = components.find(function (c) { return c && Array.isArray(c.types) && c.types.some(function (t) { return types.includes(t); }); })) === null || _a === void 0 ? void 0 : _a.longText) || "";
    };
    postcode = findComponent(["postal_code"]);
    state = findComponent(["administrative_area_level_1"]);
    // Choose city/township
    city = findComponent(["locality"]) ||
        findComponent(["sublocality_level_1"]) ||
        findComponent(["administrative_area_level_2"]) ||
        "Kuala Lumpur";
    // Build street address from components
    var streetNo = findComponent(["street_number"]);
    var route = findComponent(["route"]);
    var neighborhood = findComponent(["neighborhood"]) || findComponent(["sublocality"]);
    var parts = [];
    if (streetNo)
        parts.push(streetNo);
    if (route)
        parts.push(route);
    if (neighborhood)
        parts.push(neighborhood);
    street_address = parts.join(", ");
    // If street address is too short, generate from formattedAddress
    if (!street_address || street_address.length < 5) {
        var rawParts = formattedAddress.split(',').map(function (p) { return p.trim(); });
        var filtered = rawParts.filter(function (p) {
            var l = p.toLowerCase();
            if (l === 'malaysia')
                return false;
            if (postcode && l.includes(postcode))
                return false;
            if (state && (l.includes(state.toLowerCase()) || state.toLowerCase().includes(l)))
                return false;
            if (city && (l.includes(city.toLowerCase()) || city.toLowerCase().includes(l)))
                return false;
            if (name && (l.includes(name.toLowerCase()) || name.toLowerCase().includes(l)))
                return false;
            return true;
        });
        street_address = filtered.join(', ');
    }
    // Default fallback to stripped address
    if (!street_address) {
        street_address = formattedAddress.replace(/,\s*Malaysia$/i, "");
    }
    var latitude = ((_b = place.location) === null || _b === void 0 ? void 0 : _b.latitude) || 3.1390;
    var longitude = ((_c = place.location) === null || _c === void 0 ? void 0 : _c.longitude) || 101.6869;
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
app.get("/api/config/google-maps-key", function (req, res) {
    var key = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
    res.json({ key: key });
});
app.get("/api/config/mapbox-token", function (req, res) {
    var token = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || "";
    res.json({ token: token });
});
app.post("/api/gemini/autocomplete-address", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var query, trimmedQuery, googleKey, response, data, parsed, errText, err_1, mapboxToken, searchURL, response, data, parsed, errText, err_2, apiKey, ai, systemInstruction, response, responseText, parsedResults, match, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = req.body.query;
                if (!query || typeof query !== 'string' || !query.trim()) {
                    res.status(400).json({ error: "Search query is required." });
                    return [2 /*return*/];
                }
                trimmedQuery = query.trim();
                googleKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
                if (!(googleKey && googleKey !== "YOUR_API_KEY")) return [3 /*break*/, 8];
                console.log("[Autocomplete] GOOGLE_MAPS_PLATFORM_KEY is available. querying Google Maps Platform (New) Places API for \"".concat(trimmedQuery, "\""));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, fetch("https://places.googleapis.com/v1/places:searchText", {
                        method: "POST",
                        headers: __assign(__assign({ "Content-Type": "application/json", "X-Goog-Api-Key": googleKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.types,places.location" }, (req.headers.referer ? { "Referer": req.headers.referer } : {})), (req.headers.origin ? { "Origin": req.headers.origin } : {})),
                        body: JSON.stringify({
                            textQuery: "".concat(trimmedQuery, ", Malaysia"),
                            languageCode: "en",
                            locationRestriction: {
                                rectangle: {
                                    low: { latitude: 0.8, longitude: 99.5 },
                                    high: { latitude: 7.4, longitude: 119.3 }
                                }
                            }
                        })
                    })];
            case 2:
                response = _a.sent();
                if (!response.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, response.json()];
            case 3:
                data = _a.sent();
                if (data && Array.isArray(data.places)) {
                    parsed = data.places.map(function (place) { return parseGooglePlace(place); });
                    console.log("[Autocomplete] Google Places API successfully returned ".concat(parsed.length, " results."));
                    res.json({ results: parsed, source: "google" });
                    return [2 /*return*/];
                }
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, response.text()];
            case 5:
                errText = _a.sent();
                console.warn("[Autocomplete] Google Places API HTTP fallback error:", response.status, errText);
                _a.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                err_1 = _a.sent();
                console.error("[Autocomplete] Google Places API fetch error:", err_1);
                return [3 /*break*/, 8];
            case 8:
                mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || "";
                if (!(mapboxToken && mapboxToken !== "YOUR_API_KEY")) return [3 /*break*/, 16];
                _a.label = 9;
            case 9:
                _a.trys.push([9, 15, , 16]);
                console.log("[Autocomplete] MAPBOX_ACCESS_TOKEN is available. querying Mapbox Search API for \"".concat(trimmedQuery, "\""));
                searchURL = new URL("https://api.mapbox.com/search/geocode/v6/forward");
                searchURL.searchParams.append("q", "".concat(trimmedQuery, ", Malaysia"));
                searchURL.searchParams.append("access_token", mapboxToken);
                searchURL.searchParams.append("limit", "5");
                return [4 /*yield*/, fetch(searchURL.toString())];
            case 10:
                response = _a.sent();
                if (!response.ok) return [3 /*break*/, 12];
                return [4 /*yield*/, response.json()];
            case 11:
                data = _a.sent();
                if (data && Array.isArray(data.features)) {
                    parsed = data.features.map(function (feature) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                        var context = ((_a = feature.properties) === null || _a === void 0 ? void 0 : _a.context) || {};
                        var postcode = ((_b = context.postcode) === null || _b === void 0 ? void 0 : _b.name) || "50000";
                        var city = ((_c = context.place) === null || _c === void 0 ? void 0 : _c.name) || ((_d = context.locality) === null || _d === void 0 ? void 0 : _d.name) || "Kuala Lumpur";
                        var state = ((_e = context.region) === null || _e === void 0 ? void 0 : _e.name) || "WP Kuala Lumpur";
                        var building = ((_f = feature.properties) === null || _f === void 0 ? void 0 : _f.name) || ((_g = feature.properties) === null || _g === void 0 ? void 0 : _g.full_address) || "Selected Location";
                        var address = ((_h = feature.properties) === null || _h === void 0 ? void 0 : _h.name) || ((_j = feature.properties) === null || _j === void 0 ? void 0 : _j.full_address) || "";
                        return {
                            building_name: building,
                            street_address: address,
                            postcode: postcode,
                            city: city,
                            state: state,
                            country: "Malaysia",
                            latitude: Number(((_l = (_k = feature.geometry) === null || _k === void 0 ? void 0 : _k.coordinates) === null || _l === void 0 ? void 0 : _l[1]) || 3.139),
                            longitude: Number(((_o = (_m = feature.geometry) === null || _m === void 0 ? void 0 : _m.coordinates) === null || _o === void 0 ? void 0 : _o[0]) || 101.686)
                        };
                    });
                    console.log("[Autocomplete] Mapbox API successfully returned ".concat(parsed.length, " results."));
                    res.json({ results: parsed, source: "mapbox" });
                    return [2 /*return*/];
                }
                return [3 /*break*/, 14];
            case 12: return [4 /*yield*/, response.text()];
            case 13:
                errText = _a.sent();
                console.warn("[Autocomplete] Mapbox HTTP fallback error:", response.status, errText);
                _a.label = 14;
            case 14: return [3 /*break*/, 16];
            case 15:
                err_2 = _a.sent();
                console.error("[Autocomplete] Mapbox API fetch error:", err_2);
                return [3 /*break*/, 16];
            case 16:
                apiKey = process.env.GEMINI_API_KEY;
                if (!(apiKey && apiKey !== "YOUR_API_KEY" && apiKey !== "MY_GEMINI_API_KEY")) return [3 /*break*/, 20];
                _a.label = 17;
            case 17:
                _a.trys.push([17, 19, , 20]);
                ai = new genai_1.GoogleGenAI({
                    apiKey: apiKey,
                    httpOptions: {
                        headers: {
                            'User-Agent': 'aistudio-build',
                        }
                    }
                });
                console.log("[Autocomplete] Querying Gemini for address search: \"".concat(trimmedQuery, "\""));
                systemInstruction = "You are Malaysia Address Autocomplete System (similar to TikTok Shop).\nThe user will input an incomplete address, building name, shop name, or landmark in Malaysia.\nYour task is to:\n1. Search Google to identify the real-life candidates and their precise physical addresses in Malaysia.\n2. Return a JSON array of up to 5 matched candidates. Every candidate object in the array MUST strictly have these exact keys and format:\n{\n  \"building_name\": \"Name of building, condo, mall, landmark, or shop name (leave as empty string or 'N/A' if none)\",\n  \"street_address\": \"Street address, division, block number, or road name\",\n  \"postcode\": \"5-digit postal code (postcode)\",\n  \"city\": \"City/Township in Malaysia (e.g., Petaling Jaya, Shah Alam, Kuala Lumpur)\",\n  \"state\": \"State in Malaysia (e.g., Selangor, Kuala Lumpur, Johor, Penang, Perak, Sabah, Sarawak, Kedah, Pahang, Kelantan, Terengganu, Melaka, Negeri Sembilan, Perlis, Putrajaya, Labuan)\",\n  \"country\": \"Malaysia\",\n  \"latitude\": 3.1234, // estimated or real latitude coordinate\n  \"longitude\": 101.5678 // estimated or real longitude coordinate\n}\nEnsure all keys are populated. Return ONLY a valid JSON array of objects. Do not write markdown blocks or any conversational talk outside of the JSON wrapper.";
                return [4 /*yield*/, ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: "Search and autocomplete this Malaysian query: \"".concat(trimmedQuery, "\""),
                        config: {
                            systemInstruction: systemInstruction,
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: genai_1.Type.ARRAY,
                                items: {
                                    type: genai_1.Type.OBJECT,
                                    properties: {
                                        building_name: { type: genai_1.Type.STRING },
                                        street_address: { type: genai_1.Type.STRING },
                                        postcode: { type: genai_1.Type.STRING },
                                        city: { type: genai_1.Type.STRING },
                                        state: { type: genai_1.Type.STRING },
                                        country: { type: genai_1.Type.STRING },
                                        latitude: { type: genai_1.Type.NUMBER },
                                        longitude: { type: genai_1.Type.NUMBER }
                                    },
                                    required: ["building_name", "street_address", "postcode", "city", "state", "country", "latitude", "longitude"]
                                }
                            },
                            tools: [{ googleSearch: {} }],
                            toolConfig: { includeServerSideToolInvocations: true }
                        }
                    })];
            case 18:
                response = _a.sent();
                responseText = response.text || "[]";
                console.log("[Autocomplete] Received Raw Response:", responseText);
                parsedResults = [];
                try {
                    parsedResults = JSON.parse(responseText);
                }
                catch (parseError) {
                    console.error("JSON parsing failed, attempting fallback substring strategy.", parseError);
                    match = responseText.match(/\[[\s\S]*\]/);
                    if (match) {
                        parsedResults = JSON.parse(match[0]);
                    }
                }
                res.json({ results: parsedResults, source: "gemini" });
                return [2 /*return*/];
            case 19:
                error_1 = _a.sent();
                console.warn("[Autocomplete] Gemini API error, dropping to Mapbox fallback.", error_1.message || error_1);
                return [3 /*break*/, 20];
            case 20:
                // 3. Simple fallback when Google Places is exhausted and Gemini fails
                console.log("[Autocomplete] Both Google Places API and Gemini failed or keys are missing for query: \"".concat(trimmedQuery, "\""));
                res.status(500).json({ error: "လိပ်စာ အလိုအလျောက်ရှာဖွေမှု အဆင်မပြေပါ၊ ကျေးဇူးပြု၍ ကိုယ်တိုင်ရိုက်ထည့်ပါ", results: [], source: "error" });
                return [2 /*return*/];
        }
    });
}); });
// Secure translation proxy endpoint using Gemini API
app.post("/api/gemini/translate", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var text, LOCAL_TRANSLATIONS, getLocalFallback, fallbackResult, apiKey, ai, response, responseText, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                text = req.body.text;
                if (!text || typeof text !== 'string' || !text.trim()) {
                    res.status(400).json({ error: "Text to translate is required." });
                    return [2 /*return*/];
                }
                LOCAL_TRANSLATIONS = {
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
                getLocalFallback = function (inputText) {
                    var normalized = inputText.toLowerCase().trim();
                    // 1. Direct match
                    if (LOCAL_TRANSLATIONS[normalized]) {
                        return LOCAL_TRANSLATIONS[normalized];
                    }
                    // 2. Token/partial match (split words and find key elements)
                    var tokens = normalized.split(/\s+/);
                    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
                        var token = tokens_1[_i];
                        if (LOCAL_TRANSLATIONS[token] && token.length > 2) {
                            var match = LOCAL_TRANSLATIONS[token];
                            var isOrganic = normalized.includes("organic");
                            var isPremium = normalized.includes("premium");
                            var prefixMM = isOrganic ? "အော်ဂဲနစ် " : isPremium ? "ပရီမီယံ " : "";
                            var prefixTH = isOrganic ? "ออร์แกนิก " : isPremium ? "พรีเมียม " : "";
                            var prefixZH = isOrganic ? "有机" : isPremium ? "优质" : "";
                            var prefixMS = isOrganic ? "Organik " : isPremium ? "Premium " : "";
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
                fallbackResult = getLocalFallback(text);
                apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey || apiKey === "YOUR_API_KEY" || apiKey === "MY_GEMINI_API_KEY") {
                    console.log("[Translate] No API key, serving local dictionary fallback for: \"".concat(text, "\""));
                    res.json(__assign(__assign({}, fallbackResult), { warning: "Translation API Key not configured. Using intelligent dictionary lookup." }));
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                ai = new genai_1.GoogleGenAI({
                    apiKey: apiKey,
                    httpOptions: {
                        headers: {
                            'User-Agent': 'aistudio-build',
                        }
                    }
                });
                console.log("[Translate] Requesting Gemini translation for: \"".concat(text, "\""));
                return [4 /*yield*/, ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: "Translate the following grocery/supermarket product name into Myanmar (Burmese), Thai, Chinese (Simplified/Universal), and Malay. \n        Return the result as a detailed JSON object with keys: mmName, thName, zhName, msName.\n        Do not output any markdown blocks or formatting outside of raw JSON.\n        Product Name: ".concat(text.trim()),
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    mmName: { type: genai_1.Type.STRING, description: "Myanmar (Burmese) translation" },
                                    thName: { type: genai_1.Type.STRING, description: "Thai translation" },
                                    zhName: { type: genai_1.Type.STRING, description: "Chinese Simplified translation" },
                                    msName: { type: genai_1.Type.STRING, description: "Malay translation" },
                                },
                                required: ["mmName", "thName", "zhName", "msName"],
                            },
                        },
                    })];
            case 2:
                response = _a.sent();
                responseText = response.text;
                if (!responseText) {
                    throw new Error("No response text from Gemini API.");
                }
                console.log("[Translate] Success:", responseText);
                res.json(JSON.parse(responseText));
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error("[Translate Exception]:", error_2);
                // Serve direct high-fidelity fallback on model error or quota block
                res.json(__assign(__assign({}, fallbackResult), { warning: "Gemini server failed. Using dictionary backup." }));
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Highlighted Addition: API Route for reverse-geocoding of raw GPS coordinates to resolve accurate address fields
app.post("/api/google/reverse-geocode", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, latitude, longitude, googleKey, response, data, firstResult, formattedAddress, components_1, state_1, city_1, postcode_1, street_address, findComponent, streetNo, route, neighborhood, parts, rawParts, filtered, err_3, mapboxToken, response, data, firstResult, context, postcode, city, state, building, address, err_4, hubs, matchedHub, minDistance;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return __generator(this, function (_l) {
        switch (_l.label) {
            case 0:
                _a = req.body, latitude = _a.latitude, longitude = _a.longitude;
                if (latitude === undefined || longitude === undefined) {
                    res.status(400).json({ error: "Missing latitude and longitude in body." });
                    return [2 /*return*/];
                }
                googleKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
                if (!(googleKey && googleKey !== "YOUR_API_KEY")) return [3 /*break*/, 6];
                _l.label = 1;
            case 1:
                _l.trys.push([1, 5, , 6]);
                console.log("[Reverse Geocode] Routing reverse-geocody lookup to Google Maps for lat: ".concat(latitude, ", lng: ").concat(longitude));
                return [4 /*yield*/, fetch("https://maps.googleapis.com/maps/api/geocode/json?latlng=".concat(latitude, ",").concat(longitude, "&key=").concat(googleKey, "&language=en"), {
                        headers: __assign(__assign({}, (req.headers.referer ? { "Referer": req.headers.referer } : {})), (req.headers.origin ? { "Origin": req.headers.origin } : {}))
                    })];
            case 2:
                response = _l.sent();
                if (!response.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, response.json()];
            case 3:
                data = _l.sent();
                if (data && Array.isArray(data.results) && data.results.length > 0) {
                    firstResult = data.results[0];
                    formattedAddress = firstResult.formatted_address || "";
                    components_1 = firstResult.address_components || [];
                    state_1 = "";
                    city_1 = "";
                    postcode_1 = "";
                    street_address = "";
                    findComponent = function (types) {
                        var _a;
                        return ((_a = components_1.find(function (c) { return c && Array.isArray(c.types) && c.types.some(function (t) { return types.includes(t); }); })) === null || _a === void 0 ? void 0 : _a.long_name) || "";
                    };
                    postcode_1 = findComponent(["postal_code"]);
                    state_1 = findComponent(["administrative_area_level_1"]);
                    city_1 = findComponent(["locality"]) || findComponent(["sublocality_level_1"]) || findComponent(["administrative_area_level_2"]);
                    streetNo = findComponent(["street_number"]);
                    route = findComponent(["route"]);
                    neighborhood = findComponent(["neighborhood"]) || findComponent(["sublocality"]);
                    parts = [];
                    if (streetNo)
                        parts.push(streetNo);
                    if (route)
                        parts.push(route);
                    if (neighborhood)
                        parts.push(neighborhood);
                    street_address = parts.join(", ");
                    if (!street_address || street_address.length < 5) {
                        rawParts = formattedAddress.split(',').map(function (p) { return p.trim(); });
                        filtered = rawParts.filter(function (p) {
                            var l = p.toLowerCase();
                            if (l === 'malaysia')
                                return false;
                            if (postcode_1 && l.includes(postcode_1))
                                return false;
                            if (state_1 && (l.includes(state_1.toLowerCase()) || state_1.toLowerCase().includes(l)))
                                return false;
                            if (city_1 && (l.includes(city_1.toLowerCase()) || city_1.toLowerCase().includes(l)))
                                return false;
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
                        postcode: postcode_1 || "50000",
                        city: city_1 || "Kuala Lumpur",
                        state: state_1 || "WP Kuala Lumpur",
                        country: "Malaysia",
                        latitude: Number(latitude),
                        longitude: Number(longitude)
                    });
                    return [2 /*return*/];
                }
                _l.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                err_3 = _l.sent();
                console.error("[Reverse Geocode Error] Google Maps API endpoint failure:", err_3);
                return [3 /*break*/, 6];
            case 6:
                mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || "";
                if (!(mapboxToken && mapboxToken !== "YOUR_API_KEY")) return [3 /*break*/, 12];
                _l.label = 7;
            case 7:
                _l.trys.push([7, 11, , 12]);
                console.log("[Reverse Geocode] Routing reverse-geocody lookup to Mapbox for lat: ".concat(latitude, ", lng: ").concat(longitude));
                return [4 /*yield*/, fetch("https://api.mapbox.com/search/geocode/v6/reverse?longitude=".concat(longitude, "&latitude=").concat(latitude, "&access_token=").concat(mapboxToken))];
            case 8:
                response = _l.sent();
                if (!response.ok) return [3 /*break*/, 10];
                return [4 /*yield*/, response.json()];
            case 9:
                data = _l.sent();
                if (data && Array.isArray(data.features) && data.features.length > 0) {
                    firstResult = data.features[0];
                    context = ((_b = firstResult.properties) === null || _b === void 0 ? void 0 : _b.context) || {};
                    postcode = ((_c = context.postcode) === null || _c === void 0 ? void 0 : _c.name) || "50000";
                    city = ((_d = context.place) === null || _d === void 0 ? void 0 : _d.name) || ((_e = context.locality) === null || _e === void 0 ? void 0 : _e.name) || "Kuala Lumpur";
                    state = ((_f = context.region) === null || _f === void 0 ? void 0 : _f.name) || "WP Kuala Lumpur";
                    building = ((_g = firstResult.properties) === null || _g === void 0 ? void 0 : _g.name) || ((_h = firstResult.properties) === null || _h === void 0 ? void 0 : _h.full_address) || "Selected Location";
                    address = ((_j = firstResult.properties) === null || _j === void 0 ? void 0 : _j.name) || ((_k = firstResult.properties) === null || _k === void 0 ? void 0 : _k.full_address) || "";
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
                    return [2 /*return*/];
                }
                _l.label = 10;
            case 10: return [3 /*break*/, 12];
            case 11:
                err_4 = _l.sent();
                console.error("[Reverse Geocode Error] Mapbox API endpoint failure:", err_4);
                return [3 /*break*/, 12];
            case 12:
                hubs = [
                    { state: "WP Kuala Lumpur", city: "Kuala Lumpur", postcode: "50000", lat: 3.139, lng: 101.686 },
                    { state: "Selangor", city: "Petaling Jaya", postcode: "46000", lat: 3.107, lng: 101.606 },
                    { state: "Johor", city: "Johor Bahru", postcode: "80000", lat: 1.492, lng: 103.741 },
                    { state: "Penang", city: "George Town", postcode: "10000", lat: 5.414, lng: 100.329 },
                    { state: "Sabah", city: "Kota Kinabalu", postcode: "88000", lat: 5.978, lng: 116.075 },
                    { state: "Sarawak", city: "Kuching", postcode: "93000", lat: 1.553, lng: 110.359 }
                ];
                matchedHub = hubs[0];
                minDistance = Infinity;
                hubs.forEach(function (h) {
                    var distance = Math.sqrt(Math.pow(latitude - h.lat, 2) + Math.pow(longitude - h.lng, 2));
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
                return [2 /*return*/];
        }
    });
}); });
// API route to securely delete a Cloudinary asset if API Key and Secret are configured
app.post("/api/cloudinary/delete", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, publicId, imageUrl, cloudName, bodyApiKey, bodyApiSecret, apiKey, apiSecret, defaultCloudName, activeCloudName, parts, pathAndId, dotIndex, timestamp, stringToSign, signature, url, response, errorText, responseData, destroyError_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, publicId = _a.publicId, imageUrl = _a.imageUrl, cloudName = _a.cloudName, bodyApiKey = _a.apiKey, bodyApiSecret = _a.apiSecret;
                apiKey = bodyApiKey || process.env.CLOUDINARY_API_KEY;
                apiSecret = bodyApiSecret || process.env.CLOUDINARY_API_SECRET;
                defaultCloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
                activeCloudName = cloudName || defaultCloudName;
                if (!apiKey || !apiSecret || !activeCloudName) {
                    console.warn("[Cloudinary Delete] Server-side Cloudinary credentials are not fully configured. Skipping actual Cloudinary asset deletion.");
                    res.status(200).json({
                        success: false,
                        message: "Cloudinary credentials (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, or Cloud Name) are not configured."
                    });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                // If publicId was not supplied but imageUrl was, try to parse publicId from URL
                if (!publicId && imageUrl) {
                    console.log("[Cloudinary Delete] Parsing public ID from url: ".concat(imageUrl));
                    parts = imageUrl.split('/image/upload/');
                    if (parts.length >= 2) {
                        pathAndId = parts[1];
                        if (pathAndId.match(/^v\d+\//)) {
                            pathAndId = pathAndId.replace(/^v\d+\//, '');
                        }
                        dotIndex = pathAndId.lastIndexOf('.');
                        if (dotIndex !== -1) {
                            pathAndId = pathAndId.substring(0, dotIndex);
                        }
                        publicId = pathAndId;
                    }
                }
                if (!publicId) {
                    res.status(400).json({ error: "Missing publicId or parseable imageUrl in body." });
                    return [2 /*return*/];
                }
                timestamp = Math.floor(Date.now() / 1000);
                stringToSign = "public_id=".concat(publicId, "&timestamp=").concat(timestamp).concat(apiSecret);
                signature = crypto_1.default.createHash('sha1').update(stringToSign).digest('hex');
                url = "https://api.cloudinary.com/v1_1/".concat(activeCloudName, "/image/destroy");
                console.log("[Cloudinary Delete] Requesting asset destruction for publicId: \"".concat(publicId, "\" in cloud: \"").concat(activeCloudName, "\""));
                return [4 /*yield*/, fetch(url, {
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
                    })];
            case 2:
                response = _b.sent();
                if (!!response.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, response.text()];
            case 3:
                errorText = _b.sent();
                throw new Error("Cloudinary Destroy API returned HTTP ".concat(response.status, ": ").concat(errorText));
            case 4: return [4 /*yield*/, response.json()];
            case 5:
                responseData = _b.sent();
                console.log("[Cloudinary Delete] Destroy response received:", responseData);
                res.json({
                    success: true,
                    data: responseData
                });
                return [3 /*break*/, 7];
            case 6:
                destroyError_1 = _b.sent();
                console.error("[Cloudinary Delete Exception]:", destroyError_1);
                res.status(500).json({ error: destroyError_1.message || "Failed to delete asset from Cloudinary" });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Serve static assets or use Vite dev middleware
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    var viteMod = "vi" + "te";
    Promise.resolve("".concat(viteMod)).then(function (s) { return __importStar(require(s)); }).then(function (_a) {
        var createViteServer = _a.createServer;
        createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        }).then(function (vite) {
            app.use(vite.middlewares);
            app.listen(PORT, "0.0.0.0", function () {
                console.log("Development server running on http://localhost:".concat(PORT));
            });
        });
    });
}
else if (!process.env.VERCEL) {
    var distPath_1 = path_1.default.join(process.cwd(), "dist");
    app.use(express_1.default.static(distPath_1));
    app.get("*all", function (req, res) {
        res.sendFile(path_1.default.join(distPath_1, "index.html"));
    });
    app.listen(PORT, "0.0.0.0", function () {
        console.log("Server running securely on port ".concat(PORT));
    });
}
exports.default = app;
