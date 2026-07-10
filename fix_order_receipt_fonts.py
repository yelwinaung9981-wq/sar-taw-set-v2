import re
import math

with open("src/pages/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to find the specific block for thermal order receipt styles
start_idx = content.find("      if (format === \"thermal\") {")
end_idx = content.find("        content = `", start_idx)

if start_idx != -1 and end_idx != -1:
    thermal_css = content[start_idx:end_idx]
    
    # Increase fonts
    def replacer(match):
        size = float(match.group(1))
        # 30% increase
        new_size = math.ceil(size * 1.3)
        return f"font-size: {new_size}px;"

    thermal_css_updated = re.sub(r'font-size:\s*([\d\.]+)px;', replacer, thermal_css)
    
    # Fix padding and add box-sizing to *
    thermal_css_updated = thermal_css_updated.replace("padding: 0;", "padding: 2mm;")
    thermal_css_updated = thermal_css_updated.replace("* { color: #000000 !important; font-weight: 900 !important; -webkit-print-color-adjust: exact; }", "* { color: #000000 !important; font-weight: 900 !important; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }")
    thermal_css_updated = thermal_css_updated.replace("font-weight: 1000;", "font-weight: 900;")
    
    content = content[:start_idx] + thermal_css_updated + content[end_idx:]

with open("src/pages/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
