import os, subprocess, sys
import pages_guest, pages_dash  # noqa: registers pages
from kit import page, PAGES

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "png")
CHROME = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
os.makedirs(OUT, exist_ok=True)
only = sys.argv[1:]
for name, (fn, w, h) in sorted(PAGES.items()):
    if only and not any(o in name for o in only):
        continue
    html = os.path.join(HERE, f"{name}.html")
    with open(html, "w") as f:
        f.write(page(name, fn()))
    png = os.path.abspath(os.path.join(OUT, f"{name}.png"))
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", f"--window-size={w},{h}", f"--screenshot={png}",
                    "--virtual-time-budget=1500", "file://" + html], check=True, capture_output=True)
    print("ok", name)
