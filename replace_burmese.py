import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace widths
content = content.replace("width: 300px;", "width: 58mm;")
content = content.replace("width: 320px;", "width: 58mm;")
# Replace font sizes for body to fit 58mm better
content = re.sub(r'(body\s*{[^}]*)font-size:\s*13px;', r'\1font-size: 11px;', content)
content = re.sub(r'(body\s*{[^}]*)font-size:\s*14px;', r'\1font-size: 11px;', content)
content = re.sub(r'font-size:\s*20px;', r'font-size: 16px;', content) # thermal-title
content = re.sub(r'font-size:\s*14px;', r'font-size: 12px;', content) # thermal-subtitle / section-header
content = re.sub(r'font-size:\s*13px;', r'font-size: 11px;', content) # general items
content = re.sub(r'font-size:\s*15px;', r'font-size: 13px;', content) # thermal-bold-row
content = re.sub(r'font-size:\s*11px;', r'font-size: 10px;', content) # thermal-meta
content = re.sub(r'font-size:\s*10px;', r'font-size: 9px;', content) # footer-sub

# Replace Burmese with English
replacements = {
    "အရောင်းစာရင်းချုပ် (Thermal)": "SALES REPORT",
    "ရက်စွဲ:": "Date:",
    "ထုတ်ယူချိန်:": "Time:",
    "အမျိုးအစားအလိုက် ရောင်းရသည့် ပစ္စည်းများ": "CATEGORY-WISE SALES",
    "ပစ္စည်းစုစုပေါင်း တန်ဖိုး:": "Gross Product Sales:",
    "စုစုပေါင်း ပို့ဆောင်ခ:": "Total Delivery Fee:",
    "ပွိုင့်အသုံးပြုမှု": "Points Used",
    "စုစုပေါင်းရောင်းရငွေ:": "NET REVENUE:",
    "အောင်မြင်သော အော်ဒါ:": "Delivered Orders:",
    "ပျမ်းမျှ မှာယူမှု:": "Average Order Value:",
    "ပြင်ဆင်ဆဲ အော်ဒါ:": "Pending Orders:",
    "ငွေပေးချေမှုအမျိုးအစား": "PAYMENT METHODS",
    "ငွေပေးချေမှုမှတ်တမ်းမရှိပါ": "No Payment Records",
    "ပို့ဆောင်သူအလိုက် စာရင်း": "RIDER PERFORMANCE",
    "ပို့ဆောင်သူမှတ်တမ်းမရှိပါ": "No Rider Records",
    "*** စာရင်းချုပ်ပိတ်ပြီးပါပြီ ***": "*** END OF REPORT ***",
    "ရောင်းအားမရှိသေးပါ": "No sales records"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
