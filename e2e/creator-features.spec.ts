import { expect, test, type APIRequestContext } from '@playwright/test';
async function write(api: APIRequestContext, name: string, input: unknown) {
 const res=await api.post(`/api/trpc/${name}`,{data:{json:input}});
 expect(res.ok(),await res.text()).toBe(true); return (await res.json()).result.data.json;
}
async function read(api: APIRequestContext,name:string,input?:unknown) {
 const res=await api.get(`/api/trpc/${name}`,{params:input===undefined?{}:{input:JSON.stringify({json:input})}});
 expect(res.ok(),await res.text()).toBe(true);return (await res.json()).result.data.json;
}
async function creator(api:APIRequestContext) {
 const username=`new${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
 expect((await api.post('/api/auth/sign-up/email',{data:{name:'New Creator',email:`${username}@example.test`,password:'CreatorFeatures123!'}})).ok()).toBe(true);
 return write(api,'profile.create',{username});
}
test('publishing windows, featured uniqueness and ownership are enforced',async({request,playwright,baseURL})=>{
 const profile=await creator(request);
 const past=new Date(Date.now()-60000).toISOString(), future=new Date(Date.now()+60000).toISOString();
 const live=await write(request,'links.add',{title:'Live spotlight',url:'https://example.com/live',featured:true,publishAt:past,expireAt:future,ctaLabel:'Discover'});
 const scheduled=await write(request,'links.add',{title:'Future',url:'https://example.com/future',publishAt:future});
 await write(request,'links.add',{title:'Expired',url:'https://example.com/expired',expireAt:past});
 let published=await read(request,'links.getPublic',{username:profile.username});
 expect(published.links.map((l:{id:string})=>l.id)).toEqual([live.id]);
 await write(request,'links.update',{id:scheduled.id,featured:true});
 expect((await read(request,'links.list')).links.filter((l:{featured:boolean})=>l.featured).map((l:{id:string})=>l.id)).toEqual([scheduled.id]);
 const bad=await request.post('/api/trpc/links.update',{data:{json:{id:live.id,expireAt:new Date(Date.now()-120000).toISOString()}}});
 expect(bad.status()).toBe(400);
 await write(request,'analytics.recordClick',{profileId:profile.id,linkId:scheduled.id});
 expect((await read(request,'analytics.getSummary',{days:7})).totalClicks).toBe(0);
 const other=await playwright.request.newContext({baseURL});
 try {await creator(other);expect((await other.post('/api/trpc/links.update',{data:{json:{id:live.id,featured:true}}})).status()).toBe(404);}finally{await other.dispose();}
 await write(request,'links.update',{id:scheduled.id,publishAt:null});
 published=await read(request,'links.getPublic',{username:profile.username});
 expect(published.links).toHaveLength(2);
});

test('design drafts preview, publish, persist and keep templates reversible',async({page})=>{
 const profile=await creator(page.request);
 await write(page.request,'links.add',{title:'My portfolio',url:'https://example.com/work'});
 await page.goto('/dashboard/design');
 await page.getByRole('heading',{name:'Design studio'}).waitFor();
 await page.getByLabel('Display name',{exact:true}).fill('Studio Creator');
 await page.getByLabel('Theme',{exact:true}).selectOption('dark');
 await page.getByLabel('Typography',{exact:true}).selectOption('editorial');
 await page.getByLabel('Button shape',{exact:true}).selectOption('pill');
 await page.getByRole('button',{name:'Add content block',exact:true}).click();
 await page.getByLabel('Title / image alt text').fill('Behind the scenes');
 await page.getByLabel('Text',{exact:true}).fill('Stories from the studio.');
 await expect(page.getByTestId('live-preview').getByText('Behind the scenes',{exact:true})).toBeVisible();
 expect((await read(page.request,'links.getPublic',{username:profile.username})).profile.contentBlocks).toHaveLength(0);
 await page.getByRole('button',{name:'Desktop',exact:true}).click();
 await page.screenshot({path:'/tmp/creator-design-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Publish design',exact:true}).click();
 await expect(page.getByText('Page design published',{exact:true})).toBeVisible();
 const published=await read(page.request,'links.getPublic',{username:profile.username});
 expect(published.profile.theme).toBe('dark');expect(published.profile.contentBlocks[0].title).toBe('Behind the scenes');
 await page.reload();await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Studio Creator');
 const nativeDialogs: string[] = [];
 page.on('dialog', async d => { nativeDialogs.push(d.type()); await d.dismiss(); });
 for (const [button, title] of [['Musicians On repeat', 'On repeat'], ['Freelancers Selected work', 'Selected work'], ['Restaurants At the table', 'At the table'], ['Events Save the date', 'Save the date']]) {
   const trigger=page.getByRole('button',{name:button});
   await trigger.click();
   const dialog=page.getByRole('dialog',{name:`Use ${title}?`});
   await expect(dialog).toBeVisible();
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
   await expect(dialog).not.toBeVisible();
   await expect(trigger).toBeFocused();
   await expect(page.getByLabel('Title / image alt text')).toHaveValue('Behind the scenes');
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Musicians On repeat'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/creator-template-dialog-mobile.png',animations:'disabled'});
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Musicians On repeat'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Use template',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 expect(nativeDialogs).toEqual([]);
 expect((await read(page.request,'links.getPublic',{username:profile.username})).profile.contentBlocks[0].title).toBe('Behind the scenes');
 await expect(page.getByTestId('live-preview').getByText('The latest',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Discard draft',exact:true}).click();
 await expect(page.getByLabel('Title / image alt text')).toHaveValue('Behind the scenes');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Phone',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/creator-design-mobile.png',fullPage:true});
 await page.goto(`/u/${profile.username}`);
 await expect(page.getByRole('heading',{name:'Behind the scenes'})).toBeVisible();
 await expect(page.getByRole('link',{name:'My portfolio'})).toBeVisible();
});

test('link checks persist blocked results and analytics compares the previous period',async({page})=>{
 const profile=await creator(page.request);
 const link=await write(page.request,'links.add',{title:'Local destination',url:'http://127.0.0.1/private'});
 const checked=await write(page.request,'health.check',{ids:[link.id]});
 expect(checked[0].healthState).toBe('blocked');
 expect((await read(page.request,'links.list')).links[0].healthState).toBe('blocked');
 expect((await page.request.post('/api/trpc/health.check',{data:{json:{ids:[link.id]}}})).status()).toBe(429);
 const {Client}=await import('pg');
 const client=new Client({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@127.0.0.1:5432/llink_test'});
 await client.connect();
 try{
 const start=new Date();start.setUTCHours(0,0,0,0);start.setUTCDate(start.getUTCDate()-6);
 await client.query('insert into click_events(link_id,profile_id,clicked_at) values($1,$2,$3),($1,$2,$4),($1,$2,$4)',[link.id,profile.id,new Date(start.getTime()-86400000),new Date()]);
 }finally{await client.end();}
 const summary=await read(page.request,'analytics.getSummary',{days:7});
 expect(summary.periodClicks).toBe(2);expect(summary.previousPeriodClicks).toBe(1);
 expect(summary.clicksByLink[0]).toMatchObject({count:2,previousCount:1});
 await page.goto('/dashboard/health');await expect(page.getByText(/blocked/)).toBeVisible();
 await write(page.request,'links.update',{id:link.id,url:'https://example.com/repaired'});expect((await read(page.request,'links.list')).links[0].healthState).toBeNull();
 await page.goto('/dashboard/analytics?days=7');await expect(page.getByRole('heading',{name:'What changed'})).toBeVisible();
 await expect(page.getByText('+100% vs previous 7 days (1 clicks)')).toBeVisible();
});

test('audience signup requires consent, deduplicates, exports safely, and supports undo',async({page,playwright,baseURL})=>{
 const profile=await creator(page.request);
 await page.goto('/dashboard/audience');
 await page.getByLabel('Show email signup on my page').check();
 await page.getByLabel('Signup heading').fill('Letters from the studio');
 await page.getByRole('button',{name:'Save signup settings'}).click();await expect(page.getByText('Signup settings saved',{exact:true})).toBeVisible();
 await page.goto(`/u/${profile.username}`);await expect(page.getByRole('heading',{name:'Letters from the studio'})).toBeVisible();
 await page.getByLabel('Your name (optional)').fill('=1+1');await page.getByLabel('Email address',{exact:true}).fill('reader@example.test');
 await expect(page.getByRole('button',{name:'Join the list'})).toBeDisabled();
 await page.getByRole('checkbox',{name:/I agree to receive/}).check();await page.getByRole('button',{name:'Join the list'}).click();
 await expect(page.getByText('Thanks! Your signup request has been saved.')).toBeVisible();
 const guest=await playwright.request.newContext({baseURL});try{
 expect((await guest.post('/api/trpc/audience.subscribe',{data:{json:{profileId:profile.id,email:'reader@example.test',consent:false}}})).status()).toBe(400);
 await write(guest,'audience.subscribe',{profileId:profile.id,email:'READER@example.test',consent:true});
 await write(guest,'audience.subscribe',{profileId:profile.id,email:'trap@example.test',consent:true,website:'bot'});
 expect((await guest.get('/api/trpc/audience.exportCsv')).status()).toBe(401);
 }finally{await guest.dispose();}
 let data=await read(page.request,'audience.list',{page:0});expect(data.total).toBe(1);expect(data.active).toBe(1);expect(JSON.stringify(data)).not.toContain('unsubscribeHash');expect(JSON.stringify(data)).not.toContain('encryptedKey');
 const csv=await read(page.request,'audience.exportCsv');expect(csv).toContain("'=1+1");expect(csv).toContain('I agree to receive email updates');
 await page.getByRole('button',{name:'Undo signup'}).click();await expect(page.getByRole('button',{name:'Join the list'})).toBeVisible();
 data=await read(page.request,'audience.list',{page:0});expect(data.active).toBe(0);
 await page.getByRole('checkbox',{name:/I agree to receive/}).check();await page.getByRole('button',{name:'Join the list'}).click();await expect(page.getByText('Thanks! Your signup request has been saved.')).toBeVisible();
 expect((await read(page.request,'audience.list',{page:0})).active).toBe(1);
 await page.goto('/dashboard/audience');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove subscriber reader@example.test'}).click();await expect(page.getByText('Subscriber removed',{exact:true})).toBeVisible();expect((await read(page.request,'audience.list',{page:0})).total).toBe(0);
});

test('custom domains require ownership and serve only verified active mappings',async({page,request})=>{
 const profile=await creator(page.request);const hostname=`${profile.username}.example.com`;
 await write(page.request,'links.add',{title:'Domain portfolio',url:'https://example.com/work'});
 expect((await page.request.post('/api/trpc/domains.add',{data:{json:{hostname:'https://creator.com'}}})).status()).toBe(400);
 await page.goto('/dashboard/domains');await page.getByLabel('Domain name').fill(hostname);await page.getByRole('button',{name:'Add domain',exact:true}).click();await expect(page.getByText('TXT name',{exact:true})).toBeVisible();
 const setup=await read(page.request,'domains.current');expect(setup.domain.status).toBe('pending');expect(setup.domain.proofHost).toBe(`_llink.${hostname}`);expect(setup.hostingConfigured).toBe(false);
 expect((await request.get('/',{headers:{host:hostname}})).status()).toBe(200);
 const pending=await request.get('/',{headers:{host:hostname}});expect(await pending.text()).not.toContain('Domain portfolio');
 const checked=await write(page.request,'domains.verify',{});expect(checked.status).toBe('pending');
 // Isolated database fixture represents successful DNS/TLS verification. The provider
 // protocol is tested separately with mocked responses; no live domain is provisioned.
 const {Client}=await import('pg');const client=new Client({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@127.0.0.1:5432/llink_test'});await client.connect();
 try{await client.query("update custom_domains set status='active', verified_at=now() where id=$1 and profile_id=$2",[setup.domain.id,profile.id]);}finally{await client.end();}
 const live=await request.get('/',{headers:{host:hostname}});expect(live.status()).toBe(200);const html=await live.text();expect(html).toContain('Domain portfolio');expect(html).toContain(`https://${hostname}/`);
 expect((await read(page.request,'links.getPublic',{username:profile.username})).customDomain).toBe(hostname);
 await page.reload();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove domain',exact:true}).click();await expect(page.getByLabel('Domain name')).toBeVisible();expect((await read(page.request,'domains.current')).domain).toBeNull();
 const removed=await request.get('/',{headers:{host:hostname}});expect(await removed.text()).not.toContain('Domain portfolio');
});

