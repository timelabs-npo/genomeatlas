import { describe, expect, it } from 'vitest'
import { starterTasks } from './workbench'
import { buildTaskTemplate, taskInputReport, workspaceRecipes } from './taskWorkspace'

describe('task-specific preparation', () => {
  it('provides a distinct working template for every frozen chain without invented findings', () => {
    expect(new Set(Object.values(workspaceRecipes).map(recipe => recipe.template)).size).toBe(8)
    for (const task of starterTasks) {
      const template = buildTaskTemplate(task, 'GCF_000468955.1')
      expect(template.text).toContain('GCF_000468955.1')
      expect(template.text).toContain('NOT_REVIEWED')
    }
  })
  it('keeps missing inputs and unrun analysis distinct from a valid accession selection', () => {
    const report = taskInputReport(starterTasks.find(task => task.chainId === 'rm')!, 'GCF_000468955.1', [])
    expect(report.selection.state).toBe('PASS')
    expect(report.prerequisites.every(item => item.state === 'NOT_SUPPLIED')).toBe(true)
    expect(report.fileStructure).toBe('NOT_TESTED')
    expect(report.execution).toBe('NOT_RUN')
    expect(report.scientificAcceptance).toBe('NOT_ASSESSED')
  })
  it('blocks template and preparation for empty or invalid scope', () => {
    expect(() => buildTaskTemplate(starterTasks[0], '')).toThrow()
    expect(() => taskInputReport(starterTasks[0], 'GCF_999999999.1', [])).toThrow()
  })
})
