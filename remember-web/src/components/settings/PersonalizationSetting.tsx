import { useState } from 'react'
import { setChatFontSize, useSettings } from '../../services/settings.js'
import { showToast } from '../base/toastState.js'

export function ChatTextSetting() {
  const size = useSettings((state) => state.chatFontSize)
  return (
    <details className="memory-preference-section">
      <summary>
        <span>聊天文字大小</span>
        <small>{size} px</small>
      </summary>
      <div className="memory-font-preview" style={{ fontSize: size }}>
        <p>今天，想聊些什么？</p>
        <p>慢慢说，我在听。</p>
      </div>
      <div className="memory-font-controls">
        <span aria-hidden="true">小</span>
        <input
          type="range"
          min={14}
          max={24}
          step={1}
          value={size}
          aria-label="聊天文字大小"
          aria-valuetext={size + ' 像素'}
          onChange={(event) => setChatFontSize(Number(event.target.value))}
        />
        <span aria-hidden="true">大</span>
      </div>
      <div className="memory-preference-actions">
        <small>即时生效 · 仅调整聊天正文</small>
        <button type="button" onClick={() => setChatFontSize(16)}>
          恢复默认
        </button>
      </div>
    </details>
  )
}

type LauncherBridge = { current(): string; select(preset: string): string }
const launcher = () =>
  (globalThis as typeof globalThis & { MemoryLauncher?: LauncherBridge }).MemoryLauncher
const defaultLauncherIcon = new URL('../../app/memory-launcher-default.svg', import.meta.url).href
const alternateLauncherIcon = new URL('../../app/memory-launcher-alternative.svg', import.meta.url)
  .href
export function LauncherAppearanceSetting() {
  const [current, setCurrent] = useState(() => launcher()?.current() ?? 'remember')
  return (
    <details className="memory-preference-section">
      <summary>
        <span>应用图标与名称</span>
        <small>{current === 'memory' ? 'Memory' : '记得'}</small>
      </summary>
      <div className="memory-launcher-presets">
        {[
          { id: 'remember', name: '记得', caption: '原版图标' },
          { id: 'memory', name: 'Memory', caption: '午夜字母' },
        ].map((preset) => (
          <button
            type="button"
            key={preset.id}
            aria-pressed={current === preset.id}
            disabled={!launcher()}
            onClick={() => {
              const result = launcher()?.select(preset.id)
              if (result === preset.id) {
                setCurrent(result)
                showToast('应用入口已切换，桌面可能需要片刻刷新')
              } else {
                showToast('未能切换应用入口，请重试')
              }
            }}
          >
            <img
              className="memory-preset-icon"
              alt=""
              src={preset.id === 'memory' ? alternateLauncherIcon : defaultLauncherIcon}
            />
            <strong>{preset.name}</strong>
            <small>{preset.caption}</small>
          </button>
        ))}
      </div>
      <p className="memory-permission-note">
        切换应用自身的桌面入口，不创建快捷方式。仅支持内置图标与名称；系统应用管理中的名称保持“记得”。桌面刷新可能需要片刻。
      </p>
      {!launcher() && <p className="memory-permission-note">此功能需要在安卓应用内使用。</p>}
    </details>
  )
}
