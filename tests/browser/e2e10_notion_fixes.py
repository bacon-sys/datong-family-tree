import asyncio, json, os
from playwright.async_api import async_playwright
SRC='file://'+os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../index.html'))
os.makedirs('shots', exist_ok=True)
SEL="""n=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given===n).id;const c=document.querySelector('.card[data-id="'+id+'"]');
 c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));return id;}"""
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # 建資料：Test Father（我，泰雅族），爸爸漢族、媽媽沒填；我有 9 個兒子 A1~A9
    import subprocess
    data = subprocess.check_output(['node','-e',"""
const FT=require(process.argv[1]);
const t=FT.newTree({given:'Test',gender:'M',tribe:'泰雅族'});
const d=FT.addRelative(t,t.meId,'father').id; t.people[d].han='爸爸';t.people[d].tribe='漢族';
for(let i=1;i<=9;i++){const k=FT.addRelative(t,t.meId,'son').id; t.people[k].given='A'+i;}
console.log(JSON.stringify(t));""", os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../src/core.js'))]).decode()
    ctx = await b.new_context(viewport={'width':1280,'height':720})
    await ctx.add_init_script("if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('datongFT.mine.v1', %s);sessionStorage.setItem('x','1')}" % json.dumps(data))
    pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(SRC); await pg.wait_for_timeout(700)
    # 1. 列印 → 分頁拼貼 → 取消
    for mode in ['tile','fit']:
      await pg.click('#bPrint'); await pg.wait_for_timeout(300)
      await pg.click(f'.chip[data-k="mode"][data-v="{mode}"]'); await pg.wait_for_timeout(200)
      await pg.click('.modal .mf button:has-text("取消")'); await pg.wait_for_timeout(200)
      print('1.', mode, '取消後列印內容顯示?', await pg.evaluate("getComputedStyle(document.querySelector('#print')).display"))
    await pg.click('#bPrint'); await pg.wait_for_timeout(300); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    print('1. Esc 關閉後', await pg.evaluate("getComputedStyle(document.querySelector('#print')).display"))
    await pg.click('#bPrint'); await pg.wait_for_timeout(300); await pg.click('.modal .mx'); await pg.wait_for_timeout(200)
    print('1. ✕ 關閉後', await pg.evaluate("getComputedStyle(document.querySelector('#print')).display"))
    await pg.screenshot(path='shots/re_print.png')
    # 2. A1 改成 9；A9 改成 0
    BO="()=>Object.values(window.__ft.tree.people).filter(p=>/^A/.test(p.given)).sort((a,b)=>a.given.localeCompare(b.given,'en',{numeric:true})).map(p=>p.given+'='+p.bo).join(' ')"
    await pg.evaluate(SEL, 'A1'); await pg.wait_for_timeout(250)
    await pg.locator('summary:has-text("更多設定")').click(); await pg.wait_for_timeout(150)
    await pg.fill('#fBo', '9'); await pg.press('#fBo', 'Enter'); await pg.wait_for_timeout(300)
    print('2. A1→9：', await pg.evaluate(BO), '| 提示：', await pg.evaluate("(document.querySelector('.toast')||{}).textContent"))
    await pg.evaluate(SEL, 'A9'); await pg.wait_for_timeout(250)
    await pg.locator('summary:has-text("更多設定")').click(); await pg.wait_for_timeout(150)
    await pg.fill('#fBo', '0'); await pg.wait_for_timeout(100)
    note = await pg.evaluate("document.querySelector('#fBoNote').textContent")
    await pg.screenshot(path='shots/re_bo0.png')
    await pg.press('#fBo', 'Enter'); await pg.wait_for_timeout(300)
    print('2. A9→0：欄位提示「', note, '」→', await pg.evaluate(BO), '| 提示：', await pg.evaluate("(document.querySelector('.toast')||{}).textContent"))
    xs = await pg.evaluate("()=>{const L=window.__ft.FT.layout(window.__ft.tree);return Object.values(window.__ft.tree.people).filter(p=>/^A/.test(p.given)).sort((a,b)=>L.pos[a.id].x-L.pos[b.id].x).map(p=>p.given).join(' ')}")
    print('2. 畫面由左到右：', xs)
    # 3. 族群來源
    await pg.click('#pClose'); await pg.click('#bOrigin'); await pg.wait_for_timeout(300)
    print('3.', await pg.evaluate("document.querySelector('.olegend').innerText.replace(/\\n/g,' ')"), '|', await pg.evaluate("[...document.querySelectorAll('.onote')][0].innerText.slice(0,60)"))
    await pg.screenshot(path='shots/re_origin.png')
    await pg.keyboard.press('Escape'); await pg.evaluate(SEL, 'Test'); await pg.wait_for_timeout(250)
    print('3. 面板摘要：', await pg.evaluate("document.querySelector('#fOrigin').innerText.replace(/\\n/g,' ')"))
    print('errors', errs); await b.close()
asyncio.run(main())
