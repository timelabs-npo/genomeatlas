(async()=>{
  const $=id=>document.getElementById(id);
  const check=(v,m)=>{if(!v)throw Error(m)};
  try{
    check(document.documentElement.dataset.atlasReady==='true','startup');
    check($('accession-list').children.length===177,'accessions');
    $('tool-search').value='no-such-tool-xyz';$('tool-search').dispatchEvent(new Event('input'));check($('tool-list').children.length===0&&!$('tool-empty').hidden,'filter');
    $('clear-filters').click();check($('tool-list').children.length===window.ATLAS_DATA.tools.length,'clear');
    document.querySelectorAll('[data-stage]')[1].click();check(document.querySelectorAll('[aria-pressed="true"]').length===1,'flow');
    $('endpoint').value='workspace';$('reviewer').value='reviewer';$('request-form').dispatchEvent(new Event('submit',{cancelable:true}));check(!$('export-request').disabled&&JSON.parse($('request-json').textContent).execution==='NOT_EXECUTED','consent');
    const r={schema_version:1,kind:'RUN_RECEIPT',job:'panel-audit',claimed_status:'PASSED',summary:'<img src=x onerror=alert(1)>',evidence_reference:'javascript:alert(1)'};
    const dt=new DataTransfer();dt.items.add(new File([JSON.stringify(r)],'receipt.json',{type:'application/json'}));$('import-receipt').files=dt.files;$('import-receipt').dispatchEvent(new Event('change'));
    await new Promise(resolve=>setTimeout(resolve,250));
    check($('receipt-preview').textContent.includes('UNTRUSTED_IMPORT')&&!$('receipt-preview').querySelector('img'),'literal receipt');
    check(JSON.parse($('request-json').textContent).execution==='NOT_EXECUTED','receipt isolation');
    document.documentElement.dataset.smoke='PASSED';
  }catch(e){document.documentElement.dataset.smoke='FAILED: '+e.message}
})();
