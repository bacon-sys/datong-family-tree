import asyncio, json, os
from playwright.async_api import async_playwright
SRC='file://'+os.path.abspath('/home/claude/datong-family-tree/index.html')
data=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../sample_drag.json')).read()
os.makedirs('shots', exist_ok=True)
ORDER="""()=>{const t=window.__ft.tree; const gf=Object.values(t.people).find(p=>p.given==='Behuy');
  const L=window.__ft.FT.layout(t); return window.__ft.FT.unitSiblings(gf.id,t.people).map(q=>(q.given||q.han)+'#'+q.bo+'@'+Math.round(L.pos[q.id].x)).join(' ')}"""
CEN="""n=>{const t=window.__ft.tree; const id=Object.values(t.people).find(p=>p.given===n).id; const r=document.querySelector('.card[data-id="'+id+'"]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2, r.width]}"""
async def setup(b, w, h, touch):
    ctx = await b.new_context(viewport={'width':w,'height':h}, has_touch=touch)
    await ctx.add_init_script("if(!sessionStorage.getItem('x')){localStorage.setItem('datongFT.mine.v1', %s);sessionStorage.setItem('x','1')}" % json.dumps(data))
    pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(SRC); await pg.wait_for_timeout(700)
    # 放大到 0.7 倍、看伯公那一排
    await pg.evaluate("""()=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given==='Umas').id;const c=document.querySelector('.card[data-id="'+id+'"]');
      const x=parseFloat(c.style.left), y=parseFloat(c.style.top); document.querySelector('#stage').style.transform='translate('+(-x*0.7+40)+'px,'+(-y*0.7+150)+'px) scale(0.7)'; }""")
    # 讓 view 物件跟著（app 內 view 不是全域，改用按鈕重設不可行），改成點一下 + 再 - 會用 view；直接用實際 transform 計算
    await pg.wait_for_timeout(200)
    return ctx, pg, errs
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # ---- 滑鼠 ----
    ctx, pg, errs = await setup(b, 1280, 800, False)
    print('原本：', await pg.evaluate(ORDER))
    await pg.click('#bFit'); await pg.wait_for_timeout(200)

    a = await pg.evaluate(CEN, 'Amuy'); y1 = await pg.evaluate(CEN, 'Yukan'); t1 = await pg.evaluate(CEN, 'Tarow')
    print('cards on screen', [round(v) for v in a], [round(v) for v in y1], [round(v) for v in t1])
    # 1) 點一下：開面板
    await pg.mouse.click(a[0], a[1]); await pg.wait_for_timeout(250)
    print('點一下會開面板：', await pg.evaluate("!document.querySelector('#panel').classList.contains('hidden')"))
    await pg.click('#pClose'); await pg.wait_for_timeout(150)
    a = await pg.evaluate(CEN, 'Amuy'); y1 = await pg.evaluate(CEN, 'Yukan'); t1 = await pg.evaluate(CEN, 'Tarow')
    # 2) 快速拖：移動畫面、不換順序
    st0 = await pg.evaluate("document.querySelector('#stage').style.transform")
    await pg.mouse.move(a[0], a[1]); await pg.mouse.down()
    for i in range(1, 11): await pg.mouse.move(a[0]+i*15, a[1]+i*4); await pg.wait_for_timeout(10)
    await pg.mouse.up(); await pg.wait_for_timeout(200)
    st1 = await pg.evaluate("document.querySelector('#stage').style.transform")
    print('快速拖＝移動畫面：', st0 != st1, '| 順序：', await pg.evaluate(ORDER))
    a = await pg.evaluate(CEN, 'Amuy'); y1 = await pg.evaluate(CEN, 'Yukan'); t1 = await pg.evaluate(CEN, 'Tarow')
    # 3) 按住拖到 Yukan 和 Tarow 之間
    await pg.mouse.move(a[0], a[1]); await pg.mouse.down(); await pg.wait_for_timeout(450)
    lifted = await pg.evaluate("!!document.querySelector('.card.lift')")
    tx = (y1[0]+t1[0])/2
    for i in range(1, 21): await pg.mouse.move(a[0]+(tx-a[0])*i/20, a[1]); await pg.wait_for_timeout(15)
    await pg.wait_for_timeout(150)
    bar = await pg.evaluate("(()=>{const b=document.querySelector('.dropbar');return b&&!b.classList.contains('hidden')})()")
    await pg.screenshot(path='shots/drag_mid_d.png')
    await pg.mouse.up(); await pg.wait_for_timeout(300)
    print('按住後浮起：', lifted, '| 黃線出現：', bar, '| 放開後：', await pg.evaluate(ORDER))
    await pg.screenshot(path='shots/drag_after_d.png')
    toast = await pg.evaluate("(document.querySelector('.toast')||{}).textContent")
    saved = await pg.evaluate("Object.values(JSON.parse(localStorage.getItem('datongFT.mine.v1')).people).find(p=>p.given==='Amuy').bo")
    print('toast：', toast, '| 存檔 Amuy bo：', saved)
    # 4) 拖到別的地方：不換
    a = await pg.evaluate(CEN, 'Amuy')
    await pg.mouse.move(a[0], a[1]); await pg.mouse.down(); await pg.wait_for_timeout(450)
    for i in range(1, 11): await pg.mouse.move(a[0], a[1]+i*30); await pg.wait_for_timeout(15)
    await pg.mouse.up(); await pg.wait_for_timeout(300)
    print('拖到下面一排放開：', await pg.evaluate(ORDER), '|', await pg.evaluate("(document.querySelector('.toast')||{}).textContent"))
    print('errors', errs); await ctx.close()
    # ---- 觸控（平板）----
    ctx, pg, errs = await setup(b, 820, 1180, True)
    await pg.click('#bFit'); await pg.wait_for_timeout(200)

    cdp = await ctx.new_cdp_session(pg)
    t1 = await pg.evaluate(CEN, 'Tarow'); u = await pg.evaluate(CEN, 'Umas'); a = await pg.evaluate(CEN, 'Amuy')
    async def touch(kind, x, y): await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': ([{'x': x, 'y': y, 'id': 1}] if kind!='touchEnd' else [])})
    # Tarow 拖到最前面（Amuy 左邊）
    await touch('touchStart', t1[0], t1[1]); await pg.wait_for_timeout(600)
    lifted = await pg.evaluate("!!document.querySelector('.card.lift')")
    tx = a[0] - a[2]*0.6
    for i in range(1, 21): await touch('touchMove', t1[0]+(tx-t1[0])*i/20, t1[1]); await pg.wait_for_timeout(15)
    await pg.screenshot(path='shots/drag_mid_t.png')
    await touch('touchEnd', 0, 0); await pg.wait_for_timeout(300)
    print('平板 長按浮起：', lifted, '| 放開後：', await pg.evaluate(ORDER))
    # 觸控快速滑：移動畫面
    st0 = await pg.evaluate("document.querySelector('#stage').style.transform")
    a = await pg.evaluate(CEN, 'Umas')
    await touch('touchStart', a[0], a[1])
    for i in range(1, 8): await touch('touchMove', a[0]+i*20, a[1]); await pg.wait_for_timeout(10)
    await touch('touchEnd', 0, 0); await pg.wait_for_timeout(300)
    print('平板 快速滑＝移動畫面：', st0 != await pg.evaluate("document.querySelector('#stage').style.transform"), '| 順序不變：', await pg.evaluate(ORDER))
    await pg.screenshot(path='shots/drag_after_t.png')
    print('errors', errs); await ctx.close(); await b.close()
asyncio.run(main())
