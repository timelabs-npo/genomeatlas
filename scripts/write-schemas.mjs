// Portable shape contracts. Runtime adds byte bounds, markup rejection and uniqueness checks.
import {mkdir,writeFile} from 'node:fs/promises';
import {DIMENSIONS,STATES} from '../docs/core.mjs';
await mkdir('docs/schemas',{recursive:true});
const string={type:'string',minLength:1,maxLength:1200};
const id={type:'string',pattern:'^[a-z][a-z0-9-]*$',maxLength:80};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const state={enum:STATES};
const registry=object({id,name:{...string,maxLength:100},purpose:string,states:object(Object.fromEntries(DIMENSIONS.map(k=>[k,state]))),evidenceIds:{type:'array',maxItems:20,uniqueItems:true,items:id},notes:string});
const probes=object({id,toolId:id,observedAt:{type:'string',format:'date-time',pattern:'Z$'},dimension:{enum:DIMENSIONS},state,summary:string});
for(const [kind,row] of [['registry',registry],['probes',probes]])await writeFile(`docs/schemas/${kind}.schema.json`,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',title:`GenomeAtlas ${kind} v1`,description:'Shape only; validated imports remain untrusted. Runtime also rejects unsafe text, duplicate IDs and oversized UTF-8 documents.',...object({schemaVersion:{const:1},kind:{const:kind},records:{type:'array',minItems:1,maxItems:100,items:row}})},null,2)+'\n');
const hash={type:'string',pattern:'^[a-f0-9]{64}$'};
const files={type:'array',minItems:1,items:object({path:{type:'string',pattern:'^(?!/|[A-Za-z]:|.*(?:^|/)\\.\\.(?:/|$))[^\\\\]+$'},sha256:hash})};
const receipt=object({schemaVersion:{const:1},kind:{const:'execution-receipt'},jobRequestSha256:hash,inputHashes:files,outputHashes:files,toolVersions:{type:'array',minItems:1,items:object({tool:string,version:string})},startedAt:{type:'string',format:'date-time'},endedAt:{type:'string',format:'date-time'},exitCode:{type:'integer'},testGateResult:{enum:['passed','failed','not-tested']},reviewer:string,evidenceIds:{type:'array',minItems:1,uniqueItems:true,items:id},verificationStatus:{const:'requires-independent-review'}});
await writeFile('docs/schemas/receipt.schema.json',JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',title:'GenomeAtlas execution receipt requirements',description:'A valid receipt shape is not certification. Verify hashes, timestamps, tool versions and evidence independently.',...receipt},null,2)+'\n');
