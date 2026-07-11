"""Opens a page in headless Chrome via CDP and prints #out when done."""
import asyncio
import json
import subprocess
import sys
import time
import urllib.request

import websockets

URL = sys.argv[1]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


async def main():
    chrome = subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--remote-debugging-port=9333",
         "--user-data-dir=/tmp/ebbio-cdp-profile", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(50):
            try:
                with urllib.request.urlopen("http://127.0.0.1:9333/json/list") as r:
                    tabs = json.load(r)
                break
            except Exception:
                time.sleep(0.2)
        page = next(t for t in tabs if t["type"] == "page")
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=None) as ws:
            mid = 0

            async def call(method, params=None):
                nonlocal mid
                mid += 1
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get("id") == mid:
                        return msg.get("result", {})

            await call("Page.enable")
            await call("Page.navigate", {"url": URL})
            for _ in range(100):
                res = await call("Runtime.evaluate", {"expression": "document.title"})
                if res.get("result", {}).get("value") == "done":
                    break
                await asyncio.sleep(0.2)
            res = await call("Runtime.evaluate", {
                "expression": "document.getElementById('out').textContent"})
            print(res.get("result", {}).get("value", "<no output>"))
    finally:
        chrome.terminate()


asyncio.run(main())
