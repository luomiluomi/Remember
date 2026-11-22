import { ScreenCompanionSetting } from './ScreenCompanionSetting.js'
import { appVersion } from '../session/AboutPage.js'
import { setContextRecentMessages, setContextCompression, setCompressionThreshold, setEnterToSend } from '../../services/settings.js'
import { ChatTextSetting, LauncherAppearanceSetting } from './PersonalizationSetting.js'
import { ProfileSetting } from '../session/ProfileSetting.js'
import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../../services/api/client.js'
import { fetchBalance, type AccountBalance } from '../../services/api/balance.js'
import { palettes } from '../../app/palettes.js'
import { setPalette } from '../../services/settings.js'
import {
  IconDarkOutline16,
  IconDataOutline16,
  IconDownloadOutline16,
  IconFollowsystemOutline16,
  IconLightOutline16,
  IconSettingsOutline16,
  IconUploadOutline14,
} from '../base/icons.js'
import {
  BackupError,
  clearHistory,
  exportHistory,
  importHistory,
} from '../../services/chat/backup.js'
import { useIsMobile } from '../../app/viewport.js'
import { useChatStore } from '../../services/chat/store.js'
import { regionCodes, getRegionName, provinces } from '../../services/location.js'
import {
  isChineseBrowser,
  setLocale,
  setLocation,
  setThemePreference,
  setTtsVoice,
  useSettings,
  type ThemePreference,
} from '../../services/settings.js'
import { useTranslate, type TranslationKey, type TranslationMessage } from '../../i18n/index.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { Select } from '../base/Select.js'
import { showToast } from '../base/toastState.js'
import { ApiKeyConfirm, ApiKeyField, useApiKeyEditor } from './ApiKeyField.js'
import { closeSettings, useSettingsDialog, type SettingsSection } from './settingsDialogState.js'
import styles from './Settings.module.css'

/**
 * 设置弹窗：分「通用设置」（主题、语言、朗读音色、位置）与「数据管理」（API Key、导入、导出、删除）。
 * 桌面端为居中弹窗、左侧导航；移动端为底部弹层、导航横排在内容上方
 */
export const SettingsDialog = () => {
  const open = useSettingsDialog((state) => state.open)
  return open ? <SettingsContent /> : null
}

const sections: { value: SettingsSection; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'general',
    label: 'settingDialogAsideGeneralOptionLabel',
    icon: <IconSettingsOutline16 />,
  },
  { value: 'data', label: 'settingDialogAsideDataOptionLabel', icon: <IconDataOutline16 /> },
]

