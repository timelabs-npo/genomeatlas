import { useState } from 'react'
import { ArrowUpRight, Check, Download, FileCheck2, GitBranch, ShieldCheck } from 'lucide-react'
import { checkEvidenceFile, pilotProofSummary, publishedEvidence, type FileCheck } from '../lib/evidenceLibrary'
import './evidenceLibrary.css'

export function EvidenceLibrary() {
  const [checks, setChecks] = useState<FileCheck[]>([])
  const [checking, setChecking] = useState(false)
  const verify = async () => {
    setChecking(true)
    setChecks([])
    const results = await Promise.all(publishedEvidence.files.map(checkEvidenceFile))
    setChecks(results)
    setChecking(false)
  }
  const matches = checks.filter((check) => check.state === 'match').length
  return (
    <section className="evidence-library" aria-labelledby="evidence-heading">
      <div className="el-heading">
        <span className="el-eyebrow"><ShieldCheck size={16} /> Evidence library</span>
        <h1 id="evidence-heading">Follow the proof.</h1>
        <p>Real inputs, recorded execution, downloadable results. Every conclusion has a boundary.</p>
      </div>
      <article className="el-pilot">
        <div className="el-pilot-top"><span className="el-state"><Check size={15} /> Recorded run succeeded</span><span>11 September 2026</span></div>
        <h2>{pilotProofSummary.title}</h2>
        <p>GToTree 1.8.17 recovered conserved protein markers from three NCBI proteomes. The original outputs are preserved here, including the complete 1,241-file archive.</p>
        <dl className="el-metrics">
          <div><dt>Versioned genomes</dt><dd>3</dd></div>
          <div><dt>Marker alignments</dt><dd>118</dd></div>
          <div><dt>Protein mappings</dt><dd>350</dd></div>
          <div><dt>Ambiguous mappings</dt><dd>0</dd></div>
        </dl>
        <div className="el-tree" aria-label="Three tip unrooted tree; branch lengths in the downloadable Newick file">
          <GitBranch size={32} aria-hidden="true" />
          <div><code>GCF_000468955.1</code><code>GCF_002970915.1</code><code>GCF_903886475.1</code></div>
          <span>Three-tip pilot<br />No nontrivial unrooted split</span>
        </div>
        <p className="el-boundary">This pilot demonstrates execution and traceable protein identity. It is not a supported study-wide phylogeny or publication approval. R-M detection was not run; host restriction activity and transformation outcomes remain unassessed.</p>
        <details><summary>What was independently checked?</summary><p>All 1,240 SHA-256 entries in the original artifact manifest matched. Each of the 350 marker sequences matched its source protein. The concatenated alignment contains 22,595 marker columns and 585 expected X separator columns. All 118 partitions matched their source alignments in every taxon. Original HMM score tables were not retained by GToTree; the mapping uses exact sequence identity.</p></details>
        <div className="el-actions">
          <a href="/evidence/stage3-live-artifact.zip" download><Download size={16} /> Download full evidence · 1.95 MB</a>
          <a href={publishedEvidence.runUrl} target="_blank" rel="noreferrer">Open original run <ArrowUpRight size={16} /></a>
        </div>
        <p className="el-source">Source commit <a href={`https://github.com/serg-alexv/genomeops-atlas/commit/${publishedEvidence.sourceCommit}`} target="_blank" rel="noreferrer"><code>{publishedEvidence.sourceCommit}</code></a></p>
      </article>
      <div className="el-file-heading"><div><h2>Inspect the artifacts</h2><p>Check the downloaded bytes against the recorded SHA-256 values.</p></div><button type="button" onClick={verify} disabled={checking}><FileCheck2 size={17} /> {checking ? 'Checking files…' : 'Verify published files'}</button></div>
      <div role="status" aria-live="polite" className="el-check-status">{checking ? 'Fetching and hashing all 13 published files in this browser…' : checks.length ? `${matches} of ${checks.length} files match. ${matches === checks.length ? 'Published bytes are unchanged relative to this manifest.' : 'Inspect the mismatched or unavailable files below.'}` : 'No browser integrity check has been run yet.'}</div>
      <p className="el-integrity-note">Hashes detect changed bytes. They do not authenticate a signer or establish biological truth. The recorded verification was performed on 11 September 2026; this button checks the files served now.</p>
      <ul className="el-files">{publishedEvidence.files.map((file) => {
        const check = checks.find((result) => result.name === file.name)
        return <li key={file.name}><div><a href={file.url} download>{file.name} <Download size={13} /></a><span>{file.bytes.toLocaleString()} bytes{check ? ` · ${check.state === 'match' ? 'SHA-256 matches' : check.state}` : ''}</span></div><details><summary>SHA-256</summary><code>{file.sha256}</code>{check && check.state !== 'match' ? <p role="alert">{check.detail}</p> : null}</details></li>
      })}</ul>
      <p className="el-footer">A future analysis belongs here only after real execution, input and version capture, file integrity checks, and review of the specific claim. A task prompt or model agreement alone is not evidence.</p>
    </section>
  )
}
