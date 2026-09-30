"""Which Google account is signed into Mint's Chrome (CDP 9333)? Read-only check."""
import json, time, urllib.request, websocket

def open_tab(url):
    req = urllib.request.Request("http://127.0.0.1:9333/json/new?" + url, method="PUT")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)

def close_tab(tid):
    try:
        urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:9333/json/close/{tid}"), timeout=10).read()
    except Exception as e:
        print("close fail:", e)

tab = open_tab("https://myaccount.google.com/")
ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=15, suppress_origin=True)
mid = 0
def ev(expr):
    global mid
    mid += 1
    ws.send(json.dumps({"id": mid, "method": "Runtime.evaluate",
                        "params": {"expression": expr, "returnByValue": True}}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == mid:
            return m["result"]["result"].get("value")

time.sleep(7)
print("URL:", ev("location.href"))
txt = ev("document.body ? document.body.innerText.slice(0,500) : ''") or ""
print("BODY:", txt.replace("\n", " | ")[:500])
close_tab(tab["id"])
print("done")
