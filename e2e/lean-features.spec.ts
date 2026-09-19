import { expect, test } from "@playwright/test";
import { api, setupCreator } from "./feature-helpers";

test("CSV files preview and import titles as paused drafts", async ({page})=>{
 await setupCreator(page); await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Import links',exact:true}).click();
 await page.getByLabel('CSV file').setInputFiles({name:'links.csv',mimeType:'text/csv',buffer:Buffer.from('Title,URL\n"Portfolio, 2026",https://example.com/work\nNotes,https://example.com/notes')});
 await expect(page.getByText('2 new links · 0 duplicates skipped')).toBeVisible(); await page.getByRole('button',{name:'Import as drafts'}).click();
 await expect(page.getByText('Portfolio, 2026',{exact:true})).toBeVisible();
 const data=await page.request.get('/api/trpc/links.list');expect((await data.json()).result.data.json.links.every((l:{isActive:boolean})=>!l.isActive)).toBe(true);
});

test("Markdown link lists preserve titles in the import preview", async ({page}) => {
 await setupCreator(page); await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Import links',exact:true}).click();
 await page.getByLabel('Website URLs').fill('# Favorites\n- [My notes](https://example.com/notes)');
 await expect(page.getByText('1 new links · 0 duplicates skipped')).toBeVisible();
 await page.getByRole('button',{name:'Import as drafts'}).click();
 await expect(page.getByText('My notes',{exact:true})).toBeVisible();
});

test("Save and add another keeps the form ready for the next link", async ({page}) => {
 await setupCreator(page); await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Add link',exact:true}).click();
 const dialog=page.getByRole('dialog'); await dialog.getByLabel('Title',{exact:true}).fill('First'); await dialog.getByLabel('URL',{exact:true}).fill('example.com/first');
 await dialog.getByRole('button',{name:'Save & add another'}).click();
 await expect(dialog.getByLabel('Title',{exact:true})).toHaveValue(''); await expect(dialog.getByLabel('Title',{exact:true})).toBeFocused();
 await dialog.getByLabel('Title',{exact:true}).fill('Second'); await dialog.getByLabel('URL',{exact:true}).fill('example.com/second');
 await dialog.getByRole('button',{name:'Add link',exact:true}).click(); await expect(dialog).not.toBeVisible();
 await expect(page.getByText('First',{exact:true})).toBeVisible(); await expect(page.getByText('Second',{exact:true})).toBeVisible();
});

test("Link editor preview follows content without publishing", async ({page}) => {
 await setupCreator(page); await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Add link',exact:true}).click(); const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Title',{exact:true}).fill('Preview title'); await dialog.getByLabel('Description (optional)').fill('Preview description');
 await dialog.getByText('Preview link card',{exact:true}).click();
 await expect(dialog.locator('[data-card-preview="true"]')).toContainText('Preview title'); await expect(dialog.locator('[data-card-preview="true"]')).toContainText('Preview description');
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 const response=await page.request.get('/api/trpc/links.list'); expect((await response.json()).result.data.json.links).toHaveLength(0);
});

test("URL cleanup is opt-in and preserves destination parameters", async ({page}) => {
 await setupCreator(page); await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled(); await page.getByRole('button',{name:'Add link',exact:true}).click();
 const url=page.getByRole('dialog').getByLabel('URL',{exact:true}); await url.fill('https://example.com/?utm_source=mail&product=42#buy');
 await page.getByText('Remove tracking parameters',{exact:true}).click(); await expect(url).toHaveValue('https://example.com/?utm_source=mail&product=42#buy');
 await page.getByRole('button',{name:'Use clean URL'}).click(); await expect(url).toHaveValue('https://example.com/?product=42#buy');
});

test("Link editor warns about duplicate destinations including tracking variants", async ({page}) => {
 await setupCreator(page); await api(page.request,'links.add',{title:'Existing site',url:'https://example.com/?utm_source=mail'});
 await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled(); await page.getByRole('button',{name:'Add link',exact:true}).click();
 const dialog=page.getByRole('dialog'); await dialog.getByLabel('URL',{exact:true}).fill('example.com');
 await expect(dialog.getByRole('status')).toContainText('already appears in 1 link: Existing site');
 await dialog.getByLabel('URL',{exact:true}).fill('example.org'); await expect(dialog.getByRole('status')).toHaveCount(0);
});

