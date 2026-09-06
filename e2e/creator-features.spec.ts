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
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Musicians On repeat'}).click();
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
