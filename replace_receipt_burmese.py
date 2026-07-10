import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace general Burmese texts that are printed in HTML/reports
replacements = {
    "ယနေ့တစ်ရက်စာ (Daily Report)": "Today (Daily Report)",
    "၇ရက်တာ (7 Days Report)": "7 Days (Weekly Report)",
    "၃၀ရက်တာ (30 Days Report)": "30 Days (Monthly Report)",
    "နှစ်ချုပ်/အားလုံး (Yearly / All-Time Report)": "Yearly / All-Time Report",
    "အရောင်းစာရင်းချုပ် (Sales Summary Report)": "Sales Summary Report",
    "အရောင်းစာရင်းချုပ် အစီရင်ခံစာ": "Sales Summary Report",
    "ကာလအပိုင်းအခြား:": "Period:",
    "ထုတ်ယူသည့်အချိန်:": "Generated At:",
    "NET REVENUE (စုစုပေါင်းရောင်းရငွေ)": "NET REVENUE",
    "CLOSED ORDERS (အောင်မြင်သော အော်ဒါ)": "CLOSED ORDERS",
    "AVG ORDER VALUE (ပျမ်းမျှမှာယူမှု)": "AVG ORDER VALUE",
    "PIPELINE ORDERS (ပြင်ဆင်ဆဲ အော်ဒါ)": "PIPELINE ORDERS",
    "1. CATEGORY SALES BREAKDOWN (အမျိုးအစားအလိုက် ရောင်းရငွေ)": "1. CATEGORY SALES BREAKDOWN",
    "စဥ်": "No.",
    "အမျိုးအစားအမည် (Category)": "Category Name",
    "စုစုပေါင်းရောင်းရငွေ (Revenue)": "Total Revenue",
    "2. TOP SELLING PRODUCTS (အရောင်းရဆုံး ပစ္စည်းများ)": "2. TOP SELLING PRODUCTS",
    "ပစ္စည်းအမည် (Product)": "Product Name",
    "အရေအတွက် (Qty)": "Qty",
    "3. PAYMENT METHOD VOLUME (ငွေပေးချေမှုပုံစံအလိုက် ရရှိငွေ)": "3. PAYMENT METHOD VOLUME",
    "အရောင်းအကြိမ်ရေ (Tx Count)": "Transaction Count",
    "စုစုပေါင်းရရှိငွေ (Amount)": "Total Amount",
    "4. DELIVERY RIDER PERFORMANCE (RIDER PERFORMANCEချုပ်)": "4. DELIVERY RIDER PERFORMANCE",
    "အမည် (Rider Name)": "Rider Name",
    "အောင်မြင်သည့် ပို့ဆောင်မှု (Completed)": "Completed Deliveries",
    "စုစုပေါင်းပို့ဆောင်ငွေ (Volume)": "Total Delivery Volume",
    "စာရင်းပြင်ဆင်သူ (Prepared By)": "Prepared By",
    "စာရင်းအတည်ပြုသူ (Authorized By)": "Authorized By",
    "အချက်အလက်မရှိပါ": "No Data Available",
    "ဈေးဝယ်ဝယ်ယူရန်စာရင်း": "Shopping List",
    "Deal Title (မြန်မာ)": "Deal Title (Local)",
    "လတ်ဆတ်သော သစ်သီးများ": "Fresh Fruits",
    "Click to zoom / ပုံကြီးကြည့်ရန်": "Click to zoom",
    "Open in new tab / ပုံကြီးဖွင့်ရန်": "Open in new tab",
    "အားလုံးစာရင်း": "All Records"
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Update order print thermal styles
# Let's target the thermal receipt styles specifically
content = re.sub(r'font-size:\s*14\.5px;', r'font-size: 11px;', content)
content = re.sub(r'font-size:\s*24px;', r'font-size: 18px;', content)
content = re.sub(r'font-size:\s*12\.5px;', r'font-size: 10px;', content)
content = re.sub(r'font-size:\s*13px;', r'font-size: 11px;', content)
content = re.sub(r'font-size:\s*22px;', r'font-size: 16px;', content)
# Ensure A4 reports are not too tiny if they share 13px, but they probably use Tailwind mostly.
# Let's apply specific widths if they missed it

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