test("Publishing shortcuts fill editable dates and clear schedules", async ({page}) => {
 await setupCreator(page); await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled(); await page.getByRole('button',{name:'Add link',exact:true}).click();
 const dialog=page.getByRole('dialog'); await dialog.getByLabel('Schedule shortcut').selectOption('tomorrow'); await expect(dialog.getByLabel('Publish at',{exact:true})).toHaveValue(/T09:00$/);
 await dialog.getByLabel('Schedule shortcut').selectOption('week'); await expect(dialog.getByLabel('Publish at',{exact:true})).toHaveValue(''); await expect(dialog.getByLabel('Hide at',{exact:true})).not.toHaveValue('');
 await dialog.getByLabel('Schedule shortcut').selectOption('none'); await expect(dialog.getByLabel('Hide at',{exact:true})).toHaveValue('');
});

test("Filtered CSV export includes only matching links", async ({page}) => {
 await setupCreator(page); await api(page.request,'links.add',{title:'Keep me',url:'https://example.com/keep'}); await api(page.request,'links.add',{title:'Exclude me',url:'https://example.com/exclude'});
 await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Add link',exact:true})).toBeEnabled(); await page.getByLabel('Search links',{exact:true}).fill('Keep me'); await page.getByText('More link tools',{exact:true}).click();
 const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'Export filtered links (1)',exact:true}).click(); const download=await downloadPromise;
 expect(download.suggestedFilename()).toContain('filtered'); const stream=await download.createReadStream(); const chunks=[]; for await (const chunk of stream!) chunks.push(chunk); const csv=Buffer.concat(chunks).toString(); expect(csv).toContain('Keep me'); expect(csv).not.toContain('Exclude me');
});

test("Selected Markdown copy retains titles and descriptions without unselected links", async ({page,context}) => {
 await context.grantPermissions(['clipboard-read','clipboard-write']); await setupCreator(page);
 await api(page.request,'links.add',{title:'My [notes]',url:'https://example.com/notes',description:'Useful notes'}); await api(page.request,'links.add',{title:'Unselected',url:'https://example.com/private'});
 await page.goto('/dashboard'); await expect(page.getByRole('button',{name:'Select',exact:true})).toBeEnabled(); await page.getByRole('button',{name:'Select',exact:true}).click(); await page.getByRole('checkbox',{name:'Select My [notes]',exact:true}).check(); await page.getByRole('button',{name:'Copy selected Markdown'}).click();
 await expect(page.getByText('Copied 1 link as Markdown',{exact:true})).toBeVisible(); const text=await page.evaluate(()=>navigator.clipboard.readText()); expect(text).toContain('https://example.com/notes'); expect(text).toContain('Useful notes'); expect(text).not.toContain('Unselected');
});

test("Catalog search combines words across fields and supports quoted phrases", async ({page}) => {
 await setupCreator(page); await api(page.request,'links.add',{title:'Portfolio',url:'https://example.com/work',description:'Selected projects'});
 await page.goto('/dashboard'); const search=page.getByLabel('Search links',{exact:true}); await expect(search).toBeEnabled(); await search.fill('portfolio projects'); await expect(page.getByText('Showing 1 of 1 links',{exact:true})).toBeVisible();
 await search.fill('"portfolio projects"'); await expect(page.getByText('Showing 0 of 1 links',{exact:true})).toBeVisible();
 await search.fill('portfolio "selected projects"'); await expect(page.getByText('Showing 1 of 1 links',{exact:true})).toBeVisible();
});

test("An existing saved view can be updated without creating duplicates", async ({page}) => {
 await setupCreator(page); await page.goto('/dashboard'); const search=page.getByLabel('Search links',{exact:true}); await expect(search).toBeEnabled(); await search.fill('old'); await page.getByText('More link tools',{exact:true}).click(); await page.getByText('Saved filter views',{exact:true}).click();
 await page.getByLabel('View name',{exact:true}).fill('Work'); await page.getByRole('button',{name:'Save current filters',exact:true}).click();
 await search.fill('new'); await page.getByLabel('View name',{exact:true}).fill('work'); await page.getByRole('button',{name:'Update saved view',exact:true}).click();
 await search.fill(''); await page.getByRole('button',{name:'Work',exact:true}).click(); await expect(search).toHaveValue('new'); await page.reload();
 await page.getByText('More link tools',{exact:true}).click(); await page.getByText('Saved filter views',{exact:true}).click(); await expect(page.getByRole('button',{name:'Work',exact:true})).toHaveCount(1); await page.getByRole('button',{name:'Work',exact:true}).click(); await expect(search).toHaveValue('new');
});

