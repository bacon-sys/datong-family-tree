import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../index.html"))+''
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':1366,'height':860}, accept_downloads=True)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__printed=0; window.print=()=>{window.__printed++}")
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.click('text=我已經有檔案')
        await pg.set_input_files('#fileOne','shots/族譜_801-05_林小芸_20261104.json'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/10_avatars.png')
        # zoom in on cards
        await pg.click('#bMe'); await pg.click('#bIn'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/11_avatars_zoom.png', clip={'x':0,'y':160,'width':960,'height':700})
        # print small family
        await pg.click('#bPrint'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/12_print_small.png')
        await pg.click('.modal .mf >> text=🖨️ 列印'); await pg.wait_for_timeout(200)
        print('print called:', await pg.evaluate('window.__printed'))
        await pg.emulate_media(media='print'); await pg.pdf(path='shots/small.pdf', print_background=True, prefer_css_page_size=True); await pg.emulate_media(media='screen')
        # big family
        await pg.evaluate("window.confirm=()=>true")
        await pg.click('#bImport')
        await pg.set_input_files('#fileOne','shots/big.json'); await pg.wait_for_timeout(500)
        if await pg.locator('text=取代').count(): await pg.click('.modal .mf >> text=取代')
        await pg.wait_for_timeout(700)
        await pg.screenshot(path='shots/13_big.png')
        t0 = await pg.evaluate("performance.now()")
        await pg.fill('#find','tali'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/14_find.png')
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        # typing speed
        dt = await pg.evaluate("""async()=>{const i=document.querySelector('#fGiven');const t0=performance.now();for(const ch of 'Abcdefgh'){i.value+=ch;i.dispatchEvent(new Event('input'));}return (performance.now()-t0)/8}""")
        print('ms per keystroke (big):', round(dt))
        await pg.screenshot(path='shots/15_big_selected.png')
        await pg.click('#bPrint'); await pg.wait_for_timeout(800)
        await pg.screenshot(path='shots/16_print_big.png')
        n = await pg.evaluate("document.querySelector('#print').children.length"); print('big tile pages:', n)
        await pg.emulate_media(media='print'); await pg.pdf(path='shots/big_tile.pdf', print_background=True, prefer_css_page_size=True); await pg.emulate_media(media='screen')
        await pg.click('.chip[data-v="paternal"]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='shots/17_print_paternal.png')
        n = await pg.evaluate("document.querySelector('#print').children.length"); print('paternal pages:', n)
        await pg.emulate_media(media='print'); await pg.pdf(path='shots/big_pat.pdf', print_background=True, prefer_css_page_size=True); await pg.emulate_media(media='screen')
        async with pg.expect_download() as dl:
            await pg.click('.modal .mf >> text=下載列印檔')
        d = await dl.value; await d.save_as('shots/printdoc.html'); print('printdoc', d.suggested_filename)
        # open the print doc
        p2 = await ctx.new_page(); await p2.add_init_script("window.__printed=0; window.print=()=>{window.__printed++}")
        await p2.goto('file:///home/claude/ftree/shots/printdoc.html'); await p2.wait_for_timeout(1500)
        print('printdoc auto print:', await p2.evaluate('window.__printed'))
        await p2.screenshot(path='shots/18_printdoc.png')
        print('errors:', errs)
        # sandboxed iframe (like a preview window)
        open('shots/frame.html','w').write('<iframe sandbox="allow-scripts allow-downloads" src="app.html" style="width:1300px;height:820px;border:0"></iframe>')
        p3 = await ctx.new_page(); await p3.set_viewport_size({'width':1320,'height':840})
        await p3.goto('http://127.0.0.1:8765/frame.html'); await p3.wait_for_timeout(1200)
        f = p3.frames[1]
        await f.fill('#wCls','801'); await f.fill('#wSeat','1'); await f.fill('#wGiven','Batu'); await f.click('#wG button[data-g="M"]'); await f.click('text=開始 ➜'); await p3.wait_for_timeout(400)
        await f.click('#bPrint'); await p3.wait_for_timeout(500)
        await p3.screenshot(path='shots/19_frame.png')
        await b.close()
asyncio.run(main())
