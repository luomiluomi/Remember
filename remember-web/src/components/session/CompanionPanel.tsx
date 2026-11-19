import { VersionHistoryPage } from './VersionHistoryPage.js'
import { RoleEditorFields } from './RoleEditorFields.js'
import { MemoryDetail } from './MemoryDetail.js'
import { Select } from '../base/Select.js'
import { AboutPage } from './AboutPage.js'
import { DistillPage } from './DistillPage.js'
import { RoleSelect, RoleAvatar } from './RoleSelect.js'
import { IconButton } from '../base/IconButton.js'
import { IconMenuOutline20, IconNewChatOutline20 } from '../base/icons.js'
import { useSettings, setAutoRead } from '../../services/settings.js'
import { stopReadAloud } from '../../services/speech/readAloud.js'
import { useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { openMobileSider } from '../sider/mobileSiderState.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { setSiderCollapsed } from '../../services/settings.js'
import { newChat } from '../../services/chat/store.js'

import { showToast } from '../base/toastState.js'
import { createId } from '../../utils/id.js'
import {
  basic,
  categories,
  useCompanion,
  useRoleChoice,
  useMemoryJobs,
  type Role,
  roleAvatarSrc,
} from '../../services/chat/companion.js'

export function RolePicker() {
  const roles = useCompanion((s) => s.roles)
  const selected = useRoleChoice((s) => s.id)
  return (
    <RoleSelect
      value={roles.length === 1 ? basic.id : selected}
      onChange={(id) => useRoleChoice.setState({ id })}
    />
  )
}

export function CompanionPanel({
  roleId,
  title,
  mobile,
}: {
  roleId?: string
  title?: string
  mobile: boolean
}) {
  const t = useTranslate()
  const autoRead = useSettings((state) => state.autoRead)
  const roles = useCompanion((s) => s.roles)
  const cards = useCompanion((s) => s.cards)
  const jobs = useMemoryJobs((state) => state.jobs)
  const [pageOpen, setPageOpen] = useState(false)
  const closePage = () => history.back()
  useEffect(() => {
    const onRoute = () => {
      const route = location.hash.slice(1)
      const valid =
        route === 'roles' ||
        route === 'memory' ||
        route === 'distill' ||
        route === 'about' ||
        route === 'versions'
      setPageOpen(valid)
      if (valid) {
        setPage(route)
      }
    }
    onRoute()
    window.addEventListener('popstate', onRoute)
    return () => window.removeEventListener('popstate', onRoute)
  }, [])
  const menu = useRef<HTMLDetailsElement>(null)
  const choose = (action: () => void) => {
    if (menu.current) {
      menu.current.open = false
    }
    action()
  }
  const [roleEditor, setRoleEditor] = useState(false)
  const [memoryDetail, setMemoryDetail] = useState<string | null>(null)
  useEffect(() => {
    const back = (event: Event) => {
      if (!pageOpen || event.defaultPrevented) {
        return
      }
      event.preventDefault()
      if (memoryDetail) {
        setMemoryDetail(null)
      } else if (roleEditor) {
        setRoleEditor(false)
      } else {
        closePage()
      }
    }
    window.addEventListener('remember-back', back)
    return () => window.removeEventListener('remember-back', back)
  }, [pageOpen, roleEditor, memoryDetail])
  const [page, setPage] = useState<'roles' | 'memory' | 'distill' | 'about' | 'versions'>('roles')
  const [selected, setSelected] = useState(basic.id)
  const [memoryCategory, setMemoryCategory] = useState<(typeof categories)[number]>(categories[0])
  const [editing, edit] = useState<Role>(basic)
  const current = roles.find((role) => role.id === roleId) ?? basic
  const open = (next: typeof page) => {
    setPage(next)
    setRoleEditor(false)
    setSelected(current.id)
    edit(current)
    if (!pageOpen) {
      history.pushState(null, '', '#' + next)
    } else {
      history.replaceState(null, '', '#' + next)
    }
    setPageOpen(true)
  }
  useEffect(() => {
    const listener = (event: Event) =>
      open((event as CustomEvent<'roles' | 'memory' | 'distill' | 'about' | 'versions'>).detail)
    window.addEventListener('remember-panel', listener)
    return () => window.removeEventListener('remember-panel', listener)
  })
  return (
    <header className="remember-toolbar">
      <IconButton
        size="xl"
        icon={<IconMenuOutline20 />}
        aria-label={t('rememberHistory')}
        onClick={() => (mobile ? openMobileSider() : setSiderCollapsed(false))}
      />
      <strong className="remember-title" title={title}>
        {roleId ? current.name : t('appName')}
      </strong>
      <div className="remember-header-actions">
        <button
          type="button"
          className="remember-read"
          aria-label={autoRead ? '关闭自动朗读' : '开启自动朗读'}
          aria-pressed={autoRead}
          onClick={() => {
            setAutoRead(!autoRead)
            if (autoRead) {
              stopReadAloud()
            }
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            {autoRead ? <path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" /> : <path d="m3 3 18 18" />}
          </svg>
        </button>
        <IconButton
          size="xl"
          icon={<IconNewChatOutline20 />}
          aria-label={t('newChat')}
          onClick={newChat}
        />
      </div>
      <details hidden className="remember-menu" ref={menu}>
        <summary aria-label="打开菜单">⋯</summary>
        <nav aria-label="记得">
          <button type="button" onClick={() => choose(newChat)}>
            {t('newChat')}
          </button>
          <button
            type="button"
            onClick={() => choose(() => (mobile ? openMobileSider() : setSiderCollapsed(false)))}
          >
            {t('rememberHistory')}
          </button>
          <button type="button" onClick={() => choose(() => open('roles'))}>
            {t('rememberRoles')}
          </button>
          <button type="button" onClick={() => choose(() => open('memory'))}>
            {t('rememberMemory')}
          </button>
          <button type="button" onClick={() => choose(() => openSettings('general'))}>
            {t('settings')}
          </button>
        </nav>
      </details>
      {pageOpen && (
        <section
          className="remember-dialog remember-management-page"
          aria-label={
            page === 'versions'
              ? '版本更新记录'
              : page === 'about'
                ? '关于记得'
                : page === 'roles'
                  ? roleEditor
                    ? '角色设置'
                    : '角色卡'
                  : page === 'memory'
                    ? '记忆卡'
                    : '会话提炼'
          }
        >
          <header>
            <button
              type="button"
              className="remember-page-back"
              aria-label="返回聊天"
              onClick={() => (roleEditor ? setRoleEditor(false) : closePage())}
            >
              ‹
            </button>
            <strong>
              {page === 'versions'
                ? '版本更新记录'
                : page === 'about'
                  ? '关于记得'
                  : page === 'roles'
                    ? roleEditor
                      ? '角色设置'
                      : '角色卡'
                    : page === 'memory'
                      ? '记忆卡'
                      : '会话提炼'}
            </strong>
            <span className="remember-page-spacer" />
          </header>
          {page === 'memory' && (
            <div className="remember-role-tabs" role="tablist" aria-label="角色记忆">
              {roles.map((role) => (
                <button
                  type="button"
                  key={role.id}
                  role="tab"
                  aria-selected={selected === role.id}
                  onClick={() => setSelected(role.id)}
                >
                  <RoleAvatar role={role} />
                  {role.name}
                </button>
              ))}
            </div>
          )}
          {page === 'roles' && !roleEditor && (
            <div className="remember-character-grid">
              {roles.map((role) => (
                <button
                  type="button"
                  className="remember-character-card"
                  key={role.id}
                  onClick={() => {
                    edit(role)
                    setSelected(role.id)
                    setRoleEditor(true)
                  }}
                >
                  {roleAvatarSrc(role) ? (
                    <img src={roleAvatarSrc(role)} alt="" />
                  ) : (
                    <div className="remember-card-art">{role.name.slice(0, 1)}</div>
                  )}
                  <div>
                    <strong>{role.name}</strong>
                    <span>
                      {role.id === basic.id ? '官方基础角色' : role.gender || '自定义角色'}
                    </span>
                    <p>
                      {role.id === basic.id
                        ? '保持默认对话风格，可开启自动记忆。'
                        : role.prompt || '一个等待你定义的聊天伙伴。'}
                    </p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                className="remember-add-role"
                onClick={() => {
                  setSelected('')
                  edit({ ...basic, id: '', name: '', auto: true })
                  setRoleEditor(true)
                }}
              >
                ＋ 创建角色
              </button>
            </div>
          )}
          {page === 'versions' ? (
            <VersionHistoryPage />
          ) : page === 'about' ? (
            <AboutPage />
          ) : page === 'distill' ? (
            <DistillPage />
          ) : page === 'roles' ? (
            roleEditor ? (
              <form
                className="memory-role-editor"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!editing.name.trim()) {
                    return
                  }
                  const saved =
                    selected === basic.id
                      ? { ...basic, auto: editing.auto }
                      : {
                          ...editing,
                          name: editing.name.trim(),
                          id: selected || createId(),
                        }
                  try {
                    useCompanion.setState({
                      roles: selected
                        ? roles.map((r) => (r.id === saved.id ? saved : r))
                        : [...roles, saved],
                    })
                    setSelected(saved.id)
                    edit(saved)
                    setRoleEditor(false)
                  } catch {
                    showToast('无法保存角色：本地存储空间不足。')
                  }
                }}
              >
                <RoleEditorFields role={editing} onChange={edit} />
                <div className="memory-form-footer">
                  <button type="button" onClick={() => setRoleEditor(false)}>
                    取消
                  </button>
                  <button type="submit">保存角色</button>
                </div>
              </form>
            ) : null
          ) : (
            <section role="tabpanel">
              <p role="status">
                {jobs[selected] === 'extracting'
                  ? '正在整理这个角色的新记忆…'
                  : jobs[selected] === 'error'
                    ? '上次自动提取失败，聊天已保存。后续对话会继续尝试。'
                    : '记忆只会用于当前角色。'}
              </p>
              <p className="remember-cost-note">
                自动整理与按维度检索会额外使用 DeepSeek API 额度，可在角色设置中管理自动记忆。
              </p>
              <details className="remember-add-memory">
                <summary>＋ 添加记忆</summary>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    const text = String(data.get('memory') ?? '').trim()
                    const category = String(data.get('category')) as (typeof categories)[number]
                    if (!text || !categories.includes(category)) {
                      return
                    }
                    useCompanion.setState((state) => ({
                      cards: [
                        ...state.cards,
                        {
                          id: createId(),
                          roleId: selected,
                          category,
                          text,
                          active: true,
                          createdAt: Date.now(),
                        },
                      ],
                    }))
                    event.currentTarget.reset()
                  }}
                >
                  <div className="remember-memory-category">
                    <span>记忆维度</span>
                    <input type="hidden" name="category" value={memoryCategory} />
                    <Select
                      value={memoryCategory}
                      onChange={setMemoryCategory}
                      ariaLabel="记忆维度"
                      options={categories.map((category) => ({ value: category, label: category }))}
                    />
                  </div>
                  <textarea
                    name="memory"
                    aria-label="新记忆内容"
                    maxLength={800}
                    required
                    placeholder="值得这个角色记住的事…"
                  />
                  <button type="submit">添加记忆</button>
                </form>
              </details>
              {cards.every((c) => c.roleId !== selected) && (
                <div className="remember-empty">
                  <span>◇</span>
                  <h3>让记忆慢慢积累</h3>
                  <p>
                    聊天中确认的重要信息，会留在这个角色的记忆里。
                    <br />
                    也可以手动添加第一张记忆卡。
                  </p>
                </div>
              )}
              {categories.map((category) => {
                const group = cards.filter((c) => c.roleId === selected && c.category === category)
                return (
                  group.length > 0 && (
                    <div key={category}>
                      <h3>{category}</h3>
                      {group.map((card) => (
                        <button
                          type="button"
                          className="remember-memory-card remember-memory-preview"
                          data-category={card.category}
                          key={card.id}
                          onClick={() => setMemoryDetail(card.id)}
                        >
                          <span className="remember-memory-meta">
                            {category} · {card.active ? '已启用' : '已停用'}
                          </span>
                          <p>{card.text}</p>
                          <small>查看详情 ›</small>
                        </button>
                      ))}
                    </div>
                  )
                )
              })}
            </section>
          )}
        </section>
      )}
      {memoryDetail && <MemoryDetail id={memoryDetail} onClose={() => setMemoryDetail(null)} />}
    </header>
  )
}
