import { StatusBadge } from './StatusBadge'

export interface TribunalReceiptProps {
  runId: string
  timestamp: string
  commitHash: string
  modelsConsensus: Array<{ model: string; claim: string }>
}

/** Presentation of a supplied receipt, not a signature or biological validator. */
export function TribunalReceipt({ runId, timestamp, commitHash, modelsConsensus }: TribunalReceiptProps) {
  return (
    <div className="panel tribunal-receipt">
      <div className="panel-heading">
        <h2>Execution Receipt</h2>
        <StatusBadge status="needs_validation" />
      </div>
      <p>Receipt metadata supplied by the caller. This display does not verify signatures, execution or biological claims. Model agreement is not experimental validation.</p>
      <dl className="fact-grid">
        <div><dt>Run ID</dt><dd>{runId}</dd></div>
        <div><dt>Timestamp</dt><dd><time dateTime={timestamp}>{timestamp}</time></dd></div>
      </dl>
      {modelsConsensus.length > 0 ? (
        <dl className="view-stack">
          {modelsConsensus.map((entry, index) => (
            <div className="fact-row" key={`${entry.model}-${index}`}>
              <dt>{entry.model}</dt><dd>{entry.claim}</dd>
            </div>
          ))}
        </dl>
      ) : <p>No model consensus supplied.</p>}
      <div className="merge-line">
        <span>Source commit</span>
        <code>{commitHash}</code>
      </div>
    </div>
  )
}
