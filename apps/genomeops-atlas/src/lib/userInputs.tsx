import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import frozenAccessions from '../data/genomeatlas/selected_accessions.txt?raw'
import { toolCatalog, validateGenomeAccessions } from './workbench'
import { dispatcherDemoAccessions } from './workflowDispatcher'

export interface UserInputs {
  accessionsText: string
  sequenceText: string
  contextText: string
  selectedToolIds: string[]
  topology: 'circular' | 'linear'
}

export const frozenGenomeAccessions = frozenAccessions.trim().split(/\s+/)
export const publishedPilotAccessions: readonly string[] = [...dispatcherDemoAccessions]
export const sequenceFileLimit = 5 * 1024 * 1024
const knownToolIds = new Set(toolCatalog.map(tool => tool.id))
const createEmptyInputs = (): UserInputs => ({ accessionsText: '', sequenceText: '', contextText: '', selectedToolIds: [], topology: 'circular' })

export function inspectGenomeSelection(text: string) {
  const accessions = text.trim().split(/[\s,]+/).filter(Boolean)
  if (!accessions.length) return { accessions, valid: false, error: '', hint: 'Choose one to three genomes for a task. Your selection starts empty.' }
  try {
    validateGenomeAccessions(accessions)
    return { accessions, valid: true, error: '', hint: `${accessions.length} exact ${accessions.length === 1 ? 'accession' : 'accessions'} in the frozen panel. Sequence files still need to be supplied in the destination.` }
  } catch (error) {
    return { accessions, valid: false, error: error instanceof Error ? error.message : 'Check the genome selection.', hint: '' }
  }
}

/** Reads local bytes as text only; FASTA interpretation belongs to the scientific parser. */
export async function readLocalSequenceFile(file: File): Promise<string> {
  if (file.size > sequenceFileLimit) throw new Error('Choose a text sequence file no larger than 5 MiB.')
  const text = await file.text()
  if (text.includes('\0')) throw new Error('This appears to be a binary file. Choose plain text or a FASTA file.')
  return text
}

function useInputState() {
  const [inputs, setInputs] = useState<UserInputs>(createEmptyInputs)
  const setInput = useCallback(<K extends keyof UserInputs,>(key: K, value: UserInputs[K]) => {
    setInputs(current => ({ ...current, [key]: key === 'selectedToolIds'
      ? [...new Set(value as string[])].filter(id => knownToolIds.has(id))
      : value }))
  }, [])
  const toggleTool = useCallback((id: string) => {
    if (!knownToolIds.has(id)) return
    setInputs(current => ({ ...current, selectedToolIds: current.selectedToolIds.includes(id)
      ? current.selectedToolIds.filter(selected => selected !== id)
      : [...current.selectedToolIds, id] }))
  }, [])
  const resetInputs = useCallback(() => setInputs(createEmptyInputs()), [])
  return useMemo(() => ({ inputs, setInput, toggleTool, resetInputs }), [inputs, setInput, toggleTool, resetInputs])
}

const UserInputsContext = createContext<ReturnType<typeof useInputState> | null>(null)

/** Page-memory state only: no storage, network transfer or automatic genomic persistence. */
export function UserInputsProvider({ children }: { children: ReactNode }) {
  const value = useInputState()
  return <UserInputsContext.Provider value={value}>{children}</UserInputsContext.Provider>
}

/** Standalone views and tests have isolated, nonpersistent input state. */
export function useUserInputs() {
  const shared = useContext(UserInputsContext)
  const fallback = useInputState()
  return shared ?? fallback
}
