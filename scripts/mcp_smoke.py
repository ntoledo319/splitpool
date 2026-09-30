#!/usr/bin/env python3
"""Smoke-test the SplitPool MCP server over stdio JSON-RPC."""
import json, subprocess, sys

proc = subprocess.Popen(
    ["node", "agent/server.mjs"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    cwd="/home/nick/Development/experiments/fastcash-0924/work/hack-metropolis",
)

def call(method, params=None, rid=1, notify=False):
    msg = {"jsonrpc": "2.0", "method": method, "params": params or {}}
    if not notify:
        msg["id"] = rid
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()
    if notify:
        return None
    return json.loads(proc.stdout.readline())

init = call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "smoke", "version": "0"}}, 1)
assert init["result"]["serverInfo"]["name"] == "splitpool", init
call("notifications/initialized", notify=True)

tools = call("tools/list", rid=2)
names = [t["name"] for t in tools["result"]["tools"]]
print("tools:", names)
assert set(names) == {"parse_expense", "balance_sheet", "suggest_settlements", "record_expense"}

r = call("tools/call", {"name": "parse_expense", "arguments": {"text": "dinner at Nobu $90 split 3 ways"}}, 3)
parsed = json.loads(r["result"]["content"][0]["text"])
print("parse:", parsed)
assert parsed["amount"] == 90.0 and parsed["splitWays"] == 3

proc.terminate()
print("MCP smoke test OK")
