import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for (w,h,tag) in ((1366,860,'desk'),(820,1180,'tab')):
            pg = await (await b.new_context(viewport={'width':w,'height':h})).new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('file://'+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../index.html"))+''); await pg.wait_for_timeout(400)
            await pg.fill('#wCls','801'); await pg.fill('#wSeat','5'); await pg.fill('#wGiven','Sayun'); await pg.fill('#wHan','林小芸')
            await pg.click('#wG button[data-g="F"]'); await pg.click('text=開始 ➜'); await pg.wait_for_timeout(300)
            async def add(rel, given, han=''):
                await pg.click(f'.addgrid button[data-rel="{rel}"]'); await pg.wait_for_timeout(150)
                focused = await pg.evaluate("document.activeElement && document.activeElement.id")
                await pg.keyboard.type(given)      # 直接打字，測試游標已經在新人的族名欄
                if han: await pg.fill('#qHan', han)
                return focused
            f1 = await add('father','Watan','林大明')
            f2 = await add('mother','Ciwas','高美玉')
            await add('olderBrother','Yukan')
            await add('youngerSister','Yaway')
            info = await pg.evaluate("""()=>{const t=window.__ft.tree,P=t.people,me=P[t.meId],n=id=>id&&P[id]?P[id].given:null;
              return {me:me.given, dad:n(me.fatherId), mom:n(me.motherId), dadMom:n(P[me.fatherId].motherId), sel:document.querySelector('.card.sel .tn').textContent,
                      sibs:Object.values(P).filter(p=>p.id!==t.meId&&p.fatherId===me.fatherId).map(p=>p.given+'/'+p.bo).join(','),
                      meFull: window.__ft.FT.tribalName(me,P)}}""")
            print(tag, 'focus after add:', f1, f2); print(tag, info)
            await pg.screenshot(path=f'shots/22_quick_{tag}.png')
            # now build dad's side: click dad card, add grandpa & grandma -> stays on dad
            await pg.evaluate("""()=>{const t=window.__ft.tree;const id=t.people[t.meId].fatherId;const c=document.querySelector('.card[data-id="'+id+'"]');
              c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));}""")
            await pg.wait_for_timeout(200)
            await add('father','Yumin'); await add('mother','Lawa')
            info2 = await pg.evaluate("""()=>{const t=window.__ft.tree,P=t.people,dad=P[P[t.meId].fatherId],n=id=>id&&P[id]?P[id].given:null;
              return {selected:document.querySelector('.card.sel .tn').textContent, gpa:n(dad.fatherId), gma:n(dad.motherId), dadFull:window.__ft.FT.tribalName(dad,P), newCard:document.querySelector('.card.new .tn').textContent}}""")
            print(tag, info2)
            # "改他的其他資料" moves selection to the new person
            await pg.click('#qGo'); await pg.wait_for_timeout(200)
            print(tag, 'after qGo selected:', await pg.evaluate("document.querySelector('.card.sel .tn').textContent"), '| quick box:', await pg.locator('.quick').count())
            await pg.screenshot(path=f'shots/23_after_{tag}.png')
            print(tag, 'errors:', errs)
        await b.close()
asyncio.run(main())
