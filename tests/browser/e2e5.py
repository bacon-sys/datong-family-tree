import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':1366,'height':860})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("window.print=()=>{}")
        await pg.goto('file://'+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../index.html"))+''); await pg.wait_for_timeout(400)
        await pg.screenshot(path='shots/30_welcome.png')
        await pg.fill('#wCls','801'); await pg.fill('#wSeat','5'); await pg.fill('#wGiven','Sayun'); await pg.fill('#wHan','林小芸'); await pg.click('#wG button[data-g="F"]')
        await pg.click('.modal .mf .btn.primary'); await pg.wait_for_timeout(300)
        async def sel(name):
            await pg.evaluate("""n=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given===n).id;const c=document.querySelector('.card[data-id="'+id+'"]');
              c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));}""", name); await pg.wait_for_timeout(150)
        async def add(rel, given, han='', tribe=None):
            await pg.click(f'.addgrid button[data-rel="{rel}"]'); await pg.wait_for_timeout(120)
            await pg.keyboard.type(given)
            if han: await pg.fill('#qHan', han)
            if tribe: await pg.select_option('#qTribe', tribe)
        await add('father','Watan','林大明','泰雅族')
        await add('mother','Ciwas','陳美玉','阿美族')
        await add('olderBrother','Yukan','','泰雅族')
        await sel('Watan')
        # divorce dad & mom
        await pg.click('summary:has-text("特殊關係")'); await pg.click('.seg2[data-sp] button[data-v="1"]'); await pg.wait_for_timeout(150)
        await add('spouse','','王美花','漢族')
        await add('olderBrother','Hetay','林大雄','泰雅族')
        await sel('Hetay'); await add('son','Masa','','泰雅族')
        await sel('Masa'); await pg.click('summary:has-text("特殊關係")'); await pg.click('.seg2[data-ad="F"] button[data-v="1"]'); await pg.wait_for_timeout(150)
        await pg.screenshot(path='shots/31_masa_panel.png')
        await sel('Ciwas'); await pg.wait_for_timeout(150)
        await pg.screenshot(path='shots/32_ciwas_panel.png')
        await pg.click('#pClose'); await pg.click('#bFit'); await pg.wait_for_timeout(250)
        await pg.screenshot(path='shots/33_tree.png')
        K = await pg.evaluate("""()=>{const t=window.__ft.tree,K=window.__ft.FT.kinMap(t);return Object.values(t.people).map(p=>K[p.id].zh+':'+(p.given||p.han)+':'+p.tribe+(window.__ft.FT.isAdopted(p)?':收養':''))}""")
        print(K)
        await pg.click('#bPrint'); await pg.wait_for_timeout(500)
        await pg.emulate_media(media='print'); await pg.pdf(path='shots/special.pdf', print_background=True, prefer_css_page_size=True)
        print('errors', errs); await b.close()
asyncio.run(main())
