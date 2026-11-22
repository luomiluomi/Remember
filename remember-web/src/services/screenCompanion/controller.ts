/** Ephemeral screen observations must never enter role memory as user facts. */
export type CompanionMode = 'companion' | 'quiet' | 'paused'
export type ScreenBinding = { roleId: string; sessionId: string }
export type Observation = { capturedAt: number; description: string }
export interface CompanionDependencies {
  observe(signal: AbortSignal): Promise<Observation>
  respond(binding: ScreenBinding, observation: Observation, signal: AbortSignal): Promise<void>
  random?: () => number
  onError?: (error: unknown) => void
}

/** One-shot scheduling avoids catch-up bursts after sleep or background suspension. */
export class ScreenCompanion {
  private timer: ReturnType<typeof setTimeout> | undefined
  private controller: AbortController | undefined
  private mode: CompanionMode = 'paused'
  private binding: ScreenBinding | undefined
  private interval = 180000
  private generation = 0

  constructor(private dependencies: CompanionDependencies) {}

  start(binding: ScreenBinding, intervalSeconds = 180) {
    if (!binding.roleId || !binding.sessionId) { throw new Error('请选择角色与对话') }
    if (!Number.isFinite(intervalSeconds) || intervalSeconds < 30 || intervalSeconds > 3600) {
      throw new Error('观察间隔须为 30–3600 秒')
    }
    this.stop()
    this.binding = { ...binding }
    this.interval = intervalSeconds * 1000
    this.mode = 'companion'
    this.schedule()
  }

  setMode(mode: CompanionMode) {
    this.cancel()
    this.mode = mode
    if (mode === 'companion') { this.schedule() }
  }

  stop() {
    this.cancel()
    this.mode = 'paused'
    this.binding = undefined
  }

  private cancel() {
    this.generation++
    clearTimeout(this.timer)
    this.timer = undefined
    this.controller?.abort()
    this.controller = undefined
  }

  private schedule() {
    if (this.mode !== 'companion' || !this.binding) { return }
    const random = Math.min(1, Math.max(0, (this.dependencies.random ?? Math.random)()))
    const delay = this.interval * (0.9 + random * 0.2)
    this.timer = setTimeout(() => {
      void this.look().catch((error: unknown) => this.dependencies.onError?.(error))
    }, delay)
  }

  /** Quiet mode allows an explicit tool request; paused mode forbids all capture. */
  async look() {
    if (this.mode === 'paused' || !this.binding) { throw new Error('屏幕观察已暂停') }
    if (this.controller) { return } // at most one capture/request at a time
    clearTimeout(this.timer)
    const generation = this.generation
    const binding = { ...this.binding }
    const controller = new AbortController()
    this.controller = controller
    try {
      const observation = await this.dependencies.observe(controller.signal)
      if (controller.signal.aborted || generation !== this.generation) { return }
      await this.dependencies.respond(binding, observation, controller.signal)
    } finally {
      if (generation === this.generation) {
        this.controller = undefined
        this.schedule()
      }
    }
  }
}
