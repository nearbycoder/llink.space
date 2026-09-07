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
