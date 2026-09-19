import { spawnSync } from 'node:child_process';
import { JSONC } from 'bun';
import { auditWithOsv, lockedPackages, registryUnavailable } from './audit-support.mjs';

const result=spawnSync('bun',['audit'],{encoding:'utf8',timeout:90000,maxBuffer:4*1024*1024});
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if(result.status===0) process.exit(0);
if(!registryUnavailable(result)) {
 if(result.error) console.error(result.error.message);
 process.exit(result.status ?? 1);
}
console.warn('npm audit is unavailable. Checking every locked package against OSV instead; any finding or incomplete check fails.');
try {
 const packages=lockedPackages(JSONC.parse(await Bun.file('bun.lock').text()));
 const findings=await auditWithOsv(packages);
 if(findings.length) {
  console.error(findings.join('\n'));
  console.error(`${findings.length} advisory matches found by OSV.`);
  process.exitCode=1;
 } else console.log(`OSV audit complete: ${packages.length} exact package versions checked; no known vulnerabilities found.`);
} catch(error) {
 console.error('Dependency audit could not complete:',error.message);
 process.exitCode=1;
}
