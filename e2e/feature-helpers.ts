import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
export async function api(request: APIRequestContext, name: string, input: unknown) {
 const result=await request.post(`/api/trpc/${name}`,{data:{json:input}});
 expect(result.ok(),await result.text()).toBe(true); return (await result.json()).result.data.json;
}
export async function setupCreator(page: Page) {
 const username=`feature${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
 expect((await page.request.post('/api/auth/sign-up/email',{data:{name:'Feature Creator',email:`${username}@example.test`,password:'FeaturePassword123!'}})).ok()).toBe(true);
 const profile=await api(page.request,'profile.create',{username});
 return {profile,username};
}

/** Pick an option from the app's custom Select by value, or by visible label. */
export async function chooseOption(trigger: Locator, option: string | { label: string }) {
 await expect(trigger).toBeEnabled();
 await trigger.click();
 const listbox = trigger.page().getByRole('listbox');
 const item = typeof option === 'string'
  ? listbox.locator(`[role="option"][data-value="${option}"]`)
  : listbox.getByRole('option', { name: option.label, exact: true });
 await item.click();
 await expect(listbox).toHaveCount(0);
}
