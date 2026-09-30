"""Drive Mint's Chrome (CDP 9333) to faucet.monad.xyz and claim testnet MON
for the SplitPool deployer key. Read the page, fill the address, click claim."""
import json, time, urllib.request, websocket

ADDR = "0x128Df013BA79981eeb6d00A458C3e933Ec29C052"

def open_tab(url):
    req = urllib.request.Request("http://127.0.0.1:9333/json/new?" + url, method="PUT")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)

tab = open_tab("https://faucet.monad.xyz/")
ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=20, suppress_origin=True)
mid = 0
def ev(expr, await_promise=False):
    global mid
    mid += 1
    ws.send(json.dumps({"id": mid, "method": "Runtime.evaluate",
                        "params": {"expression": expr, "returnByValue": True, "awaitPromise": await_promise}}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == mid:
            r = m["result"].get("result", {})
            return r.get("value")

time.sleep(10)  # let Vercel checkpoint + app boot
print("URL:", ev("location.href"))
print("TITLE:", ev("document.title"))
body = ev("document.body ? document.body.innerText.slice(0,600) : ''") or ""
print("BODY:", body.replace("\n", " | ")[:600])
inputs = ev("JSON.stringify(Array.from(document.querySelectorAll('input')).map(i=>({ph:i.placeholder,type:i.type})))")
print("INPUTS:", inputs)
buttons = ev("JSON.stringify(Array.from(document.querySelectorAll('button')).map(b=>b.innerText.trim()).filter(Boolean))")
print("BUTTONS:", buttons)
# keep tab open for follow-up; print tab id
print("TAB_ID:", tab["id"])
