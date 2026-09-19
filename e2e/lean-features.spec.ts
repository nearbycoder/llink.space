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
