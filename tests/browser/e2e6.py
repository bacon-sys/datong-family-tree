import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://'+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../index.html"))+''); await pg.wait_for_timeout(400)
        await pg.fill('#wCls','801'); await pg.fill('#wSeat','1'); await pg.fill('#wGiven','Yuraw'); await pg.click('#wG button[data-g="M"]')
        await pg.click('.modal .mf .btn.primary'); await pg.wait_for_timeout(300)
        async def sel(name):
            await pg.evaluate("""n=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given===n).id;const c=document.querySelector('.card[data-id="'+id+'"]');
              c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));}""", name); await pg.wait_for_timeout(150)
        async def add(rel, given, han=''):
            await pg.click(f'.addgrid button[data-rel="{rel}"]'); await pg.wait_for_timeout(120)
            await pg.keyboard.type(given)
            if han: await pg.fill('#qHan', han)
        await add('father','Watan','林大明'); await add('mother','Ciwas','陳美玉'); await add('olderBrother','Yukan')
        await sel('Watan'); await pg.click('summary:has-text("特殊關係")'); await pg.click('.seg2[data-sp] button[data-v="1"]'); await pg.wait_for_timeout(150)
        await sel('Ciwas'); await add('spouse','Batu','王志明')
        await pg.click('#pClose'); await pg.click('#bFit'); await pg.wait_for_timeout(250)
        await pg.screenshot(path='shots/40_mom_remarried.png')
        await sel('Watan'); await add('spouse','Iwan','張美華')
        await pg.click('#pClose'); await pg.click('#bFit'); await pg.wait_for_timeout(250)
        await pg.screenshot(path='shots/41_both_remarried.png')
        # half-siblings
        await sel('Ciwas'); await pg.click('.addgrid button[data-rel="daughter"]'); await pg.wait_for_timeout(200)
        await pg.click('.modal >> text=Batu'); await pg.wait_for_timeout(150); await pg.keyboard.type('Lawa')
        await sel('Watan'); await pg.click('.addgrid button[data-rel="son"]'); await pg.wait_for_timeout(200)
        await pg.click('.modal >> text=Iwan'); await pg.wait_for_timeout(150); await pg.keyboard.type('Tali')
        await pg.click('#pClose'); await pg.click('#bFit'); await pg.wait_for_timeout(250)
        await pg.screenshot(path='shots/42_half_sibs.png')
        K = await pg.evaluate("""()=>{const t=window.__ft.tree,K=window.__ft.FT.kinMap(t);return Object.values(t.people).map(p=>K[p.id].zh+':'+(p.given||p.han))}""")
        print(K, errs)
        await b.close()
asyncio.run(main())
