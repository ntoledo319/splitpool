"""Record SplitPool demo video segments (Playwright + system Chrome, 1280x720).

Segment 1: terminal replay of the REAL pool-3 testnet run (term_replay.html).
Segment 2: live dApp on GitHub Pages loading pool #4 (real chain reads, unsettled balances).
Outputs: video/term.webm, video/dapp.webm
"""
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
    # playwright names videos randomly; find newest webm and rename
    webms = sorted(VID.glob("*.webm"), key=lambda p: p.stat().st_mtime)
    webms[-1].rename(VID / outfile)
    print("wrote", VID / outfile)

def term_seg(page):
    page.goto("file://" + str(HERE / "term_replay.html"))
    dur = page.evaluate("() => window.__DUR")
    page.wait_for_timeout(int((dur + 0.8) * 1000))

def dapp_seg(page):
    page.goto("https://ntoledo319.github.io/splitpool/", wait_until="networkidle")
    page.add_style_tag(content=CAPTION_CSS)
    page.evaluate(
        "() => { const d = document.createElement('div'); d.id='capbar';"
        "d.textContent='Live dApp - reading pool #4 straight from Monad testnet (no wallet needed)';"
        "document.body.appendChild(d); }"
    )
    page.wait_for_timeout(3500)
    page.fill("#poolId", "4")
    page.click("#loadPool")
    page.wait_for_timeout(5000)
    page.evaluate(
        "() => { document.getElementById('capbar').textContent ="
        "'Real unsettled balances - settle() would zero them on-chain'; }"
    )
    page.evaluate("() => document.querySelector('main .card:nth-of-type(4)').scrollIntoView({behavior:'smooth'})")
    page.wait_for_timeout(8000)
    # also show the log line proving live RPC reads
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_timeout(4000)

record(term_seg, "term.webm")
record(dapp_seg, "dapp.webm")
