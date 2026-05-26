import { describe, it, expect } from 'vitest'
import { interpolatePlaybook } from '../src/commands/playbooks.js'

describe('interpolatePlaybook', () => {
  it('replaces {linesOfCode} in ghost playbook', () => {
    const actions = interpolatePlaybook('ghost', { linesOfCode: 420, authors: ['alice'], deadExports: 3, fanIn: 0 })
    expect(actions[1]).toContain('420')
  })

  it('replaces {deadExports} in ghost playbook', () => {
    const actions = interpolatePlaybook('ghost', { linesOfCode: 100, authors: ['alice'], deadExports: 5, fanIn: 0 })
    expect(actions[2]).toContain('5')
  })

  it('replaces {authors} in time-bomb playbook', () => {
    const actions = interpolatePlaybook('time-bomb', { linesOfCode: 100, authors: ['bob', 'carol'], deadExports: 0, fanIn: 0 })
    expect(actions[1]).toContain('bob')
  })

  it('replaces {fanIn} in load-bearing-wall playbook', () => {
    const actions = interpolatePlaybook('load-bearing-wall', { linesOfCode: 100, authors: [], deadExports: 0, fanIn: 7 })
    expect(actions[1]).toContain('7')
  })

  it('returns empty array for healthy archetype', () => {
    const actions = interpolatePlaybook('healthy', { linesOfCode: 50, authors: [], deadExports: 0, fanIn: 0 })
    expect(actions).toEqual([])
  })
})