test("Visitors can download their saved links without an account", async ({page}) => {
 const {username}=await setupCreator(page); await api(page.request,'links.add',{title:'Saved essay',url:'https://example.com/essay'}); await api(page.request,'links.add',{title:'Not saved',url:'https://example.com/no'});
 await page.goto('/u/'+username); const save=page.getByRole('button',{name:'Save Saved essay for later',exact:true}); await expect(save).toBeEnabled(); await save.click(); await page.getByRole('button',{name:'Saved links · 1',exact:true}).click();
 const pending=page.waitForEvent('download'); await page.getByRole('button',{name:'Download saved links',exact:true}).click(); const download=await pending; expect(download.suggestedFilename()).toBe('saved-links.md'); const stream=await download.createReadStream(); const chunks=[]; for await(const chunk of stream!) chunks.push(chunk); const text=Buffer.concat(chunks).toString(); expect(text).toContain('[Saved essay](<https://example.com/essay>)'); expect(text).not.toContain('Not saved');
});

test("Reading list removal and clearing can be undone and persist", async ({page}) => {
 const {username}=await setupCreator(page); await api(page.request,'links.add',{title:'Undo essay',url:'https://example.com/essay'}); await page.goto('/u/'+username);
 const save=page.getByRole('button',{name:'Save Undo essay for later',exact:true}); await expect(save).toBeEnabled(); await save.click(); await page.getByRole('button',{name:'Saved links · 1',exact:true}).click();
 await page.getByRole('button',{name:'Remove Undo essay from reading list'}).click(); await expect(page.getByText('No saved links yet.',{exact:true})).toBeVisible(); await page.getByRole('button',{name:'Undo removal',exact:true}).click(); await expect(page.getByRole('dialog').getByRole('link',{name:'Undo essay'})).toBeVisible();
 await page.getByRole('button',{name:'Clear reading list',exact:true}).click(); await page.getByRole('button',{name:'Undo removal',exact:true}).click(); await page.reload(); await expect(page.getByRole('button',{name:'Saved links · 1',exact:true})).toBeVisible();
});

test("Search within saved links leaves the reading list intact", async ({page}) => {
 const {username}=await setupCreator(page); for(const title of ['Essay','Guide']) await api(page.request,'links.add',{title,url:'https://example.com/'+title}); await page.goto('/u/'+username);
 for(const title of ['Essay','Guide']) {const save=page.getByRole('button',{name:'Save '+title+' for later',exact:true}); await expect(save).toBeEnabled(); await save.click();}
 await page.getByRole('button',{name:'Saved links · 2',exact:true}).click(); const dialog=page.getByRole('dialog'); await dialog.getByLabel('Search saved links').fill('Essay'); await expect(dialog.getByRole('link',{name:'Essay',exact:true})).toBeVisible(); await expect(dialog.getByRole('link',{name:'Guide',exact:true})).toHaveCount(0);
 await dialog.getByLabel('Search saved links').fill('missing'); await expect(dialog.getByText('No saved links match this search.')).toBeVisible(); await dialog.getByLabel('Search saved links').fill(''); await expect(dialog.getByRole('link')).toHaveCount(2);
});

test("Link health filters results and clears hidden selections", async ({page}) => {
 await setupCreator(page); await api(page.request,'links.add',{title:'Health notes',url:'https://example.com/notes'}); await api(page.request,'links.add',{title:'Health shop',url:'https://example.com/shop'});
 await page.goto('/dashboard/health'); const search=page.getByLabel('Search link health'); await expect(search).toBeEnabled(); await page.getByRole('button',{name:'Select unchecked',exact:true}).click(); await expect(page.getByRole('button',{name:'Check selected (2/10)',exact:true})).toBeEnabled();
 await search.fill('notes'); await expect(page.getByRole('checkbox')).toHaveCount(1); await expect(page.getByRole('button',{name:'Check selected (0/10)',exact:true})).toBeDisabled();
 await page.getByLabel('Filter health status').selectOption('healthy'); await expect(page.getByText('No links match these health filters.')).toBeVisible();
});

test("Health CSV exports the current filtered results", async ({page}) => {
 await setupCreator(page); for(const title of ['Notes','Shop']) await api(page.request,'links.add',{title,url:'https://example.com/'+title}); await page.goto('/dashboard/health'); const search=page.getByLabel('Search link health'); await expect(search).toBeEnabled(); await search.fill('Notes');
 const pending=page.waitForEvent('download'); await page.getByRole('button',{name:'Export health results (1)',exact:true}).click(); const stream=await (await pending).createReadStream(); const chunks=[]; for await(const chunk of stream!) chunks.push(chunk); const csv=Buffer.concat(chunks).toString(); expect(csv).toContain('Notes'); expect(csv).toContain('unchecked'); expect(csv).not.toContain('Shop');
});

