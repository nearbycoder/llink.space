import { readFile } from "node:fs/promises";
import { expect, test } from '@playwright/test';
import { api, setupCreator } from './feature-helpers';
test('campaign builder applies a preview to the link draft and persists it', async({page})=>{
 await setupCreator(page);await page.goto('/dashboard');
 await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();
 await page.getByRole('button',{name:'Add link',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Add link'});
 await dialog.getByLabel('Title',{exact:true}).fill('Campaign');await dialog.getByLabel('URL',{exact:true}).fill('https://example.com/?keep=1#hello');
 await dialog.getByText('Campaign URL builder',{exact:true}).click();await dialog.getByLabel('Campaign source',{exact:true}).fill('newsletter');
 await expect(dialog.getByLabel('URL',{exact:true})).not.toHaveValue(/utm_source/);
 await expect(dialog.getByLabel('Campaign URL preview')).toContainText('utm_source=newsletter');await dialog.getByRole('button',{name:'Apply campaign URL'}).click();await expect(dialog.getByLabel('URL',{exact:true})).toHaveValue(/utm_source=newsletter/);await dialog.getByRole('button',{name:'Add link',exact:true}).click();
 await expect(page.getByText('Link added',{exact:true})).toBeVisible();
 await page.getByText('Campaign',{exact:true}).hover();await page.getByRole('button',{name:'Edit Campaign',exact:true}).click();await expect(page.getByLabel('URL',{exact:true})).toHaveValue('https://example.com/?keep=1&utm_source=newsletter#hello');
});

test('public QR share kit generates downloadable PNG and SVG locally',async({page})=>{
 const {username}=await setupCreator(page);await page.goto(`/u/${username}`);
 await page.getByRole('button',{name:'QR code',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Share with a scan'});
 await expect(dialog.getByRole('img',{name:`QR code for @${username}`})).toBeVisible();
 for(const format of ['SVG','PNG']) {
  const pending=page.waitForEvent('download');await dialog.getByRole('button',{name:`Download ${format}`}).click();const file=await pending;
  expect(file.suggestedFilename()).toBe(`profile-${username}-qr.${format.toLowerCase()}`);
  const path=await file.path();const bytes=await readFile(path!);expect(bytes.length).toBeGreaterThan(100);
  if(format==='SVG') expect(bytes.toString()).toContain('<svg');else expect(bytes.subarray(1,4).toString()).toBe('PNG');
 }
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).not.toBeVisible();
});


test('bookmark export creates folders and preserves escaped link content',async({page})=>{
 await setupCreator(page);const section=await api(page.request,'links.createSection',{title:'Work & play',splitIndex:0});
 await api(page.request,'links.add',{title:'My <site>',url:'https://example.com/?a=1&b=2',sectionId:section.id,description:'A & B'});
 await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByText('More link tools',{exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export bookmarks',exact:true}).click();const file=await pending;
 expect(file.suggestedFilename()).toBe('llink-bookmarks.html');const text=await readFile((await file.path())!,'utf8');expect(text).toContain('<H3>Work &amp; play</H3>');expect(text).toContain('My &lt;site&gt;');expect(text).toContain('<DD>A &amp; B');
});


test('Markdown export downloads a portable curated link list',async({page})=>{
 await setupCreator(page);await api(page.request,'links.add',{title:'Portfolio [2026]',url:'https://example.com/work',description:'Selected work'});await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByText('More link tools',{exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export Markdown',exact:true}).click();const file=await pending;expect(file.suggestedFilename()).toBe('llink-links.md');const text=await readFile((await file.path())!,'utf8');expect(text).toContain('(<https://example.com/work>)');expect(text).toContain('Selected work');
});


test('duplicate review finds tracking variants and opens the chosen link editor',async({page})=>{
 await setupCreator(page);await api(page.request,'links.add',{title:'First destination',url:'https://example.com/?utm_source=one'});await api(page.request,'links.add',{title:'Second destination',url:'https://example.com/?utm_source=two'});await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByText('More link tools',{exact:true}).click();await page.getByRole('button',{name:'Review duplicates (1)',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Duplicate destinations'});await expect(dialog.getByText('First destination',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Review Second destination'}).click();await expect(page.getByRole('dialog',{name:'Edit link'}).getByLabel('Title',{exact:true})).toHaveValue('Second destination');
});


test('publishing calendar lists future milestones and exports a real calendar file',async({page})=>{
 await setupCreator(page);const start=new Date(Date.now()+86400000).toISOString();await api(page.request,'links.add',{title:'Upcoming launch',url:'https://example.com/launch',publishAt:start});await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByText('More link tools',{exact:true}).click();await page.getByRole('button',{name:'Publishing calendar',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Publishing calendar'});await expect(dialog.getByText('Starts: Upcoming launch',{exact:true})).toBeVisible();await dialog.getByLabel('Calendar range').selectOption('7');const pending=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download calendar'}).click();const file=await pending;expect(file.suggestedFilename()).toBe('llink-publishing.ics');const text=await readFile((await file.path())!,'utf8');expect(text).toContain('BEGIN:VEVENT');expect(text).toContain('SUMMARY:Starts: Upcoming launch');
});


test('saved filter views survive reload, restore filters, and can be removed',async({page})=>{
 await setupCreator(page);await api(page.request,'links.add',{title:'Alpha portfolio',url:'https://example.com/alpha'});await api(page.request,'links.add',{title:'Beta blog',url:'https://example.com/beta'});await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByLabel('Search links').fill('Alpha');await page.getByText('More link tools',{exact:true}).click();await page.getByText('Saved filter views',{exact:true}).click();await page.getByLabel('View name').fill('My portfolio');await page.getByRole('button',{name:'Save current filters'}).click();await page.reload();await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByText('More link tools',{exact:true}).click();await page.getByText('Saved filter views',{exact:true}).click();await page.getByRole('button',{name:'My portfolio',exact:true}).click();await expect(page.getByLabel('Search links')).toHaveValue('Alpha');await expect(page.getByText('Showing 1 of 2 links')).toBeVisible();await page.getByRole('button',{name:'Delete view My portfolio'}).click();await expect(page.getByRole('button',{name:'My portfolio',exact:true})).not.toBeVisible();
});

test('dashboard sorting changes the view without changing page order',async({page})=>{
 await setupCreator(page);await api(page.request,'links.add',{title:'Zulu sort',url:'https://example.com/z'});await api(page.request,'links.add',{title:'Alpha sort',url:'https://example.com/a'});await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();const titles=page.locator('span').filter({hasText:/^(Zulu|Alpha) sort$/});await expect(titles).toHaveText(['Zulu sort','Alpha sort']);await page.getByLabel('Sort links',{exact:true}).selectOption('az');await expect(titles).toHaveText(['Alpha sort','Zulu sort']);await page.getByLabel('Sort links',{exact:true}).selectOption('manual');await expect(titles).toHaveText(['Zulu sort','Alpha sort']);await page.reload();await expect(titles).toHaveText(['Zulu sort','Alpha sort']);
});

test('bulk URL copy includes only selected links',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setupCreator(page);await api(page.request,'links.add',{title:'Copy first',url:'https://example.com/one'});await api(page.request,'links.add',{title:'Copy second',url:'https://example.com/two'});await page.goto('/dashboard');await expect(page.getByRole('button',{name:'Find pages and actions',includeHidden:true})).toBeEnabled();await page.getByRole('button',{name:'Select',exact:true}).click();await expect(page.getByRole('button',{name:'Copy selected URLs'})).toBeDisabled();await page.getByRole('checkbox',{name:'Select Copy first'}).check();await page.getByRole('button',{name:'Copy selected URLs'}).click();await expect(page.getByText('Copied 1 link',{exact:true})).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('https://example.com/one');await page.getByRole('checkbox',{name:'Select Copy second'}).check();await page.getByRole('button',{name:'Copy selected URLs'}).click();await expect(page.getByText('Copied 2 links',{exact:true})).toBeVisible();expect((await page.evaluate(()=>navigator.clipboard.readText())).split('\n')).toEqual(['https://example.com/one','https://example.com/two']);
});

test('page readiness responds to draft edits without publishing them',async({page})=>{
 await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();await page.getByText(/^Page readiness ·/).click();await expect(page.getByText('○ Review · Introduce your page',{exact:true})).toBeVisible();await page.getByLabel('Bio',{exact:true}).fill('Independent work and useful links.');await expect(page.getByText('✓ Ready · Introduce your page',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Publish design',exact:true})).toBeEnabled();
});

test('design history undoes and redoes draft changes',async({page})=>{
 await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();const original=await page.getByLabel('Display name',{exact:true}).inputValue();await expect(page.getByRole('button',{name:'Undo change',exact:true})).toBeDisabled();await page.getByLabel('Display name',{exact:true}).fill('Undo creator');await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.getByLabel('Display name',{exact:true})).toHaveValue(original);await page.getByRole('button',{name:'Redo change',exact:true}).click();await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Undo creator');await page.getByRole('button',{name:'Undo change',exact:true}).click();await page.getByLabel('Bio',{exact:true}).fill('A new history branch');await expect(page.getByRole('button',{name:'Redo change',exact:true})).toBeDisabled();
});

test('style backup download and confirmed restore update only the draft',async({page})=>{
 await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();await page.getByText('Style backups',{exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download style backup'}).click();const original=JSON.parse(await readFile((await (await download).path())!,'utf8'));expect(original.version).toBe(1);expect(original).not.toHaveProperty('username');const restored={...original,theme:'dark',contentBlocks:[{id:crypto.randomUUID(),type:'text',title:'Restored introduction',body:'From a local backup',url:'',afterLinkId:null}]};await page.getByLabel('Restore style backup',{exact:true}).setInputFiles({name:'style.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))});await expect(page.getByRole('dialog')).toContainText('Restore this style?');await page.getByRole('button',{name:'Restore backup',exact:true}).click();await expect(page.getByLabel('Title / image alt text',{exact:true})).toHaveValue('Restored introduction');await expect(page.getByRole('button',{name:'Publish design',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.getByLabel('Title / image alt text',{exact:true})).toHaveCount(0);
});

test('content block duplication makes an independent editable copy',async({page})=>{
 await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();await page.getByRole('button',{name:'Add content block',exact:true}).click();await page.getByLabel('Title / image alt text',{exact:true}).fill('Original block');await page.getByRole('button',{name:'Duplicate block 1',exact:true}).click();await expect(page.getByLabel('Title / image alt text',{exact:true})).toHaveCount(2);await page.getByLabel('Title / image alt text',{exact:true}).nth(1).fill('Copied block');await expect(page.getByLabel('Title / image alt text',{exact:true}).first()).toHaveValue('Original block');await page.getByRole('button',{name:'Publish design',exact:true}).click();await expect(page.getByText('Page design published',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Title / image alt text',{exact:true}).nth(1)).toHaveValue('Copied block');await page.getByRole('button',{name:'Remove block 2',exact:true}).click();await expect(page.getByLabel('Title / image alt text',{exact:true})).toHaveValue('Original block');
});

test('FAQ blocks publish as accessible expandable answers',async({page})=>{
 const {username}=await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();await page.getByRole('button',{name:'Add content block',exact:true}).click();await page.getByLabel('Block type',{exact:true}).selectOption('faq');await page.getByLabel('Question',{exact:true}).fill('Can I book a session?');await page.getByLabel('Answer',{exact:true}).fill('Yes, use my booking link.');await page.getByRole('button',{name:'Publish design',exact:true}).click();await expect(page.getByText('Page design published',{exact:true})).toBeVisible();await page.goto('/u/'+username);const faq=page.locator('details').filter({hasText:'Can I book a session?'});await expect(faq.locator('p')).not.toBeVisible();await faq.locator('summary').click();await expect(faq.locator('p')).toHaveText('Yes, use my booking link.');await faq.locator('summary').press('Enter');await expect(faq.locator('p')).not.toBeVisible();
});

test('quote blocks publish attribution and an optional source link',async({page})=>{
 const {username}=await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();await page.getByRole('button',{name:'Add content block',exact:true}).click();await page.getByLabel('Block type',{exact:true}).selectOption('quote');await page.getByLabel('Attribution',{exact:true}).fill('Alex, collaborator');await page.getByLabel('Quote',{exact:true}).fill('Clear ideas and thoughtful work.');await page.getByLabel('Source URL (optional)',{exact:true}).fill('https://example.com/review');await page.getByRole('button',{name:'Publish design',exact:true}).click();await expect(page.getByText('Page design published',{exact:true})).toBeVisible();await page.goto('/u/'+username);await expect(page.locator('blockquote')).toHaveText('Clear ideas and thoughtful work.');await expect(page.getByRole('link',{name:'Alex, collaborator',exact:true})).toHaveAttribute('href','https://example.com/review');
});

test('event blocks publish dates and download calendar entries',async({page})=>{
 const {username}=await setupCreator(page);await page.goto('/dashboard/design');await expect(page.getByLabel('Display name',{exact:true})).toBeEnabled();await page.getByRole('button',{name:'Add content block',exact:true}).click();await page.getByLabel('Block type',{exact:true}).selectOption('event');await page.getByLabel('Title / image alt text',{exact:true}).fill('Studio evening');await page.getByLabel('Event start',{exact:true}).fill('2027-01-10T18:00');await page.getByLabel('Event end (optional)',{exact:true}).fill('2027-01-10T20:00');await page.getByRole('button',{name:'Publish design',exact:true}).click();await expect(page.getByText('Page design published',{exact:true})).toBeVisible();await page.goto('/u/'+username);await expect(page.getByRole('heading',{name:'Studio evening',exact:true})).toBeVisible();await expect(page.locator('time')).toHaveCount(2);const download=page.waitForEvent('download');await page.getByRole('button',{name:'Add to calendar',exact:true}).click();const file=await download;const text=await readFile((await file.path())!,'utf8');expect(text).toContain('SUMMARY:Studio evening');expect(text).toContain('DTEND:');
});

test('public contact card downloads only public profile fields',async({page})=>{
 const {username}=await setupCreator(page);await page.goto('/u/'+username);const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save contact',exact:true}).click();const file=await download;expect(file.suggestedFilename()).toBe(username+'.vcf');const card=await readFile((await file.path())!,'utf8');expect(card).toContain('BEGIN:VCARD');expect(card).toContain('/u/'+username);expect(card).not.toContain('@example.test');
});

test('public section navigation links to visible sections without overflow',async({page})=>{
 const {username}=await setupCreator(page);const first=await api(page.request,'links.createSection',{title:'Work',splitIndex:0});const second=await api(page.request,'links.createSection',{title:'Writing',splitIndex:0});await api(page.request,'links.add',{title:'Portfolio',url:'https://example.com/work',sectionId:first.id});await api(page.request,'links.add',{title:'Essays',url:'https://example.com/writing',sectionId:second.id});await page.setViewportSize({width:390,height:844});await page.goto('/u/'+username);const nav=page.getByRole('navigation',{name:'Jump to section'});await expect(nav.getByRole('link')).toHaveCount(2);await nav.getByRole('link',{name:'Writing',exact:true}).click();await expect(page).toHaveURL(new RegExp('#section-'+second.id+'$'));await expect(page.getByRole('heading',{name:'Writing',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('visitor reading list persists, removes links, and excludes unpublished items',async({page})=>{
 const {username}=await setupCreator(page);const link=await api(page.request,'links.add',{title:'Save this essay',url:'https://example.com/essay'});await page.goto('/u/'+username);const save=page.getByRole('button',{name:'Save Save this essay for later',exact:true});await expect(save).toBeEnabled();await save.click();await expect(save).toHaveAttribute('aria-pressed','true');await page.reload();await expect(save).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Saved links · 1',exact:true}).click();await page.getByRole('button',{name:'Remove Save this essay from reading list'}).click();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await expect(save).toHaveAttribute('aria-pressed','false');await save.click();await api(page.request,'links.bulkAction',{ids:[link.id],action:'pause'});await page.reload();await expect(page.getByRole('button',{name:'Saved links · 0',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Save Save this essay for later',exact:true})).toHaveCount(0);
});

test('visitor reading list falls back visibly when browser storage is unavailable',async({page})=>{
 const {username}=await setupCreator(page);await api(page.request,'links.add',{title:'Session essay',url:'https://example.com/session'});await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}}));await page.goto('/u/'+username);await expect(page.getByRole('status').filter({hasText:'Browser storage is unavailable'})).toBeVisible();await page.getByRole('button',{name:'Save Session essay for later',exact:true}).click();await expect(page.getByRole('button',{name:'Saved links · 1',exact:true})).toBeVisible();await page.getByRole('button',{name:'Saved links · 1',exact:true}).click();await page.getByRole('button',{name:'Clear reading list',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByRole('button',{name:'Saved links · 0',exact:true})).toBeVisible();
});

test('print layout reveals all links and restores collapsed groups afterward',async({page})=>{
 const {username}=await setupCreator(page);for(let i=1;i<=7;i++)await api(page.request,'links.add',{title:'Print link '+i,url:'https://example.com/print/'+i});await page.goto('/u/'+username);await expect(page.getByRole('button',{name:'Print page',exact:true})).toBeEnabled();const finalLink=page.locator('a[data-public-link]').filter({hasText:'Print link 7'});await expect(finalLink).not.toBeVisible();await page.evaluate(()=>{window.print=()=>{window.dispatchEvent(new Event('beforeprint'));};});await page.getByRole('button',{name:'Print page',exact:true}).click();await page.emulateMedia({media:'print'});await expect(finalLink).toBeVisible();await expect(page.getByRole('button',{name:'Print page',exact:true})).not.toBeVisible();expect(await finalLink.evaluate(el=>getComputedStyle(el,'::after').content)).toContain('https://example.com/print/7');await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(finalLink).not.toBeVisible();await expect(page.getByRole('button',{name:'Print page',exact:true})).toBeVisible();
});
