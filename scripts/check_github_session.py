"""Check whether Mint's Chrome (CDP 9333) has a live github.com session."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.connect_over_cdp("http://127.0.0.1:9333")
        ctx = b.contexts[0]
        pg = await ctx.new_page()
        await pg.goto("https://github.com/settings/profile", wait_until="domcontentloaded")
        await pg.wait_for_timeout(4000)
        print("URL after nav:", pg.url)
        body = await pg.evaluate("document.body ? document.body.innerText.slice(0,400) : ''")
        print("BODY:", body.replace("\n", " | ")[:400])
        await pg.close()

asyncio.run(main())
