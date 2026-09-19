/** Only an explicit unavailable npm audit endpoint permits the independent fallback. */
export function registryUnavailable(result) {
 return result.status !== 0 && /^error: POST https:\/\/registry\.npmjs\.org\/-\/npm\/v1\/security\/advisories\/bulk - (502|503|504)\s*$/m.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
}
export function lockedPackages(lock) {
 if (lock?.lockfileVersion !== 1 || !lock.packages || typeof lock.packages !== 'object' || Array.isArray(lock.packages)) throw new Error('Unsupported or missing lockfile package data');
 const packages=new Map();
 for (const entry of Object.values(lock.packages)) {
  if (!Array.isArray(entry) || typeof entry[0] !== 'string') throw new Error('Malformed lockfile package');
  const match=entry[0].match(/^((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)@(\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?)$/i);
  if (!match) throw new Error(`Cannot audit non-registry dependency: ${entry[0]}`);
  packages.set(entry[0],{package:{name:match[1],ecosystem:'npm'},version:match[2]});
 }
 if (!packages.size) throw new Error('No locked packages found; refusing an empty audit');
 return [...packages.values()];
}
export async function auditWithOsv(queries, fetcher=fetch) {
 const findings=new Set();
 for(let offset=0;offset<queries.length;offset+=100) {
  let pending=queries.slice(offset,offset+100);
  let pages=0;
  while(pending.length) {
   if (++pages>100) throw new Error('OSV pagination did not finish');
   const response=await fetcher('https://api.osv.dev/v1/querybatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({queries:pending}),signal:AbortSignal.timeout(30000)});
   if(!response.ok) throw new Error(`OSV audit unavailable: HTTP ${response.status}`);
   const body=await response.json();
   if(!Array.isArray(body.results)||body.results.length!==pending.length) throw new Error('Incomplete OSV audit response');
   const next=[];
   body.results.forEach((result,index)=>{
    if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).some(key=>!['vulns','next_page_token'].includes(key))) throw new Error('Invalid OSV audit result');
    if(result.vulns!==undefined && !Array.isArray(result.vulns)) throw new Error('Invalid OSV vulnerability list');
    for(const vuln of result.vulns ?? []) {
     if(typeof vuln?.id!=='string'||!vuln.id.trim()) throw new Error('Invalid OSV vulnerability record');
     findings.add(`${pending[index].package.name}@${pending[index].version}: ${vuln.id}`);
    }
    if(result.next_page_token!==undefined && typeof result.next_page_token!=='string') throw new Error('Invalid OSV pagination token');
    if(result.next_page_token) next.push({...pending[index],page_token:result.next_page_token});
   });
   pending=next;
  }
 }
 return [...findings];
}
