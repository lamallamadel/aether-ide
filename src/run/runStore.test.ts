import { beforeEach, describe, expect, it } from 'vitest'
import { useRunStore } from './runStore'
import type { RunInstance } from './types'

function makeInstance(overrides: Partial<RunInstance> = {}): RunInstance {
  return {
    id: 'inst-1',
    configId: 'cfg-1',
    configName: 'Test Config',
    state: 'running',
    startedAt: new Date().toISOString(),
    outputLines: [],
    ...overrides,
  }
}

beforeEach(() => {
  useRunStore.setState({
    configurations: [],
    instances: {},
    selectedConfigId: null,
    bottomTabs: [{ id: 'tab-terminal', kind: 'terminal', label: 'Terminal', terminalSessionId: 0 }],
    activeBottomTabId: 'tab-terminal',
    bottomPanelOpen: false,
    bottomPanelHeight: 220,
    configsLoaded: false,
  })
})

describe('runStore', () => {
  describe('config CRUD', () => {
    it('addConfig ajoute une configuration', () => {
      useRunStore.getState().addConfig({ id: 'c1', name: 'Dev', type: 'npm', npmScript: 'dev' })
      expect(useRunStore.getState().configurations).toHaveLength(1)
      expect(useRunStore.getState().configurations[0].name).toBe('Dev')
    })

    it('updateConfig modifie une configuration existante', () => {
      useRunStore.getState().addConfig({ id: 'c1', name: 'Dev', type: 'npm', npmScript: 'dev' })
      useRunStore.getState().updateConfig('c1', { name: 'Build' })
      expect(useRunStore.getState().configurations[0].name).toBe('Build')
    })

    it('removeConfig supprime et désélectionne', () => {
      useRunStore.getState().addConfig({ id: 'c1', name: 'Dev', type: 'npm' })
      useRunStore.getState().setSelectedConfigId('c1')
      useRunStore.getState().removeConfig('c1')
      expect(useRunStore.getState().configurations).toHaveLength(0)
      expect(useRunStore.getState().selectedConfigId).toBeNull()
    })
  })

  describe('instances', () => {
    it('addInstance ajoute une instance', () => {
      const inst = makeInstance()
      useRunStore.getState().addInstance(inst)
      expect(useRunStore.getState().instances['inst-1']).toBeDefined()
    })

    it('updateInstance met à jour partiellement', () => {
      useRunStore.getState().addInstance(makeInstance())
      useRunStore.getState().updateInstance('inst-1', { state: 'stopped', exitCode: 0 })
      expect(useRunStore.getState().instances['inst-1'].state).toBe('stopped')
      expect(useRunStore.getState().instances['inst-1'].exitCode).toBe(0)
    })

    it('appendOutput ajoute des lignes', () => {
      useRunStore.getState().addInstance(makeInstance())
      useRunStore.getState().appendOutput('inst-1', 'hello\r\n')
      useRunStore.getState().appendOutput('inst-1', 'world\r\n')
      expect(useRunStore.getState().instances['inst-1'].outputLines).toHaveLength(2)
    })

    it('removeInstance supprime', () => {
      useRunStore.getState().addInstance(makeInstance())
      useRunStore.getState().removeInstance('inst-1')
      expect(useRunStore.getState().instances['inst-1']).toBeUndefined()
    })
  })

  describe('bottom panel', () => {
    it('openBottomPanel/closeBottomPanel', () => {
      useRunStore.getState().openBottomPanel()
      expect(useRunStore.getState().bottomPanelOpen).toBe(true)
      useRunStore.getState().closeBottomPanel()
      expect(useRunStore.getState().bottomPanelOpen).toBe(false)
    })

    it('toggleBottomPanel inverse l\'état', () => {
      useRunStore.getState().toggleBottomPanel()
      expect(useRunStore.getState().bottomPanelOpen).toBe(true)
      useRunStore.getState().toggleBottomPanel()
      expect(useRunStore.getState().bottomPanelOpen).toBe(false)
    })

    it('setBottomPanelHeight clamp entre 100 et 600', () => {
      useRunStore.getState().setBottomPanelHeight(50)
      expect(useRunStore.getState().bottomPanelHeight).toBe(100)
      useRunStore.getState().setBottomPanelHeight(1000)
      expect(useRunStore.getState().bottomPanelHeight).toBe(600)
      useRunStore.getState().setBottomPanelHeight(300)
      expect(useRunStore.getState().bottomPanelHeight).toBe(300)
    })

    it('addBottomTab ajoute et active un onglet', () => {
      useRunStore.getState().addBottomTab({ id: 'tab-run-1', kind: 'run', label: 'Dev', instanceId: 'inst-1' })
      expect(useRunStore.getState().bottomTabs).toHaveLength(2)
      expect(useRunStore.getState().activeBottomTabId).toBe('tab-run-1')
    })

    it('removeBottomTab supprime et passe à l\'onglet précédent', () => {
      useRunStore.getState().addBottomTab({ id: 'tab-run-1', kind: 'run', label: 'Dev', instanceId: 'inst-1' })
      useRunStore.getState().removeBottomTab('tab-run-1')
      expect(useRunStore.getState().bottomTabs).toHaveLength(1)
      expect(useRunStore.getState().activeBottomTabId).toBe('tab-terminal')
    })

    it('ensureTerminalTab met à jour sessionId', () => {
      useRunStore.getState().ensureTerminalTab(5)
      const tab = useRunStore.getState().bottomTabs.find((t) => t.id === 'tab-terminal')
      expect(tab?.terminalSessionId).toBe(5)
      expect(useRunStore.getState().bottomPanelOpen).toBe(true)
    })

    it('ensureRunTab crée un onglet run et l\'active', () => {
      const inst = makeInstance({ id: 'inst-run-42' })
      useRunStore.getState().ensureRunTab(inst)
      const runTab = useRunStore.getState().bottomTabs.find((t) => t.id === 'tab-run-inst-run-42')
      expect(runTab).toBeDefined()
      expect(useRunStore.getState().activeBottomTabId).toBe('tab-run-inst-run-42')
    })
  })
})
