import asyncio, json, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
SRC='file://'+os.path.abspath(os.path.join(HERE,'../../index.html'))
data=open(os.path.join(HERE,'../sample_origin.json')).read()
os.makedirs('shots', exist_ok=True)
SEL="""n=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given===n).id;const c=document.querySelector('.card[data-id="'+id+'"]');
 c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));return id;}"""
ST1='爺爺 Behuy 年輕時每年都跟著族人上山狩獵，最會做陷阱。\n他常說：山是祖先留給我們的，要好好照顧。'
ST2='奶奶 Ciwan 很會織布，紅色和黑色的菱形紋是她最常織的花紋。'
async def write(pg, name, text):
    await pg.evaluate(SEL, name); await pg.wait_for_timeout(250)
    await pg.locator('#fStory').scroll_into_view_if_needed(); await pg.fill('#fStory', text); await pg.wait_for_timeout(250)
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for w,h,tag in [(1280,800,'d'),(820,1180,'t'),(390,844,'m')]:
      ctx = await b.new_context(viewport={'width':w,'height':h}, has_touch=w<1000)
      await ctx.add_init_script("if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('datongFT.mine.v1', %s);sessionStorage.setItem('x','1')}" % json.dumps(data))
      pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.goto(SRC); await pg.wait_for_timeout(800)
      await write(pg, 'Behuy', ST1); await write(pg, 'Ciwan', ST2)
      cnt = await pg.evaluate("document.querySelector('#fStoryN').textContent")
      await pg.screenshot(path=f'shots/story_panel_{tag}.png')
      long = await pg.evaluate("(()=>{const t=document.querySelector('#fStory'); return t.maxLength})()")
      await pg.click('#pClose'); await pg.wait_for_timeout(200)
      badges = await pg.evaluate("document.querySelectorAll('.card .storyb').length")
      # 放大看卡片
      await pg.evaluate("""()=>{const t=window.__ft.tree;const id=Object.values(t.people).find(p=>p.given==='Behuy').id;const c=document.querySelector('.card[data-id="'+id+'"]');
        document.querySelector('#stage').style.transform='translate('+(-parseFloat(c.style.left)+30)+'px,'+(-parseFloat(c.style.top)+40)+'px) scale(1)';}""")
      await pg.wait_for_timeout(200)
      if tag=='d': await pg.screenshot(path='shots/story_card.png', clip={'x':0,'y':150,'width':700,'height':260})
      # 點小書記號
      bid = await pg.evaluate("Object.values(window.__ft.tree.people).find(p=>p.given==='Behuy').id")
      bx = await pg.evaluate("id=>{const r=document.querySelector('.card[data-id=\"'+id+'\"] .storyb').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}", bid)
      if w < 1000: await pg.touchscreen.tap(bx[0], bx[1])
      else: await pg.mouse.click(bx[0], bx[1])
      await pg.wait_for_timeout(400)
      opened = await pg.evaluate("!!document.querySelector('#stBody') && document.querySelector('.stnav span').textContent")
      panelOpened = await pg.evaluate("!document.querySelector('#panel').classList.contains('hidden')")
      await pg.screenshot(path=f'shots/story_dlg_{tag}.png')
      await pg.click('#stNext'); await pg.wait_for_timeout(200)
      second = await pg.evaluate("document.querySelector('.stn').textContent + ' | ' + document.querySelector('.stnav span').textContent")
      await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(150)
      back = await pg.evaluate("document.querySelector('.stn').textContent")
      await pg.click('#stEdit'); await pg.wait_for_timeout(600)
      focused = await pg.evaluate("document.activeElement && document.activeElement.id")
      print(tag, '字數', cnt, '上限', long, '| 小書記號', badges, '| 點記號開故事卡', opened, '沒開編輯欄', not panelOpened, '| 下一則', second, '| ←', back, '| 修改→游標在', focused, '| errors', errs)
      if tag=='d':
        await pg.click('#pClose')
        # 找家人：搜尋故事內容
        await pg.fill('#find', '狩獵'); await pg.wait_for_timeout(300)
        print('  搜尋「狩獵」：', await pg.evaluate("document.querySelector('#findRes').innerText.replace(/\\n/g,' ')"))
        await pg.fill('#find', ''); 
        # 列印：預設不附、勾選後附上
        await pg.click('#bPrint'); await pg.wait_for_timeout(400)
        n0 = await pg.evaluate("document.querySelector('#print').children.length")
        await pg.click('.chip[data-k="stories"][data-v="1"]'); await pg.wait_for_timeout(300)
        n1 = await pg.evaluate("document.querySelector('#print').children.length")
        await pg.screenshot(path='shots/story_printdlg.png')
        await pg.emulate_media(media='print'); await pg.pdf(path='shots/story_print.pdf', format='A4', landscape=True, print_background=True)
        print('  列印頁數：預設', n0, '→ 勾選故事頁後', n1)
      await ctx.close()
    # 老師檢視：唯讀
    ctx = await b.new_context(viewport={'width':1280,'height':800}, accept_downloads=True)
    pg = await ctx.new_page(); await pg.goto(SRC); await pg.wait_for_timeout(500)
    t = json.loads(data); 
    for p in t['people'].values():
        if p.get('given')=='Behuy': p['story']=ST1
    open('shots/st_student.json','w').write(json.dumps(t))
    await pg.evaluate("document.querySelectorAll('.modal-bg').forEach(m=>m.remove())")
    await pg.set_input_files('#fileMany', 'shots/st_student.json'); await pg.wait_for_timeout(500)
    await pg.click('[data-view]'); await pg.wait_for_timeout(500)
    bid = await pg.evaluate("Object.values(window.__ft.tree.people).find(p=>p.given==='Behuy').id")
    await pg.evaluate("id=>{const b=document.querySelector('.card[data-id=\"'+id+'\"] .storyb'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:5})); b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:5}));}", bid)
    await pg.wait_for_timeout(300)
    print('老師檢視：故事卡', await pg.evaluate("!!document.querySelector('#stBody')"), '| 沒有修改鈕', await pg.evaluate("!document.querySelector('#stEdit')"))
    await b.close()
asyncio.run(main())
