import asyncio, json, os
from playwright.async_api import async_playwright
SRC='file://'+os.path.abspath('/home/claude/datong-family-tree/index.html')
data=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../sample_origin.json')).read()
os.makedirs('shots', exist_ok=True)
SEL="""n=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given===n||p.han===n).id;const c=document.querySelector('.card[data-id="'+id+'"]');
 c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));return id;}"""
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for w,h,tag in [(1280,800,'d'),(820,1180,'t'),(390,844,'m')]:
      ctx = await b.new_context(viewport={'width':w,'height':h}, has_touch=w<1000)
      await ctx.add_init_script("if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('datongFT.mine.v1', %s);sessionStorage.setItem('x','1')}" % json.dumps(data))
      pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.goto(SRC); await pg.wait_for_timeout(800)
      tb = await pg.evaluate("(()=>{const t=document.querySelector('#toolbar');return [t.scrollWidth,t.clientWidth, Math.round(t.getBoundingClientRect().height)]})()")
      await pg.screenshot(path=f'shots/origin_tb_{tag}.png', clip={'x':0,'y':0,'width':w,'height':170})
      if w > 1100: await pg.click('#bOrigin')
      else:
        await pg.click('#bMore'); await pg.wait_for_timeout(200); await pg.click('#moreMenu button[data-s="#bOrigin"]')
      await pg.wait_for_timeout(400)
      await pg.screenshot(path=f'shots/origin_dlg_{tag}.png')
      await pg.evaluate("document.querySelector('.modal .mb').scrollTop=9999"); await pg.wait_for_timeout(150)
      await pg.screenshot(path=f'shots/origin_dlg2_{tag}.png')
      txt = await pg.evaluate("document.querySelector('.olegend').innerText.replace(/\\n/g,' ')")
      # 點表格裡的名字 → 跳到那個人
      await pg.click('.otable button[data-go]'); await pg.wait_for_timeout(400)
      panelOpen = await pg.evaluate("!document.querySelector('#panel').classList.contains('hidden')")
      line = await pg.evaluate("(document.querySelector('#fOrigin')||{}).innerText")
      # 改族籍 → 面板摘要即時更新
      await pg.evaluate(SEL, 'Watan'); await pg.wait_for_timeout(300)
      before = await pg.evaluate("document.querySelector('#fOrigin').innerText")
      await pg.evaluate(SEL, 'Panay'); await pg.wait_for_timeout(300)
      await pg.select_option('#fTribe', '泰雅族'); await pg.wait_for_timeout(300)
      await pg.evaluate(SEL, 'Watan'); await pg.wait_for_timeout(300)
      after = await pg.evaluate("document.querySelector('#fOrigin').innerText")
      await pg.locator('#fOrigin').scroll_into_view_if_needed(); await pg.screenshot(path=f'shots/origin_panel_{tag}.png')
      print(tag, '工具列 scroll/client/高', tb, '| 圖例', txt, '| 點名字開面板', panelOpen, '|', line)
      print('   媽媽改泰雅前：', before, '→ 後：', after, '| errors', errs)
      await ctx.close()
    await b.close()
asyncio.run(main())
