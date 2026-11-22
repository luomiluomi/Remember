import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useChatStore, appendScreenCompanionMessage } from '../../services/chat/store.js'
import { companionPrompt, categories, getRole, roleAvatarSrc } from '../../services/chat/companion.js'
import { getVisibleMessages } from '../../services/chat/branches.js'
import { useSettings } from '../../services/settings.js'
import { Button } from '../base/Button.js'
import { showToast } from '../base/toastState.js'

type ScreenEvent = { id: string; sessionId: string; role: 'user' | 'assistant'; text: string; createdAt: number }
type Bridge = { start(config: string): void; stop(): void; pending(): string; acknowledge(id: string): void }
const bridge = () => (window as unknown as { MemoryScreen?: Bridge }).MemoryScreen

// The activity resumes its original store, then drains text from the native companion.
let draining = false
setInterval(() => {
  void (async () => {
  const native = bridge()
  if (!native || !useChatStore.getState().ready || draining) { return }
  draining = true
  try {
    const events = JSON.parse(native.pending()) as ScreenEvent[]
    for (const event of events) {
      if (await appendScreenCompanionMessage(event)) { native.acknowledge(event.id) }
    }
  } catch { /* Retry while the native service is updating its queue. */ }
  finally { draining = false }
  })()
}, 2000)

export const useScreenPreferences = create<{ enabled: boolean; interval: number }>()(
  persist(() => ({ enabled: false as boolean, interval: 180 }), { name: 'memory-screen-preferences-v1', version: 1,
    migrate: () => ({ enabled: false, interval: 180 }),
  })
)

export const ScreenCompanionLaunch = () => {
  const enabled = useScreenPreferences((state) => state.enabled)
  const activeId = useChatStore((state) => state.activeId)
  if (!enabled || !activeId) { return null }
  return <button type="button" className="remember-read" aria-label="开启屏幕陪伴"
    title="开启屏幕陪伴" onClick={() => void startScreenCompanion()}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="13" rx="3" /><path d="M9 21h6m-3-4v4M8 10h.01M16 10h.01M9 13q3 2 6 0" />
    </svg>
  </button>
}

export const startScreenCompanion = async () => {
    const state = useChatStore.getState()
    const session = state.activeId ? state.sessionCache[state.activeId] : undefined
    const role = getRole(session?.roleId)
    const { interval, enabled } = useScreenPreferences.getState()
    if (!enabled) { return }
    const native = bridge()
    const key = useSettings.getState().apiKey
    if (!native) { showToast('请在 Android 实验版中使用'); return }
    if (!session || !key) { showToast('请先填写 API Key，并打开要绑定的对话'); return }
    if (state.streaming[session.id]) { showToast('请等待当前回复结束'); return }
    const messages = getVisibleMessages(session).slice(-32).map((message) => ({
      role: message.role,
      content: message.role === 'user' ? message.content :
        message.blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n'),
    }))
    let avatar = ''
    try {
      const source = roleAvatarSrc(role)
      if (source.startsWith('data:')) { avatar = source } else if (source) {
        const blob = await (await fetch(source)).blob()
        avatar = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      }
    } catch { /* Initial letter remains available. */ }
    native.start(JSON.stringify({
      key, avatar, theme: {
        surface: getComputedStyle(document.documentElement).getPropertyValue('--remember-surface').trim(),
        ink: getComputedStyle(document.documentElement).getPropertyValue('--remember-ink').trim(),
        muted: getComputedStyle(document.documentElement).getPropertyValue('--remember-muted').trim(),
        accent: getComputedStyle(document.documentElement).getPropertyValue('--remember-accent').trim(),
        tint: getComputedStyle(document.documentElement).getPropertyValue('--remember-tint').trim(),
      }, name: role.name, sessionId: session.id, interval: Number.isFinite(interval) && interval >= 30 && interval <= 3600 ? interval : 180, messages,
      system: companionPrompt(role.id, '屏幕陪伴', categories),
    }))
  }

export const ScreenCompanionSetting = () => {
  const { enabled, interval } = useScreenPreferences()
  return <section className="memory-settings-group" aria-label="屏幕陪伴实验室">
    <h3>屏幕陪伴 · 实验室</h3>
    <div className="memory-settings-surface" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>启用屏幕陪伴</strong>
        <button type="button" className="remember-switch" role="switch" aria-label="启用屏幕陪伴"
          aria-checked={enabled} onClick={() => {
            useScreenPreferences.setState({ enabled: !enabled })
            if (enabled) { bridge()?.stop() }
          }}><span /></button>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
        开启后，在具体对话右上角点击屏幕陪伴按钮启动，绑定该角色与对话。
        屏幕理解和语音识别可能产生 API 费用；截图不保存。关闭此开关会结束当前陪伴。
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[60, 180, 300].map((seconds) => <Button key={seconds} variant="outlined" size="m"
          aria-pressed={interval === seconds}
          style={interval === seconds ? {
            backgroundColor: 'var(--remember-tint)',
            borderColor: 'var(--remember-accent)',
            color: 'var(--remember-accent)',
          } : undefined}
          disabled={!enabled} onClick={() => useScreenPreferences.setState({ interval: seconds })}>
          {interval === seconds ? '✓ ' : ''}约 {seconds / 60} 分钟
        </Button>)}
      </div>
      <small>当前设置：约 {interval / 60} 分钟。启动后先观察一次，之后按此间隔随机浮动 ±10%；更改频率在下次启动时生效。</small>
    </div>
  </section>
}
