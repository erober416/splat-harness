"""Screenshot a scene in headless Chromium (Python Playwright).

    python3 -m http.server 8000 &                       # from the repo root
    python3 tools/shoot.py night-pond shots/pond.png
    python3 tools/shoot.py moon-roof-cat shots/pet.png --tap --slow 25

Prints console errors and exits 1 if the page threw. Without a GPU, Chromium draws WebGL on the
CPU at roughly two frames a second, so anything timed (a tap reaction, a short animation) is over
before the screenshot lands. --slow N divides the page clock by N so those moments can be caught.
"""
import argparse, asyncio, sys
from playwright.async_api import async_playwright

async def main(a):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": a.width, "height": a.height})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text else None)
        if a.slow > 1:
            await pg.add_init_script(f"const r=performance.now.bind(performance);performance.now=()=>r()/{a.slow};")
        await pg.goto(f"{a.base}/index.html?stream={1 if a.clean else ''}#{a.scene}")
        await pg.wait_for_timeout(a.wait)
        if a.tap:
            await pg.mouse.click(a.width // 2, a.height // 2)
            await pg.wait_for_timeout(4000)
        await pg.screenshot(path=a.out)
        await b.close()
        for e in errs: print("ERROR:", e)
        sys.exit(1 if errs else 0)

ap = argparse.ArgumentParser()
ap.add_argument("scene"); ap.add_argument("out")
ap.add_argument("--base", default="http://localhost:8000")
ap.add_argument("--width", type=int, default=390); ap.add_argument("--height", type=int, default=760)
ap.add_argument("--wait", type=int, default=2500, help="ms to let the scene settle")
ap.add_argument("--tap", action="store_true", help="tap the scene before the shot")
ap.add_argument("--slow", type=int, default=1, help="divide the page clock by this")
ap.add_argument("--clean", action="store_true", help="hide the HUD (stream mode)")
asyncio.run(main(ap.parse_args()))
