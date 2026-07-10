import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure word break is added to .item-name
content = content.replace(
    ".item-name { font-weight: 900; font-size: 15px; margin-bottom: 1px; }",
    ".item-name { font-weight: 900; font-size: 15px; margin-bottom: 1px; word-break: break-word; }"
)

# Update the inline style 11.5px to 15px
content = content.replace(
    "<tr style=\"border-bottom: 1px solid #000; font-size: 11.5px;\">",
    "<tr style=\"border-bottom: 1px solid #000; font-size: 15px;\">"
)

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
