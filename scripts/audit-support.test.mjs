import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditWithOsv, lockedPackages, registryUnavailable } from './audit-support.mjs';
const query={package:{name:'example',ecosystem:'npm'},version:'1.0.0'};
const response=results=>({ok:true,json:async()=>({results})});
test('fallback requires a recognized npm outage, never an advisory failure',()=>{
 assert.equal(registryUnavailable({status:1,stderr:'error: POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk - 503\n'}),true);
 assert.equal(registryUnavailable({status:1,stdout:'1 high vulnerability'}),false);
 assert.equal(registryUnavailable({status:1,stderr:'unrecognized failure'}),false);
 assert.equal(registryUnavailable({status:0}),false);
});
test('audits resolved aliases and nested versions, rejecting unknown dependency types',()=>{
 assert.deepEqual(lockedPackages({lockfileVersion:1,packages:{alias:['example@1.0.0'],nested:['example@2.0.0'],duplicate:['example@1.0.0']}}).map(q=>q.version),['1.0.0','2.0.0']);
 for(const lock of [{},{lockfileVersion:1,packages:{}},{lockfileVersion:1,packages:{git:['github:org/repo#hash']}}]) assert.throws(()=>lockedPackages(lock));
});
test('follows pagination and reports vulnerable versions',async()=>{
 let calls=0;
 const findings=await auditWithOsv([query],async(_,options)=>{
  calls++; const body=JSON.parse(options.body);
  if(calls===1)return response([{next_page_token:'page2'}]);
  assert.equal(body.queries[0].page_token,'page2');
  return response([{vulns:[{id:'GHSA-test'}]}]);
 });
 assert.deepEqual(findings,['example@1.0.0: GHSA-test']); assert.equal(calls,2);
});
test('fails closed on errors and partial or malformed results',async()=>{
 for(const result of [{ok:false,status:503},response([]),response([{error:'bad'}]),response([{vulns:{}}]),response([{vulns:[{}]}])]) await assert.rejects(()=>auditWithOsv([query],async()=>result));
 await assert.rejects(()=>auditWithOsv([query],async()=>{throw new Error('offline');}));
 assert.deepEqual(await auditWithOsv([query],async()=>response([{}])),[]);
});
