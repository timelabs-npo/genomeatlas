const t=require("node:test"),a=require("node:assert/strict"),C=require("../docs/contracts.js");
t("complete computational is not experimental",()=>{a.equal(C.scientificState({job_status:"PASSED",call:"C",complete_cassette:true,exact_strain_evidence:true,evidence_reference:"model-output"}),"C");a.equal(C.scientificState({job_status:"PASSED",call:"C"}),"U")});
t("missing never becomes zero",()=>{a.equal(C.scientificState({call:"0"}),"NA");a.equal(C.scientificState({job_status:"FAILED",call:"0"}),"FAILED")});
