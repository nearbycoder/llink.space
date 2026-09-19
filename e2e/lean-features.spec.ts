import { expect, test } from "@playwright/test";
import { setupCreator } from "./feature-helpers";

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
