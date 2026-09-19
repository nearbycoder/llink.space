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