const SettingsContent = () => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  // 打开时按调用方指定的分组选中，之后在弹窗内切换
  const [section, setSection] = useState(() => useSettingsDialog.getState().section)
  // 切换分组不丢失正在输入的 API Key 与导入状态
  const apiKeyEditor = useApiKeyEditor()
  const historyImport = useHistoryImport()
  const historyDelete = useHistoryDelete()
  const replacingHistory = useChatStore((state) => state.importingHistory)
  const historyBusy = historyImport.busy || historyDelete.busy || replacingHistory
  return (
    <>
      <Modal
        title={t('settings')}
        closable
        className={clsx(styles.dialog, 'memory-settings-page')}
        mainClassName={styles.dialogMain}
        onClose={() => {
          if (!historyDelete.busy && !historyImport.busy) {
            closeSettings()
          }
        }}
      >
        <div role="tablist" className={styles.navigation}>
          {sections.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={section === item.value}
              className={clsx(styles.navItem, section === item.value && styles.navItemActive)}
              onClick={() => setSection(item.value)}
            >
              {item.icon}
              {t(item.label)}
            </button>
          ))}
        </div>
        <div role="tabpanel" className={styles.content}>
          {section === 'general' ? (
            <>
              <ProfileSetting />
              <SettingsGroup title="外观与阅读">
                <ThemeSetting />
                <ChatTextSetting />
                <LauncherAppearanceSetting />
              </SettingsGroup>
              <SettingsGroup title="对话偏好">
                <EnterKeySetting />
                <ContextCompressionSetting />
                <LocaleSetting />
                <TtsVoiceSetting />
                <LocationSetting />
              </SettingsGroup>
              <ScreenCompanionSetting />
              <SettingsGroup title="账户与用量">
                <BalanceSetting key={apiKeyEditor.apiKey ?? ''} apiKey={apiKeyEditor.apiKey} />
                <details className="remember-api-note">
                  <summary>额外 API 用量</summary>
                  <p>
                    自动记忆整理、维度检索、长对话压缩，以及语音识别与朗读，都会调用 DeepSeek
                    并可能使用账户额度。
                  </p>
                  <p>
                    自动记忆可在角色设置中关闭；长对话整理开始时会显示提示。更换音色和本地编辑不会发起生成请求。
                  </p>
                </details>
              </SettingsGroup>
              <SettingsGroup title="关于应用">
                <SettingsLink label="版本更新记录" detail={appVersion} page="versions" />
                <SettingsLink label="关于记得" detail="工作室与开源说明" page="about" />
              </SettingsGroup>
            </>
          ) : (
            <>
              <SettingsGroup title="API 连接">
                <ApiKeyField editor={apiKeyEditor} />
              </SettingsGroup>
              <SettingsGroup title="聊天记录">
                <ImportHistory historyImport={historyImport} disabled={historyBusy} />
                <ExportHistory disabled={historyBusy} />
                <SettingCell
                  label={t('deleteAllSessions')}
                  status={null}
                  action={
                    <Button
                      variant="dangerOutlined"
                      size="m"
                      className={styles.cellButton}
                      disabled={historyBusy}
                      onClick={historyDelete.open}
                    >
                      {t('delete')}
                    </Button>
                  }
                />
              </SettingsGroup>
              {isMobile ? <ApiKeyConfirm editor={apiKeyEditor} /> : null}
            </>
          )}
        </div>
      </Modal>
      {historyImport.file ? <ImportConfirm historyImport={historyImport} /> : null}
      {historyDelete.opened ? <DeleteAllConfirm historyDelete={historyDelete} /> : null}
    </>
  )
}

/** 删除确认保留在设置之上；失败可重试，成功只关闭确认弹窗。 */
const DeleteAllConfirm = ({
  historyDelete,
}: {
  historyDelete: ReturnType<typeof useHistoryDelete>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('deleteAllSessionsModalTitle')}
      className={styles.deleteConfirm}
      onClose={historyDelete.cancel}
      footer={
        <div className={styles.deleteActions} aria-busy={historyDelete.busy}>
          <Button
            variant="outlined"
            autoFocus
            disabled={historyDelete.busy}
            onClick={historyDelete.cancel}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={historyDelete.busy}
            onClick={() => void historyDelete.confirm()}
          >
            {t(historyDelete.busy ? 'historyDeleting' : 'deleteAllSessions')}
          </Button>
        </div>
      }
    >
      {t('deleteAllSessionsModalDescription')}
    </Modal>
  )
}

