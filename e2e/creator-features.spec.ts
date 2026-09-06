import { expect, test, type APIRequestContext } from '@playwright/test';
async function write(api: APIRequestContext, name: string, input: unknown) {
 const res=await api.post(`/api/trpc/${name}`,{data:{json:input}});
 expect(res.ok(),await res.text()).toBe(true); return (await res.json()).result.data.json;
}
async function read(api: APIRequestContext,name:string,input?:unknown) {
 const res=await api.get(`/api/trpc/${name}`,{params:input===undefined?{}:{input:JSON.stringify({json:input})}});
 expect(res.ok(),await res.text()).toBe(true);return (await res.json()).result.data.json;
}
async function creator(api:APIRequestContext) {
 const username=`new${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
 expect((await api.post('/api/auth/sign-up/email',{data:{name:'New Creator',email:`${username}@example.test`,password:'CreatorFeatures123!'}})).ok()).toBe(true);
 return write(api,'profile.create',{username});
}
test('publishing windows, featured uniqueness and ownership are enforced',async({request,playwright,baseURL})=>{
 const profile=await creator(request);
 const past=new Date(Date.now()-60000).toISOString(), future=new Date(Date.now()+60000).toISOString();
 const live=await write(request,'links.add',{title:'Live spotlight',url:'https://example.com/live',featured:true,publishAt:past,expireAt:future,ctaLabel:'Discover'});
 const scheduled=await write(request,'links.add',{title:'Future',url:'https://example.com/future',publishAt:future});
 await write(request,'links.add',{title:'Expired',url:'https://example.com/expired',expireAt:past});
 let published=await read(request,'links.getPublic',{username:profile.username});
 expect(published.links.map((l:{id:string})=>l.id)).toEqual([live.id]);
 await write(request,'links.update',{id:scheduled.id,featured:true});
 expect((await read(request,'links.list')).links.filter((l:{featured:boolean})=>l.featured).map((l:{id:string})=>l.id)).toEqual([scheduled.id]);
 const bad=await request.post('/api/trpc/links.update',{data:{json:{id:live.id,expireAt:new Date(Date.now()-120000).toISOString()}}});
 expect(bad.status()).toBe(400);
 await write(request,'analytics.recordClick',{profileId:profile.id,linkId:scheduled.id});
 expect((await read(request,'analytics.getSummary',{days:7})).totalClicks).toBe(0);
 const other=await playwright.request.newContext({baseURL});
 try {await creator(other);expect((await other.post('/api/trpc/links.update',{data:{json:{id:live.id,featured:true}}})).status()).toBe(404);}finally{await other.dispose();}
 await write(request,'links.update',{id:scheduled.id,publishAt:null});
 published=await read(request,'links.getPublic',{username:profile.username});
 expect(published.links).toHaveLength(2);
});
