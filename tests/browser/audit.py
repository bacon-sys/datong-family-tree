import asyncio, json, sys
from playwright.async_api import async_playwright
FILE = sys.argv[1] if len(sys.argv)>1 else '族譜建置系統.html'
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        out = {}
        for (w,h) in ((1280,800),(1024,768),(820,1180),(390,844)):
            pg = await (await b.new_context(viewport={'width':w,'height':h}, has_touch=(w<900))).new_page()
            await pg.goto('file:///home/claude/ftree/'+FILE); await pg.wait_for_timeout(500)
            r = {}
            # welcome modal: is 開始 button inside viewport?
            r['welcome_btn_bottom'] = await pg.evaluate("(()=>{const b=[...document.querySelectorAll('.modal .mf .btn')].pop();return Math.round(b.getBoundingClientRect().bottom)})()")
            await pg.fill('#wCls','801'); await pg.fill('#wSeat','5'); await pg.fill('#wGiven','Sayun'); await pg.click('#wG button[data-g="F"]')
            await pg.click('.modal .mf .btn.primary'); await pg.wait_for_timeout(300)
            r['toolbar_h'] = await pg.evaluate("Math.round(document.querySelector('#toolbar').getBoundingClientRect().height)")
            r['canvas_h'] = await pg.evaluate("Math.round(document.querySelector('#vp').getBoundingClientRect().height)")
            # add parents via panel then check visibility of me + new cards
            for rel in ('father','mother'):
                await pg.click(f'.addgrid button[data-rel="{rel}"]'); await pg.wait_for_timeout(250)
            r['cards_cut_after_add'] = await pg.evaluate("""(()=>{const vp=document.querySelector('#vp').getBoundingClientRect();const pn=document.querySelector('#panel');const pr=pn.classList.contains('hidden')?null:pn.getBoundingClientRect();
               const bottom = (pr && pr.top>vp.top+10 && pr.left<vp.left+10)? pr.top : vp.bottom; const right=vp.right;
               return [...document.querySelectorAll('.card')].filter(c=>{const r=c.getBoundingClientRect();return r.left<vp.left-1||r.top<vp.top-1||r.right>right+1||r.bottom>bottom+1}).length})()""")
            # help modal & terms modal
            for name, sel in (('help','#bHelp'),('terms','#bTerms')):
                await pg.evaluate(f"document.querySelector('{sel}').click()"); await pg.wait_for_timeout(250)
                r[name+'_btn_visible'] = await pg.evaluate("(()=>{const b=[...document.querySelectorAll('.modal .mf .btn')].pop();const rr=b.getBoundingClientRect();return rr.bottom<=innerHeight && rr.top>=0})()")
                await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
                r[name+'_esc_closes'] = await pg.evaluate("document.querySelectorAll('.modal-bg').length===0")
                await pg.evaluate("document.querySelectorAll('.modal-bg').forEach(m=>m.remove())")
            # select a card on narrow: is the selected card covered by panel?
            await pg.evaluate("""()=>{const c=document.querySelector('.card.me');c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));}""")
            await pg.wait_for_timeout(250)
            r['selected_covered'] = await pg.evaluate("""(()=>{const c=document.querySelector('.card.sel').getBoundingClientRect();const p=document.querySelector('#panel').getBoundingClientRect();return c.bottom>p.top+5 && c.right>p.left+5})()""")
            r['bo_values'] = await pg.evaluate("Object.values(window.__ft.tree.people).map(p=>p.bo)")
            out[f'{w}x{h}'] = r
            await pg.screenshot(path=f'shots/audit_{w}.png')
        print(json.dumps(out, ensure_ascii=False, indent=1)); await b.close()
asyncio.run(main())