const useHistoryDelete = () => {
  const [opened, setOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const deleting = useRef(false)

  const confirm = async () => {
    if (deleting.current) {
      return
    }
    deleting.current = true
    setBusy(true)
    try {
      await clearHistory()
      setOpened(false)
      showToast({ key: 'historyDeleted' })
    } catch {
      showToast({ key: 'historyDeleteFailed', type: 'error' })
    } finally {
      deleting.current = false
      setBusy(false)
    }
  }

  return {
    opened,
    busy,
    open: () => setOpened(true),
    cancel: () => {
      if (!deleting.current) {
        setOpened(false)
      }
    },
    confirm,
  }
}

const LocationSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const location = useSettings((state) => state.location)
  const province =
    location?.region === 'CN'
      ? provinces.find((item) => item.code === location.province)
      : undefined

  return (
    <SettingCell
      label={t('settingsLocation')}
      status={null}
      className={styles.locationCell}
      action={
        <div className={styles.locationSelectors}>
          {isChineseBrowser() ? (
            <>
              <Select
                ariaLabel={t('settingsLocationProvince')}
                className={styles.provinceSelect}
                value={province?.code ?? ''}
                placeholder={t('settingsLocationProvince')}
                options={provinces.map((item) => ({ value: item.code, label: item.name }))}
                onChange={(value) => {
                  if (value !== province?.code) {
                    setLocation({ region: 'CN', province: value })
                  }
                }}
              />
              <Select
                ariaLabel={t('settingsLocationCity')}
                className={styles.citySelect}
                value={province ? (location?.city ?? '') : ''}
                disabled={!province?.cities.length}
                placeholder={t('settingsLocationCity')}
                options={
                  province?.cities.map((item) => ({ value: item.code, label: item.name })) ?? []
                }
                onChange={(value) => {
                  if (province) {
                    setLocation({ region: 'CN', province: province.code, city: value })
                  }
                }}
              />
            </>
          ) : (
            <Select
              ariaLabel={t('settingsLocationRegion')}
              className={styles.regionSelect}
              value={location?.region ?? ''}
              placeholder={t('settingsLocationRegion')}
              options={regionCodes
                .map((code) => ({ value: code, label: getRegionName(code, locale) }))
                .sort((a, b) => a.label.localeCompare(b.label, locale))}
              onChange={(value) => setLocation({ region: value })}
            />
          )}
        </div>
      }
    />
  )
}

const LocaleSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  return (
    <SettingCell
      label={t('settingsLocalePreference')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsLocalePreference')}
          value={locale}
          options={[
            { value: 'zh-CN', label: t('settingsLocaleZhCN'), lang: 'zh-CN' },
            { value: 'en-US', label: t('settingsLocaleEnUS'), lang: 'en' },
          ]}
          onChange={setLocale}
        />
      }
    />
  )
}

/** 朗读音色：stella（海星，女声）/ tide（暗潮，男声） */
const TtsVoiceSetting = () => {
  const t = useTranslate()
  const ttsVoice = useSettings((state) => state.ttsVoice)
  return (
    <SettingCell
      label={t('settingsTtsVoice')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsTtsVoice')}
          value={ttsVoice}
          options={[
            { value: 'stella', label: t('settingsTtsVoiceStella') },
            { value: 'tide', label: t('settingsTtsVoiceTide') },
          ]}
          onChange={setTtsVoice}
        />
      }
    />
  )
}

/** 覆盖导入的二次确认，叠在设置弹窗上 */
const ImportConfirm = ({
  historyImport,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('historyImportConfirmTitle')}
      className={styles.importConfirm}
      onClose={historyImport.cancel}
      footer={
        <>
          <Button variant="outlined" size="m" autoFocus onClick={historyImport.cancel}>
            {t('cancel')}
          </Button>
          <Button variant="dangerOutlined" size="m" onClick={() => void historyImport.confirm()}>
            {t('historyImportConfirm')}
          </Button>
        </>
      }
    >
      <div className={styles.importConfirmText}>{t('historyImportConfirmDescription')}</div>
    </Modal>
  )
}

const themeOptions: { value: ThemePreference; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'avatarMenuSettingsDialogThemeSelectLightOption',
    icon: <IconLightOutline16 />,
  },
  {
    value: 'dark',
    label: 'avatarMenuSettingsDialogThemeSelectDarkOption',
    icon: <IconDarkOutline16 />,
  },
  {
    value: 'system',
    label: 'avatarMenuSettingsDialogThemeSelectSystemOption',
    icon: <IconFollowsystemOutline16 />,
  },
]

/**
 * 主题项：标题下方浅色 / 深色 / 跟随系统三个选块。
 * 与下方语言选项连续排列。
 */
