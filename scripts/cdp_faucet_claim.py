"""Fill address + click 'Get Testnet MON' on faucet.monad.xyz (tab already open)."""
import json, time, urllib.request, websocket, sys

ADDR = "0x128Df013BA79981eeb6d00A458C3e933Ec29C052"
TAB_ID = sys.argv[1]

with urllib.request.urlopen("http://127.0.0.1:9333/json/list", timeout=10) as r:
    tabs = {t["id"]: t for t in json.load(r)}
tab = tabs[TAB_ID]
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
            return m["result"].get("result", {}).get("value")

# set input value via native setter so React picks it up
set_val = f"""
(() => {{
  const inp = document.querySelector('input[type=text]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, '{ADDR}');
  inp.dispatchEvent(new Event('input', {{bubbles:true}}));
  inp.dispatchEvent(new Event('change', {{bubbles:true}}));
  return inp.value;
}})()
"""
print("input now:", ev(set_val))
time.sleep(1)
clicked = ev("""
(() => {
  const b = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Get Testnet MON');
  if (!b) return 'no button';
  if (b.disabled) return 'disabled';
  b.click();
  return 'clicked';
})()
""")
print("click:", clicked)
for i in range(6):
    time.sleep(5)
    body = ev("document.body.innerText.slice(0,800)") or ""
    interesting = [l for l in body.split("\n") if any(k in l.lower() for k in ("success", "sent", "fail", "error", "limit", "claim", "tx", "cooldown", "wait"))]
    print(f"t+{(i+1)*5}s:", " | ".join(interesting)[:300] or "(no status yet)")
