"""Raw-CDP check: does Mint's Chrome (127.0.0.1:9333) have a github.com session?
Avoids playwright connect_over_cdp which can hang on a busy browser."""
import json, urllib.request, websocket

def http_json(path):
    with urllib.request.urlopen("http://127.0.0.1:9333" + path, timeout=10) as r:
        return json.load(r)

# Open a fresh tab via HTTP endpoint
req = urllib.request.Request("http://127.0.0.1:9333/json/new?https://github.com/settings/profile", method="PUT")
with urllib.request.urlopen(req, timeout=10) as r:
    tab = json.load(r)
print("tab:", tab["id"], tab["url"])

ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=15, suppress_origin=True)
mid = 0
def send(method, params=None):
    global mid
    mid += 1
    ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get("id") == mid:
            return msg

import time
time.sleep(6)  # let redirect settle
send("Runtime.enable")
res = send("Runtime.evaluate", {"expression": "location.href + ' :: ' + document.title", "returnByValue": True})
print("EVAL:", res["result"]["result"]["value"])
res = send("Runtime.evaluate", {"expression": "document.body ? document.body.innerText.slice(0,300) : ''", "returnByValue": True})
print("BODY:", res["result"]["result"]["value"].replace("\n", " | ")[:300])
# close the tab
urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:9333/json/close/{tab['id']}"), timeout=10).read()
print("tab closed")
