import { expect, test } from '@playwright/test';
import { setupCreator } from './feature-helpers';
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
