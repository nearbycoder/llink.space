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
