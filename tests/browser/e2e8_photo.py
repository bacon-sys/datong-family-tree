import asyncio, json, os
from playwright.async_api import async_playwright
SRC='file://'+os.path.abspath('/home/claude/datong-family-tree/index.html')
HERE=os.path.dirname(os.path.abspath(__file__))
data=open(os.path.join(HERE,'../sample_drag.json')).read()
os.makedirs('shots', exist_ok=True)
IMG=os.path.join(HERE,'../img/')
SEL="""n=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given===n).id;const c=document.querySelector('.card[data-id="'+id+'"]');
 c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));return id;}"""
ZOOM="""ns=>{const t=window.__ft.tree; const ids=ns.map(n=>Object.values(t.people).find(p=>p.given===n).id);
      const cs=ids.map(id=>document.querySelector('.card[data-id="'+id+'"]')); const xs=cs.map(c=>parseFloat(c.style.left)), ys=cs.map(c=>parseFloat(c.style.top));
      document.querySelector('#stage').style.transform='translate('+(-Math.min(...xs)+40)+'px,'+(-Math.min(...ys)+60)+'px) scale(1)';}"""
async def pick(pg, name, f):
    await pg.evaluate(SEL, name); await pg.wait_for_timeout(250)
    await pg.locator('#fPhoto').scroll_into_view_if_needed()
    async with pg.expect_file_chooser() as fc: await pg.click('#fPhoto')
    await (await fc.value).set_files(IMG+f); await pg.wait_for_timeout(700)
    return await pg.evaluate("(document.querySelector('.toast')||{}).textContent")
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':1280,'height':800}, accept_downloads=True)
    await ctx.add_init_script("if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('datongFT.mine.v1', %s);sessionStorage.setItem('x','1')}" % json.dumps(data))
    pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(SRC); await pg.wait_for_timeout(700)
    print('tall.jpg →', await pick(pg, 'Behuy', 'tall.jpg'))   # 爺爺（已過世）
    print('wide.png →', await pick(pg, 'Watan', 'wide.png'))   # 我
    await pg.screenshot(path='shots/photo_panel_d.png')
    print('broken →', await pick(pg, 'Loba', 'broken.jpg'))
    sizes = await pg.evaluate("Object.values(window.__ft.tree.people).filter(p=>p.photo).map(p=>(p.given)+':'+p.photo.length)")
    print('相片大小（字元）', sizes, '| 存檔總長', await pg.evaluate("localStorage.getItem('datongFT.mine.v1').length"))
    await pg.click('#pClose'); await pg.wait_for_timeout(150)
    await pg.evaluate(ZOOM, ['Behuy','Watan']); await pg.wait_for_timeout(300)
    await pg.screenshot(path='shots/photo_cards.png')
    # 重新整理後還在
    await pg.reload(); await pg.wait_for_timeout(1200)
    print('重新整理後還有相片', await pg.evaluate("document.querySelectorAll('.card .av img').length"), await pg.evaluate("[sessionStorage.getItem('x'), Object.values(window.__ft.tree.people).filter(p=>p.photo).length, (localStorage.getItem('datongFT.mine.v1')||'').length]"))
    # 移除相片
    await pg.evaluate(SEL, 'Watan'); await pg.wait_for_timeout(250); await pg.click('#fPhotoDel'); await pg.wait_for_timeout(300)
    print('移除後', await pg.evaluate("document.querySelectorAll('.card .av img').length"))
    await pick(pg, 'Watan', 'wide.png')
    # 列印 PDF
    await pg.click('#pClose')
    # 匯出
    async with pg.expect_download() as dl: await pg.click('#bExport')
    d = await dl.value; path = 'shots/export.json'; await d.save_as(path)
    ex = json.load(open(path)); print('匯出檔有相片', sum(1 for p in ex['people'].values() if p.get('photo')), '| 檔案大小 KB', os.path.getsize(path)//1024)
    # 容量不足：塞滿 localStorage
    filled = await pg.evaluate("""()=>{let n=0; for (const sz of [100000,10000,1000,100]) { const s='x'.repeat(sz); try{ for(;;){localStorage.setItem('junk'+n, s); n++; } }catch(e){} } return n}""")
    msg = await pick(pg, 'Ciwan', 'tall.jpg')
    print('塞滿後放相片 →', msg, '| 奶奶有相片?', await pg.evaluate("!!Object.values(window.__ft.tree.people).find(p=>p.given==='Ciwan').photo"), '| 存檔狀態', await pg.evaluate("document.querySelector('.save-state').textContent"))
    await pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('junk')).forEach(k=>localStorage.removeItem(k))")
    await pg.click('#pClose'); await pg.click('#bPrint'); await pg.wait_for_timeout(500)
    await pg.emulate_media(media='print'); await pg.pdf(path='shots/photo_print.pdf', format='A4', landscape=True, print_background=True)
    print('errors', errs); await ctx.close()
    # ---- 老師匯入 ----
    ctx = await b.new_context(viewport={'width':1280,'height':800})
    pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(SRC); await pg.wait_for_timeout(600)
    await pg.evaluate("document.querySelectorAll('.modal-bg').forEach(m=>m.remove())")
    await pg.set_input_files('#fileMany', path); await pg.wait_for_timeout(500)
    stored = await pg.evaluate("JSON.parse(localStorage.getItem('datongFT.class.v1'))[0].data.people")
    print('全班清單存檔裡的相片數', sum(1 for p in stored.values() if p.get('photo')))
    await pg.click('[data-view]'); await pg.wait_for_timeout(500)
    print('剛匯入、檢視時看得到相片', await pg.evaluate("document.querySelectorAll('.card .av img').length"))
    await pg.reload(); await pg.wait_for_timeout(600)
    await pg.evaluate("document.querySelectorAll('.modal-bg').forEach(m=>m.remove())")
    await pg.click('#bTeacher'); await pg.wait_for_timeout(300); await pg.click('[data-view]'); await pg.wait_for_timeout(500)
    print('重新整理後檢視（不留相片）', await pg.evaluate("document.querySelectorAll('.card .av img').length"))
    print('errors', errs)
    await b.close()
asyncio.run(main())
