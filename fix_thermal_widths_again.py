import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# For Summary Report
content = content.replace("padding: 2mm 5mm;\n                margin: 0;\n                width: 58mm;", "padding: 2mm 0;\n                margin: 0 auto;\n                width: 48mm;")

# For Order Receipt
content = content.replace("padding: 2mm 5mm;\n            font-family:", "padding: 2mm 0;\n            font-family:")
content = content.replace("width: 58mm;\n            box-sizing: border-box;", "width: 48mm;\n            box-sizing: border-box;")
content = content.replace(".thermal-receipt {\n            width: 100%;\n            margin: 0;\n            padding: 4mm 0;\n          }", ".thermal-receipt {\n            width: 48mm;\n            margin: 0 auto;\n            padding: 4mm 0;\n          }")


# For Market List
content = content.replace("padding: 2mm 5mm;\n        font-family:", "padding: 2mm 0;\n        font-family:")
# Market list body width might be 48mm or 58mm right now, let's check
content = content.replace("width: 58mm;\n        box-sizing: border-box;", "width: 48mm;\n        box-sizing: border-box;")

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