test('mobile floating navigation opens pages and search without crowding the header',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const profile=await creator(page.request);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/dashboard');
 const controls=page.getByRole('navigation',{name:'Mobile dashboard controls'});
 const trigger=controls.getByRole('button',{name:'Open navigation menu'});
 await expect(trigger).toBeEnabled();
 await expect(page.locator('header').getByRole('link',{name:'Sign out'})).toHaveCount(0);
 await expect(page.locator('header nav')).toHaveCount(0);
 await page.screenshot({path:'/tmp/mobile-dock-closed.png',animations:'disabled'});
 await trigger.click();
 const menu=page.getByRole('dialog',{name:'Your dashboard'});
 await expect(menu).toBeVisible();
 await expect(menu.getByRole('navigation',{name:'Dashboard pages'}).getByRole('link')).toHaveCount(7);
 await expect(menu.getByRole('link',{name:'Links',exact:true})).toHaveAttribute('aria-current','page');
 await expect(menu.getByRole('link',{name:'View public page'})).toHaveAttribute('href',`/u/${profile.username}`);
 await page.screenshot({path:'/tmp/mobile-dock-open.png',animations:'disabled'});
 // Sample rendered frames while closing/reopening: the dock must stay in place
 // and exactly one Find control must exist, including during exit animations.
 const dockBox=await controls.boundingBox();
 const sampleDock = () => page.evaluate(async () => {
   const frames:Array<{count:number,x:number,y:number}>=[];
   for(let i=0;i<16;i++) {
     await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
     const rect=document.querySelector('[aria-label="Mobile dashboard controls"]')!.getBoundingClientRect();
     frames.push({count:document.querySelectorAll('button[aria-label="Find pages and actions"]').length,x:rect.x,y:rect.y});
   }
   return frames;
 });
 await controls.getByRole('button',{name:'Close navigation menu'}).click();
 for(const frame of await sampleDock()){expect(frame.count).toBe(1);expect(frame.x).toBeCloseTo(dockBox!.x,0);expect(frame.y).toBeCloseTo(dockBox!.y,0);}
 await trigger.click();
 for(const frame of await sampleDock()){expect(frame.count).toBe(1);expect(frame.x).toBeCloseTo(dockBox!.x,0);expect(frame.y).toBeCloseTo(dockBox!.y,0);}
 await controls.getByRole('button',{name:'Close navigation menu'}).click();
 await trigger.click();
 await expect(menu).toBeVisible();
 await menu.getByRole('link',{name:'Design studio',exact:true}).click();
 await expect(page).toHaveURL(/\/dashboard\/design$/);
 await expect(menu).not.toBeVisible();
 await trigger.click();
 await expect(menu.getByRole('link',{name:'Design studio',exact:true})).toHaveAttribute('aria-current','page');
 await controls.getByRole('button',{name:'Find pages and actions'}).click();
 await expect(menu).not.toBeVisible();
 await page.getByRole('combobox',{name:'Search pages and actions'}).fill('Audience');
 await page.getByRole('option',{name:/Go to Audience/}).click();
 await expect(page).toHaveURL(/\/dashboard\/audience$/);
 await trigger.click();
 await page.keyboard.press('Escape');
 await expect(menu).not.toBeVisible();
 await expect(trigger).toBeFocused();
 await controls.getByRole('button',{name:'Find pages and actions'}).click();
 await expect(page.getByRole('combobox',{name:'Search pages and actions'})).toBeVisible();
 await page.getByRole('button',{name:'Close search'}).click();
 await page.setViewportSize({width:320,height:568});
 await trigger.click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const box=await menu.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(568);
 await menu.getByRole('button',{name:'Sign out',exact:true}).scrollIntoViewIfNeeded();
 await expect(menu.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
 await controls.getByRole('button',{name:'Close navigation menu'}).click();
 await page.setViewportSize({width:1280,height:900});
 await expect(controls).not.toBeVisible();
 await expect(page.locator('aside').getByRole('link',{name:'Design studio',exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 await trigger.click();
 await expect(menu).toBeVisible();
 await page.mouse.click(8,80);
 await expect(menu).not.toBeVisible();
 await expect(controls.getByRole('button',{name:'Find pages and actions'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('mobile menu locks background gestures and restores scrolling after closing',async({page,context})=>{
 await page.setViewportSize({width:390,height:568});
 await creator(page.request);
 await page.goto('/dashboard');
 const controls=page.getByRole('navigation',{name:'Mobile dashboard controls'});
 const trigger=controls.getByRole('button',{name:'Open navigation menu'});
 await expect(trigger).toBeEnabled();
 await page.evaluate(()=>window.scrollTo({top:120,behavior:'instant'}));
 const start=await page.evaluate(()=>scrollY);
 expect(start).toBeGreaterThan(0);
 await trigger.click();
 const menu=page.getByRole('dialog',{name:'Your dashboard'});
 await expect(menu).toBeVisible();
 const settle=()=>page.evaluate(async()=>{for(let i=0;i<10;i++)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));});
 await page.mouse.move(5,200);await page.mouse.wheel(0,300);await settle();
 expect(await page.evaluate(()=>scrollY)).toBe(start);
 const touch=await context.newCDPSession(page);
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:5,y:430}]});
 for(const y of [390,350,310,270,230])await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:5,y}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();
 expect(await page.evaluate(()=>scrollY)).toBe(start);
 const box=await menu.boundingBox();
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
 await page.mouse.wheel(0,200);
 await expect.poll(()=>menu.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
 await page.mouse.wheel(0,1000);await settle();
 expect(await page.evaluate(()=>scrollY)).toBe(start);
 await controls.getByRole('button',{name:'Close navigation menu'}).click();
 await expect(menu).not.toBeVisible();
 expect(await page.evaluate(()=>scrollY)).toBe(start);
 await page.mouse.move(5,200);await page.mouse.wheel(0,180);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(start);
 // Handing off to Find must not leave an extra scroll lock behind.
 await trigger.click();await controls.getByRole('button',{name:'Find pages and actions'}).click();
 await page.getByRole('button',{name:'Close search'}).click();
 await expect(page.getByRole('combobox',{name:'Search pages and actions'})).not.toBeVisible();
 const beforeUp=await page.evaluate(()=>scrollY);
 await page.mouse.move(5,200);await page.mouse.wheel(0,-160);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(beforeUp);
 await touch.detach();
});

test('mobile search fits the keyboard viewport, avoids focus zoom and keeps actions usable', async ({ page, context, browser, baseURL }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await creator(page.request);
 await page.goto('/dashboard');
 const find = page.getByRole('button', { name: 'Find pages and actions' });
 await expect(find).toBeEnabled();
 await find.click();
 const dialog = page.getByRole('dialog', { name: 'Command menu' });
 const search = page.getByRole('combobox', { name: 'Search pages and actions' });
 await expect(search).toBeFocused();
 expect(await search.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
 expect(await search.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('none');
 expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable=no|maximum-scale=1/);
 await page.screenshot({ path: '/tmp/search-mobile.png', animations: 'disabled' });
 // Model iOS: the keyboard shrinks/pans visualViewport while innerHeight stays tall.
 const visibleViewport = async (height: number, top = 0) => {
  await page.evaluate(({ height, top }) => {
   Object.defineProperties(window.visualViewport!, {
    height: { configurable: true, value: height },
    offsetTop: { configurable: true, value: top },
   });
   window.visualViewport!.dispatchEvent(new Event('resize'));
  }, { height, top });
  await expect.poll(async () => {
   const box = await dialog.boundingBox();
   return !!box && box.y >= top + 11 && box.y + box.height <= top + height - 11;
  }).toBe(true);
 };
 await visibleViewport(380);
 await page.screenshot({ path: '/tmp/search-mobile-keyboard.png', clip: { x: 0, y: 0, width: 390, height: 380 }, animations: 'disabled' });
 const initialTop = (await dialog.boundingBox())!.y;
 const list = dialog.getByRole('listbox');
 const listBox = (await list.boundingBox())!;
 await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + listBox.height / 2);
 const background = await page.evaluate(() => scrollY);
 await page.mouse.wheel(0, 400);
 await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(() => scrollY)).toBe(background);
 await search.fill('zzzznotapage');
 await expect(dialog.getByText('No matches found')).toBeVisible();
 expect((await dialog.boundingBox())!.y).toBeCloseTo(initialTop, 0);
 await search.fill('Audience');
 await expect(dialog.getByRole('option', { name: /Go to Audience/ })).toBeVisible();
 await visibleViewport(320, 40);
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/dashboard\/audience$/);
 await expect(dialog).not.toBeVisible();
 await find.click();
 await dialog.getByRole('button', { name: 'Quick create', exact: true }).click();
 const title = dialog.getByLabel('Title', { exact: true });
 await title.fill('Mobile quick link');
 expect(await title.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
 await dialog.getByLabel('URL', { exact: true }).fill('https://example.com/mobile-search');
 await dialog.getByRole('button', { name: 'Create link', exact: true }).click();
 await expect(dialog).not.toBeVisible();
 expect((await read(page.request, 'links.list')).links.some((link: { title: string }) => link.title === 'Mobile quick link')).toBe(true);
 await find.click();
 await page.setViewportSize({ width: 320, height: 568 });
 await visibleViewport(280);
 await page.screenshot({ path: '/tmp/search-mobile-small.png', clip: { x: 0, y: 0, width: 320, height: 280 }, animations: 'disabled' });
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await dialog.getByRole('button', { name: 'Close search' }).click();
 await expect(dialog).not.toBeVisible();
 await page.evaluate(() => {
  Reflect.deleteProperty(window.visualViewport!, 'height');
  Reflect.deleteProperty(window.visualViewport!, 'offsetTop');
 });
 await page.setViewportSize({ width: 1280, height: 900 });
 await page.keyboard.press('Control+k');
 await expect(search).toBeFocused();
 await page.screenshot({ path: '/tmp/search-desktop.png', animations: 'disabled' });
 await search.fill('Profile');
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/dashboard\/profile$/);
 await expect(dialog).not.toBeVisible();
 // A touch device in landscape must also follow its short visible viewport.
 const phone = await browser.newContext({ baseURL, storageState: await context.storageState(), viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
 try {
  const landscape = await phone.newPage();
  await landscape.goto('/dashboard');
  await expect(landscape.getByRole('button', { name: 'Find pages and actions', includeHidden: true })).toBeEnabled();
  await landscape.getByRole('button', { name: 'Open command palette' }).click();
  const panel = landscape.getByRole('dialog', { name: 'Command menu' });
  await expect(panel).toBeVisible();
  await expect(landscape.getByRole('combobox', { name: 'Search pages and actions' })).toBeFocused();
  await landscape.screenshot({ path: '/tmp/search-mobile-landscape.png', animations: 'disabled' });
  const bounds = (await panel.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(11);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(379);
  expect(await landscape.evaluate(() => visualViewport!.scale)).toBe(1);
 } finally { await phone.close(); }

});
