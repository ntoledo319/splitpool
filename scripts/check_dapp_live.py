"""Quick check: does the live dApp load pool #4 read-only in headless Chrome?"""
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
    pg = b.new_context(viewport={"width": 1280, "height": 720}).new_page()
    pg.on("console", lambda m: print("CONSOLE:", m.type, m.text[:150]))
    pg.on("pageerror", lambda e: print("PAGEERROR:", str(e)[:200]))
    pg.goto("https://ntoledo319.github.io/splitpool/", wait_until="networkidle")
    pg.fill("#poolId", "4")
    pg.click("#loadPool")
    pg.wait_for_timeout(6000)
    print("poolInfo:", pg.inner_text("#poolInfo"))
    print("sheet:", pg.inner_text("#sheet"))
    print("log:", pg.inner_text("#log")[:300])
    b.close()