test("Stale health selection excludes recent and unchecked links", async ({page}) => {
 const {profile}=await setupCreator(page); const old=await api(page.request,'links.add',{title:'Stale',url:'https://example.com/old'}); const fresh=await api(page.request,'links.add',{title:'Fresh',url:'https://example.com/fresh'}); await api(page.request,'links.add',{title:'Unchecked',url:'https://example.com/new'});
 const {Client}=await import('pg'); const db=new Client({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@127.0.0.1:5432/llink_test'}); await db.connect(); try {await db.query("UPDATE links SET health_checked_at=now()-interval '8 days', health_state='healthy' WHERE id=$1 AND profile_id=$2",[old.id,profile.id]); await db.query("UPDATE links SET health_checked_at=now(), health_state='healthy' WHERE id=$1 AND profile_id=$2",[fresh.id,profile.id]);}finally{await db.end();}
 await page.goto('/dashboard/health'); await expect(page.getByRole('button',{name:'Select stale checks (1)',exact:true})).toBeEnabled(); await page.getByRole('button',{name:'Select stale checks (1)',exact:true}).click(); await expect(page.getByRole('checkbox',{name:/Stale/})).toBeChecked(); await expect(page.getByRole('checkbox',{name:/Fresh/})).not.toBeChecked(); await expect(page.getByRole('checkbox',{name:/Unchecked/})).not.toBeChecked();
});

test("Audience search finds subscribers beyond the first page and treats wildcards literally", async ({page}) => {
 const {profile}=await setupCreator(page); const {Client}=await import('pg'); const db=new Client({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@127.0.0.1:5432/llink_test'}); await db.connect(); try {
 await db.query("INSERT INTO subscribers(profile_id,email,name,consent_text,unsubscribe_hash) SELECT $1::uuid, 'reader'||n||'@example.test','Reader '||n,'Test consent', $1::uuid::text||'-'||n FROM generate_series(1,51) n",[profile.id]);
 await db.query("INSERT INTO subscribers(profile_id,email,name,consent_text,unsubscribe_hash,consent_at) VALUES($1,'needle@example.test','Old Subscriber','Test consent',$2,'2000-01-01')",[profile.id,crypto.randomUUID()]);
 }finally{await db.end();}
 await page.goto('/dashboard/audience'); await expect(page.getByRole('button',{name:'Search subscribers',exact:true})).toBeEnabled(); await expect(page.getByText('needle@example.test',{exact:true})).toHaveCount(0);
 await page.getByLabel('Search subscribers',{exact:true}).fill('OLD SUBSCRIBER'); await page.getByRole('button',{name:'Search subscribers',exact:true}).click(); await expect(page.getByText('needle@example.test',{exact:true})).toBeVisible(); await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
 await page.getByLabel('Search subscribers',{exact:true}).fill('%'); await page.getByRole('button',{name:'Search subscribers',exact:true}).click(); await expect(page.getByText('No subscribers match these filters.',{exact:true})).toBeVisible();
});

test("Audience status filters compose with search and preserve owner boundaries", async ({page,request}) => {
 const {profile}=await setupCreator(page); const {Client}=await import('pg'); const db=new Client({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@127.0.0.1:5432/llink_test'}); await db.connect(); try {
 await db.query("INSERT INTO subscribers(profile_id,email,name,consent_text,unsubscribe_hash,unsubscribed_at) VALUES($1,'active@example.test','Reader','Test',$2,null),($1,'left@example.test','Reader','Test',$3,now())",[profile.id,crypto.randomUUID(),crypto.randomUUID()]);
 }finally{await db.end();}
 await page.goto('/dashboard/audience'); const filter=page.getByLabel('Subscriber status'); await expect(filter).toBeEnabled(); await filter.selectOption('unsubscribed'); await expect(page.getByText('left@example.test',{exact:true})).toBeVisible(); await expect(page.getByText('active@example.test',{exact:true})).toHaveCount(0);
 await filter.selectOption('active'); await expect(page.getByText('active@example.test',{exact:true})).toBeVisible(); await expect(page.getByText('left@example.test',{exact:true})).toHaveCount(0);
 const name='other'+Date.now(); expect((await request.post('/api/auth/sign-up/email',{data:{name,email:name+'@example.test',password:'FeaturePassword123!'}})).ok()).toBe(true); await api(request,'profile.create',{username:name});
 const response=await request.get('/api/trpc/audience.list',{params:{input:JSON.stringify({json:{search:'Reader',status:'active'}})}}); const data=(await response.json()).result.data.json; expect(data.rows).toEqual([]); expect(data.matchingCount).toBe(0);
});