const ThemeSetting = () => {
  const t = useTranslate()
  const themePreference = useSettings((state) => state.themePreference)
  const palette = useSettings((state) => state.palette)
  const locale = useSettings((state) => state.locale)
  const label = t('avatarMenuSettingsDialogThemeItemLabel')
  return (
    <details className={styles.theme}>
      <summary className="remember-appearance-summary">
        <span>{locale === 'zh-CN' ? '外观与配色' : 'Appearance'}</span>
        <span>{palettes[palette].label[locale === 'zh-CN' ? 0 : 1]}</span>
      </summary>
      <div className="remember-palette-label">
        {locale === 'zh-CN' ? '配色方案' : 'Color palette'}
      </div>
      <div
        className="remember-palettes"
        role="group"
        aria-label={locale === 'zh-CN' ? '配色方案' : 'Color palette'}
      >
        {Object.entries(palettes).map(([id, option]) => (
          <button
            type="button"
            key={id}
            aria-pressed={palette === id}
            onClick={() => setPalette(id as keyof typeof palettes)}
          >
            <span
              aria-hidden
              style={{
                background: option.colors.paper,
                color: option.colors.accent,
                borderColor: option.colors.border,
              }}
            >
              Aa
            </span>
            {option.label[locale === 'zh-CN' ? 0 : 1]}
          </button>
        ))}
      </div>
      {label}
      <div role="radiogroup" aria-label={label} className={styles.themeOptions}>
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={themePreference === option.value}
            className={clsx(
              styles.themeOption,
              themePreference === option.value && styles.themeOptionSelected
            )}
            onClick={() => setThemePreference(option.value)}
          >
            {option.icon}
            {t(option.label)}
          </button>
        ))}
      </div>
    </details>
  )
}

/** `reason` 为失败原因的文案 key，展示时按当前语言翻译后填入 `message` 参数。 */
type Status = (TranslationMessage & { error?: boolean; reason?: TranslationKey }) | null

/** 导出失败附带原因：预期的错误用对应文案作原因，其他错误用错误信息。 */
const errorStatus = (key: TranslationKey, error: unknown): Status => ({
  key,
  ...(error instanceof BackupError
    ? { reason: error.key }
    : { params: { message: error instanceof Error ? error.message : String(error) } }),
  error: true,
})

