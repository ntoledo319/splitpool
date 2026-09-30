"""Dump full faucet page state after claim attempt."""
import json, time, urllib.request, websocket, sys

TAB_ID = sys.argv[1]
with urllib.request.urlopen("http://127.0.0.1:9333/json/list", timeout=10) as r:
    tabs = {t["id"]: t for t in json.load(r)}
ws = websocket.create_connection(tabs[TAB_ID]["webSocketDebuggerUrl"], timeout=20, suppress_origin=True)
mid = 0
def ev(expr):
    global mid
    mid += 1
    ws.send(json.dumps({"id": mid, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True}}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == mid:
            return m["result"].get("result", {}).get("value")

print("URL:", ev("location.href"))
print((ev("document.body.innerText") or "")[:1500])
print("---IFRAMES:", ev("JSON.stringify(Array.from(document.querySelectorAll('iframe')).map(f=>f.src))"))
