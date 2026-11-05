import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':1366,'height':860}, accept_downloads=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://'+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../index.html"))+''); await pg.wait_for_timeout(400)
        await pg.click('text=我已經有檔案'); await pg.set_input_files('#fileOne','shots/big.json'); await pg.wait_for_timeout(500)
        # teacher imports one file too
        await pg.click('#bTeacher'); await pg.click('#tImp'); await pg.set_input_files('#fileMany',['shots/族譜_801-05_林小芸_20261104.json']); await pg.wait_for_timeout(400)
        await pg.click('.modal .mf >> text=關閉')
        ks = await pg.evaluate("Object.keys(localStorage)"); print('before:', ks)
        await pg.click('#bNew'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/20_clear.png')
        # case 1: only mine (default)
        await pg.click('.modal .mf >> text=確定清除'); await pg.wait_for_timeout(400)
        print('after clear mine:', await pg.evaluate("Object.keys(localStorage)"), '| welcome shown:', await pg.locator('#wCls').count())
        await pg.screenshot(path='shots/21_after_clear.png')
        await pg.reload(); await pg.wait_for_timeout(500)
        print('after reload welcome shown:', await pg.locator('#wCls').count())
        # create new tree
        await pg.fill('#wCls','802'); await pg.fill('#wSeat','3'); await pg.fill('#wGiven','Temu'); await pg.click('#wG button[data-g="M"]'); await pg.click('text=開始 ➜'); await pg.wait_for_timeout(300)
        print('new tree people:', await pg.evaluate("Object.keys(window.__ft.tree.people).length"), await pg.evaluate("window.__ft.tree.people[window.__ft.tree.meId].given"))
        # case 2: clear both
        await pg.click('#bNew'); await pg.wait_for_timeout(200)
        await pg.check('#cClass'); await pg.click('.modal .mf >> text=確定清除'); await pg.wait_for_timeout(300)
        print('after clear both:', await pg.evaluate("Object.keys(localStorage)"))
        # case 3: nothing to clear
        await pg.reload(); await pg.wait_for_timeout(400)
        await pg.evaluate("document.querySelectorAll('.modal-bg').forEach(m=>m.remove())")
        await pg.click('#bNew'); await pg.wait_for_timeout(200)
        print('toast:', await pg.locator('.toast').inner_text())
        print('errors:', errs); await b.close()
asyncio.run(main())
