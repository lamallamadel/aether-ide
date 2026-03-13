import { describe, expect, it, vi } from 'vitest'

vi.unmock('./perfMonitor')

describe('perfMonitor', () => {
  it('starts and stops without crashing', async () => {
    const { startPerfMonitor } = await import('./perfMonitor')
    vi.useFakeTimers()

    const raf = window.requestAnimationFrame
    const caf = window.cancelAnimationFrame

    let rafCb: FrameRequestCallback | null = null
    ;(window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafCb = cb
      return 1
    }
    ;(window as any).cancelAnimationFrame = () => {}

    const updates: any[] = []
    const stop = startPerfMonitor((m) => updates.push(m))

    rafCb?.(performance.now() + 20)
    vi.advanceTimersByTime(1100)
    stop()

    expect(updates.length).toBeGreaterThan(0)

    window.requestAnimationFrame = raf
    window.cancelAnimationFrame = caf
    vi.useRealTimers()
  })
})

