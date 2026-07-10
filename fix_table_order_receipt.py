import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add table-layout: fixed
content = content.replace(
    "table { width: 100%; border-collapse: collapse; margin: 6px 0; }",
    "table { width: 100%; border-collapse: collapse; margin: 6px 0; table-layout: fixed; }"
)

# Set specific column widths
content = content.replace(
    "<th style=\"text-align: left; padding-bottom: 4px;\">ITEM</th>\n                  <th style=\"text-align: right; padding-bottom: 4px;\">AMOUNT</th>",
    "<th style=\"text-align: left; padding-bottom: 4px; width: 65%;\">ITEM</th>\n                  <th style=\"text-align: right; padding-bottom: 4px; width: 35%;\">AMOUNT</th>"
)

# Also add word-break: break-word to .info-val and .info-row span
content = content.replace(
    ".info-val { font-weight: 900; }",
    ".info-val { font-weight: 900; word-break: break-word; text-align: right; }"
)

content = content.replace(
    ".info-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 13px; font-weight: 900; }",
    ".info-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; font-size: 13px; font-weight: 900; }\n          .info-row > span:first-child { flex-shrink: 0; margin-right: 8px; }"
)

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
