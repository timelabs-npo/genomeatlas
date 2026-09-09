const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../docs/contracts.js');
// Synthetic validator fixtures only; these are not biological observations.
const computational = () => ({job_status:'PASSED',call:'C',complete_cassette:true,exact_genome_evidence:true,model_call_reference:'synthetic-validator-fixture'});
const assessment = () => ({job_status:'PASSED',call:'0',assessment_complete:true,exact_strain_evidence:true,evidence_reference:'synthetic-validator-fixture'});
test('complete successful exact-genome model call is C without functional validation', () => {
  assert.equal(C.scientificState(computational()), 'C');
  assert.equal(C.scientificState({...computational(),functional_proof:false}), 'C');
});
test('C requires every computational evidence field', () => {
  for (const field of ['complete_cassette','exact_genome_evidence','model_call_reference']) {
    const r = computational(); delete r[field]; assert.equal(C.scientificState(r),'U');
  }
  for (const reference of [null, false, {}, [], '', '   ']) assert.equal(C.scientificState({...computational(),model_call_reference:reference}),'U');
  assert.equal(C.scientificState({...computational(),complete_cassette:'true'}),'U');
  assert.equal(C.scientificState({...computational(),exact_genome_evidence:'true'}),'U');
});
test('cassette and model evidence do not promote U or P', () => {
  for (const call of ['U','P']) assert.equal(C.scientificState({...computational(),call}),'U');
});
test('legacy ABSENT normalizes to NOT_DETECTED only after documented assessment', () => {
  for (const call of ['0','ABSENT']) {
    assert.equal(C.scientificState({...assessment(),call}),'0');
    for (const field of ['assessment_complete','exact_strain_evidence','evidence_reference']) {
      const r = {...assessment(),call}; delete r[field]; assert.equal(C.scientificState(r),'NA');
    }
    for (const reference of [null, false, {}, [], '', '   ']) assert.equal(C.scientificState({...assessment(),call,evidence_reference:reference}),'NA');
  }
});
test('failed and incomplete assessments override all supplied scientific calls', () => {
  for (const call of ['C','0','ABSENT','U','P']) {
    const r = {...computational(),...assessment(),call,curated:true};
    assert.equal(C.scientificState({...r,job_status:'FAILED'}),'FAILED');
    for (const job_status of [undefined,'UNKNOWN','NOT_RUN','NOT_TESTED','BLOCKED','PASSED ']) assert.equal(C.scientificState({...r,job_status}),'NA');
  }
});
