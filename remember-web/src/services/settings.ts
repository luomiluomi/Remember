import { create } from 'zustand'
import { palettes, type Palette } from '../app/palettes.js'
import type { TtsVoice } from './api/speech.js'
import { normalizeLocation, type UserLocation } from './location.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

/** 本机设置，存 localStorage：API Key、语言、主题、位置、朗读音色、深度思考与智能搜索开关、侧边栏收起状态 */
type Settings = {
  apiKey: string | null
  locale: Locale
  themePreference: ThemePreference
  palette: Palette
  location: UserLocation | null
  ttsVoice: TtsVoice
  thinking: boolean
  autoRead: boolean
  contextCompression: boolean
  contextCompressionThreshold: number
  contextRecentMessages: number
  enterToSend: boolean
  chatFontSize: number
  search: boolean
  siderCollapsed: boolean
}

const KEYS = {
  apiKey: 'chat-demo:api-key',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  ttsVoice: 'chat-demo:tts-voice',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

export const normalizeCompressionThreshold = (value: number) =>
  Number.isFinite(value) ? Math.min(800000, Math.max(32000, Math.round(value / 1000) * 1000)) : 256000

export const normalizeRecentMessages = (value: number) =>
  Number.isFinite(value) ? Math.min(200, Math.max(8, Math.round(value / 2) * 2)) : 32

export const setContextRecentMessages = (value: number) => {
  const count = normalizeRecentMessages(value)
  write('remember:context-recent-messages', String(count))
  useSettings.setState({ contextRecentMessages: count })
}

export const setContextCompression = (enabled: boolean) => {
  write('remember:context-compression', String(enabled))
  useSettings.setState({ contextCompression: enabled })
}

export const setCompressionThreshold = (value: number) => {
  const threshold = normalizeCompressionThreshold(value)
  write('remember:compression-threshold', String(threshold))
  useSettings.setState({ contextCompressionThreshold: threshold })
}

export const useSettings = create<Settings>(() => ({
  apiKey: read(KEYS.apiKey),
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  palette: initialPalette(),
  ttsVoice: initialTtsVoice(),
  thinking: read(KEYS.thinking) === 'true',
  autoRead: read('remember:auto-read') === 'true',
  contextRecentMessages: normalizeRecentMessages(Number(read('remember:context-recent-messages')) || 32),
  contextCompression: read('remember:context-compression') !== 'false',
  contextCompressionThreshold: normalizeCompressionThreshold(Number(read('remember:compression-threshold')) || 256000),
  enterToSend: read('remember:enter-to-send') !== 'false',
  chatFontSize: Math.min(24, Math.max(14, Number(read('remember:chat-font-size')) || 16)),
  search: read(KEYS.search) === 'true',
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

function initialPalette(): Palette {
  const saved = read('remember:palette')
  return saved && Object.hasOwn(palettes, saved) ? (saved as Palette) : 'editorial'
}

export const setPalette = (palette: Palette) => {
  write('remember:palette', palette)
  useSettings.setState({ palette })
  setThemePreference(palette === 'midnight' ? 'dark' : 'light')
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey })
}

export const setThinking = (thinking: boolean) => {
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setAutoRead = (autoRead: boolean) => {
  write('remember:auto-read', String(autoRead))
  useSettings.setState({ autoRead })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}

export const setEnterToSend = (enterToSend: boolean) => {
  write('remember:enter-to-send', String(enterToSend))
  useSettings.setState({ enterToSend })
}

export const setChatFontSize = (value: number) => {
  if (!Number.isFinite(value)) {
    return
  }
  const chatFontSize = Math.min(24, Math.max(14, Math.round(value)))
  write('remember:chat-font-size', String(chatFontSize))
  useSettings.setState({ chatFontSize })
}
const applyChatFont = () =>
  document.documentElement.style.setProperty(
    '--memory-chat-font-size',
    useSettings.getState().chatFontSize + 'px'
  )
applyChatFont()
useSettings.subscribe(applyChatFont)
