import { expect, type APIRequestContext, type Page } from '@playwright/test';
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
