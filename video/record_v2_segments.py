"""Record v2 segments: settle terminal replay + dApp 'after' state of pool #4."""
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
VID = HERE
CAPTION_CSS = """
#capbar{position:fixed;left:0;right:0;bottom:0;height:64px;z-index:999999;
background:rgba(14,15,19,.94);border-top:2px solid #836EF9;display:flex;
align-items:center;justify-content:center;padding:0 28px;box-sizing:border-box;
font:600 22px/1.3 'DejaVu Sans',sans-serif;color:#e8eaf0;text-align:center}
"""

def record(page_fn, outfile):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(VID),
            record_video_size={"width": 1280, "height": 720},
        )
        page = ctx.new_page()
        page_fn(page)
        ctx.close()
        browser.close()
    webms = sorted(VID.glob("*.webm"), key=lambda p: p.stat().st_mtime)
    webms[-1].rename(VID / outfile)
    print("wrote", VID / outfile)

def settle_seg(page):
    page.goto("file://" + str(HERE / "term_settle.html"))
    dur = page.evaluate("() => window.__DUR")
    page.wait_for_timeout(int((dur + 0.8) * 1000))

def after_seg(page):
    page.goto("https://ntoledo319.github.io/splitpool/", wait_until="networkidle")
    page.add_style_tag(content=CAPTION_CSS)
    page.evaluate(
        "() => { const d = document.createElement('div'); d.id='capbar';"
        "d.textContent='After: pool #4 read back from chain - settled';"
        "document.body.appendChild(d); }"
    )
    page.wait_for_timeout(3000)
    page.fill("#poolId", "4")
    page.click("#loadPool")
    page.wait_for_timeout(5000)
    page.evaluate("() => window.scrollTo({top: 620, behavior: 'smooth'})")
    page.wait_for_timeout(6000)

record(settle_seg, "settle.webm")
record(after_seg, "after.webm")
