import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# For thermal-receipt class
content = content.replace("width: 48mm;\n            margin: 0 auto;\n            padding: 4mm 0;", "width: 100%;\n            margin: 0;\n            padding: 4mm 0;")
content = content.replace("width: 48mm;\n        margin: 0 auto;\n        padding: 4mm 0;", "width: 100%;\n        margin: 0;\n        padding: 4mm 0;")

# For body width
content = content.replace("width: 48mm;", "width: 58mm;")

# For padding inside body
# 1. Summary Report
content = content.replace("padding: 2mm;\n                margin: 0 auto;\n                width: 58mm;", "padding: 2mm 5mm;\n                margin: 0;\n                width: 58mm;")

# 2. Order receipt
content = content.replace("padding: 2mm;\n            font-family:", "padding: 2mm 5mm;\n            font-family:")

# 3. Market list
content = content.replace("padding: 0;\n        font-family:", "padding: 2mm 5mm;\n        font-family:")

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
