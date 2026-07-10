import re

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# For Market List body and thermal-receipt
content = re.sub(r'body {\s*background: #fff;\s*color: #000000 !important;\s*margin: 0;\s*padding: 2mm 5mm;\s*font-family:', r'body { \n        background: #fff; \n        color: #000000 !important;\n        margin: 0; \n        padding: 2mm 0;\n        font-family:', content)
content = re.sub(r'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\s*width: 58mm;\s*box-sizing: border-box;', r'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n        width: 48mm;\n        margin: 0 auto;\n        box-sizing: border-box;', content)
content = re.sub(r'\.thermal-receipt {\s*width: 100%;\s*margin: 0;\s*padding: 4mm 0;\s*}', r'.thermal-receipt {\n        width: 48mm;\n        margin: 0 auto;\n        padding: 4mm 0;\n      }', content)

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