const SettingCell = ({
  label,
  description,
  status,
  action,
  className,
}: {
  label: string
  description?: string
  status: Status
  action: ReactNode
  className?: string
}) => {
  const t = useTranslate()
  return (
    <div className={clsx(styles.cell, styles.row, className, 'memory-setting-cell')}>
      <div className={styles.text}>
        <div className={styles.label}>{label}</div>
        {status || description ? (
          <div
            role={status?.error ? 'alert' : status ? 'status' : undefined}
            className={clsx(styles.description, status?.error && styles.error)}
          >
            {status
              ? t(status.key, status.reason ? { message: t(status.reason) } : status.params)
              : description}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

const BalanceSetting = ({ apiKey }: { apiKey?: string | null }) => {
  const t = useTranslate()
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      pending.current?.abort()
      pending.current = null
    },
    []
  )

  const refresh = async () => {
    if (!apiKey || pending.current) {
      return
    }
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    setStatus({ key: 'balanceLoading' })
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const result = await fetchBalance(apiKey, controller.signal)
      if (pending.current === controller) {
        setBalance(result)
        setUpdatedAt(new Date().toLocaleTimeString())
        setStatus({ key: result.is_available ? 'balanceAvailable' : 'balanceUnavailable' })
      }
    } catch (error) {
      if (pending.current === controller) {
        const code = error instanceof ApiError ? error.status : undefined
        setStatus(
          controller.signal.aborted
            ? { key: 'balanceTimeout', error: true }
            : code === 401
              ? { key: 'balanceInvalidKey', error: true }
              : code === 429
                ? { key: 'balanceRateLimited', error: true }
                : code
                  ? { key: 'balanceHttpFailed', params: { status: code }, error: true }
                  : { key: 'balanceFailed', error: true }
        )
      }
    } finally {
      clearTimeout(timer)
      if (pending.current === controller) {
        pending.current = null
        setBusy(false)
      }
    }
  }

  return (
    <div>
      <SettingCell
        label={t('balanceTitle')}
        description={!apiKey ? t('balanceNeedsKey') : t('balanceDescription')}
        status={status}
        action={
          <Button
            variant="outlined"
            size="m"
            disabled={!apiKey || busy}
            onClick={() => void refresh()}
          >
            {t('balanceRefresh')}
          </Button>
        }
      />
      {updatedAt ? (
        <p className={styles.balanceDetails}>{t('balanceUpdated', { time: updatedAt })}</p>
      ) : null}
      {balance?.balance_infos.map((entry, index) => (
        <div key={`${entry.currency}-${index}`} className={styles.balanceDetails}>
          <strong>
            {t('balanceTotal', { currency: entry.currency, amount: entry.total_balance })}
          </strong>
          <span>
            {t('balanceBreakdown', {
              granted: entry.granted_balance,
              toppedUp: entry.topped_up_balance,
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 选文件后先提示覆盖；确认后才检查文件并执行导入，任何错误都提示导入失败。 */
const useHistoryImport = () => {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const importing = useRef(false)

  const confirm = async () => {
    if (!file || importing.current) {
      return
    }
    importing.current = true
    setFile(null)
    setBusy(true)
    setStatus({ key: 'historyImportReading' })
    try {
      const count = await importHistory(file, (stage, progress) => {
        if (stage === 'saving') {
          setStatus({ key: 'historyImportSaving' })
        } else if (progress === 1 || (progress !== undefined && progress % 10 === 0)) {
          setStatus({ key: 'historyImportProgress', params: { count: progress } })
        }
      })
      setStatus({ key: count === 1 ? 'historyImportedOne' : 'historyImported', params: { count } })
    } catch (error) {
      const unreadable =
        error instanceof DOMException &&
        ['NotReadableError', 'NotFoundError', 'SecurityError'].includes(error.name)
      const storageFull = error instanceof DOMException && error.name === 'QuotaExceededError'
      setStatus({
        key:
          error instanceof BackupError
            ? error.key
            : unreadable
              ? 'historyImportUnreadable'
              : storageFull
                ? 'historyImportStorageFull'
                : 'historyImportFailed',
        error: true,
      })
    } finally {
      importing.current = false
      setBusy(false)
    }
  }

  return { file, busy, status, select: setFile, cancel: () => setFile(null), confirm }
}

/** 导入 = 覆盖：用选中文件替换本地全部会话与附件。 */
const ImportHistory = ({
  historyImport,
  disabled,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
  disabled: boolean
}) => {
  const t = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <SettingCell
      label={t('historyImport')}
      description={t('historyImportDescription')}
      status={historyImport.status}
      action={
        <>
          <Button
            variant="outlined"
            size="m"
            className={clsx(styles.cellButton, styles.uploadButton)}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <IconUploadOutline14 />
            {t('upload')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                historyImport.select(file)
              }
            }}
          />
        </>
      }
    />
  )
}

/** 将全部会话及图片导出为 ZIP 文件并下载 */
const ExportHistory = ({ disabled }: { disabled: boolean }) => {
  const t = useTranslate()
  const empty = useChatStore((state) => state.sessions.length === 0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const onExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const { name, blob } = await exportHistory()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (error) {
      setStatus(errorStatus('historyExportFailed', error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingCell
      label={t('exportAllLabel')}
      description={t('historyExportDescription')}
      status={status}
      action={
        <Button
          variant="outlined"
          size="m"
          className={styles.cellButton}
          disabled={disabled || busy || empty}
          onClick={() => void onExport()}
        >
          <IconDownloadOutline16 />
          {t('exportAllDownload')}
        </Button>
      }
    />
  )
}

const compressionPresets = [
  { value: 64000, label: '轻量', detail: '64K' },
  { value: 128000, label: '适中', detail: '128K' },
  { value: 256000, label: '均衡', detail: '256K · 默认' },
  { value: 512000, label: '长聊', detail: '512K' },
]

const ContextCompressionSetting = () => {
  const enabled = useSettings((state) => state.contextCompression)
  const threshold = useSettings((state) => state.contextCompressionThreshold)
  const recentMessages = useSettings((state) => state.contextRecentMessages)
  const [custom, setCustom] = useState(() => !compressionPresets.some((item) => item.value === threshold))
  const [draft, setDraft] = useState(() => String(threshold / 1000))
  const customValid = /^\d+$/.test(draft) && Number(draft) >= 32 && Number(draft) <= 800
  return (
    <>
      <SettingCell
        label="自动压缩上下文"
        description="达到阈值时整理早期内容，保留原始记录。整理会调用 API 并消耗额度。"
        status={null}
        action={<button type="button" className="remember-switch" role="switch"
          aria-label="自动压缩上下文" aria-checked={enabled}
          onClick={() => setContextCompression(!enabled)}><span /></button>}
      />
      <SettingCell
        className={styles.compressionCell}
        label="保留最近消息"
        description="用户与 AI 发言各计一条，32 条约为 16 轮。范围 8–200 条；不足时不压缩。"
        status={null}
        action={<label className={styles.compressionRange}>
          <output>{recentMessages} 条消息</output>
          <input type="range" aria-label="保留最近消息" min={8} max={200}
            step={2} value={recentMessages} disabled={!enabled}
            onChange={(event) => setContextRecentMessages(Number(event.target.value))} />
        </label>}
      />
      <SettingCell
        className={styles.compressionCell}
        label="压缩触发阈值"
        description="选择整理早期内容的时机。按 tokens 估算；为回复和记忆预留空间，含工具调用时暂不压缩。"
        status={null}
        action={<div className={styles.compressionControl}>
          <div className={styles.compressionPresets} role="group" aria-label="压缩阈值档位">
            {compressionPresets.map((preset) => (
              <button key={preset.value} type="button" disabled={!enabled}
                aria-pressed={!custom && threshold === preset.value}
                onClick={() => {
                  setCustom(false)
                  setDraft(String(preset.value / 1000))
                  setCompressionThreshold(preset.value)
                }}>
                <strong>{preset.label}</strong><small>{preset.detail}</small>
              </button>
            ))}
            <button type="button" disabled={!enabled} aria-pressed={custom}
              onClick={() => { setCustom(true); setDraft(String(threshold / 1000)) }}>
              <strong>自定义</strong><small>自行设定</small>
            </button>
          </div>
          {custom && <div className={styles.compressionCustom}>
            <label>
              <span>触发阈值</span>
              <input type="number" inputMode="numeric" min={32} max={800} step={1}
                aria-label="自定义压缩阈值（K tokens）" disabled={!enabled} value={draft}
                onChange={(event) => setDraft(event.target.value)} />
              <span>K tokens</span>
            </label>
            <Button variant="outlined" size="m" disabled={!enabled || !customValid}
              onClick={() => {
                setCompressionThreshold(Number(draft) * 1000)
                showToast('压缩阈值已保存')
              }}>保存</Button>
          </div>}
          <small aria-live="polite">
            {custom && !customValid ? '请输入 32–800 之间的整数。' :
              '当前生效：' + Math.round(threshold / 1000) + 'K tokens（估算）'}
          </small>
        </div>}
      />
    </>
  )
}

const EnterKeySetting = () => {
  const enterToSend = useSettings((state) => state.enterToSend)
  return (
    <SettingCell
      label="回车键发送"
      description={enterToSend ? 'Enter 发送，Shift + Enter 换行' : 'Enter 换行，点击发送按钮发送'}
      status={null}
      action={
        <button
          type="button"
          className="remember-switch"
          role="switch"
          aria-label="回车键发送"
          aria-checked={enterToSend}
          onClick={() => setEnterToSend(!enterToSend)}
        >
          <span />
        </button>
      }
    />
  )
}

const SettingsGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="memory-settings-group" aria-label={title}>
    <h3>{title}</h3>
    <div className="memory-settings-surface">{children}</div>
  </section>
)
const SettingsLink = ({
  label,
  detail,
  page,
}: {
  label: string
  detail: string
  page: 'about' | 'versions'
}) => (
  <button
    type="button"
    className="memory-settings-link"
    onClick={() => {
      closeSettings()
      window.dispatchEvent(new CustomEvent('remember-panel', { detail: page }))
    }}
  >
    <span>{label}</span>
    <small>{detail}</small>
  </button>
)
