import { RoleSelect } from './RoleSelect.js'
import { useEffect, useRef, useState } from 'react'
import { getVisibleMessages } from '../../services/chat/branches.js'
import { extractMemories, useCompanion, useMemoryJobs } from '../../services/chat/companion.js'
import { useChatStore } from '../../services/chat/store.js'
import { useSettings } from '../../services/settings.js'

export function DistillPage() {
  const session = useChatStore((state) =>
    state.activeId ? state.sessionCache[state.activeId] : undefined
  )
  const roles = useCompanion((state) => state.roles)
  const ledger = useCompanion((state) => (session ? state.distillations[session.id] : undefined))
  const imported = Boolean(
    session && (session.imported === true || (session.imported === undefined && !session.roleId))
  )
  const [roleId, setRoleId] = useState(ledger?.roleId ?? '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const cancel = useRef(false)
  useEffect(
    () => () => {
      cancel.current = true
    },
    []
  )
  const chunks = session
    ? getVisibleMessages(session)
        .filter((message) => message.role === 'user')
        .flatMap((message) => {
          const parts: { text: string; id: string }[] = []
          for (let start = 0; start < message.content.length; start += 2400) {
            parts.push({ text: message.content.slice(start, start + 2400), id: message.id })
          }
          return parts
        })
        .filter((part) => part.text.trim())
    : []

  const run = async () => {
    if (
      !session ||
      !imported ||
      ledger?.done ||
      !roleId ||
      busy ||
      !useSettings.getState().apiKey
    ) {
      return
    }
    const current = useCompanion.getState().distillations[session.id]
    if (current?.done || (current && current.roleId !== roleId)) {
      return
    }
    useCompanion.setState((state) => ({
      distillations: {
        ...state.distillations,
        [session.id]: current ?? { roleId, next: 0, done: false },
      },
    }))
    cancel.current = false
    setBusy(true)
    const before = new Set(useCompanion.getState().cards.map((card) => card.id))
    let processed = current?.next ?? 0
    try {
      for (const chunk of chunks.slice(processed)) {
        if (cancel.current) {
          break
        }
        setResult('正在提炼 ' + (processed + 1) + ' / ' + chunks.length)
        await extractMemories(roleId, chunk.text, session.id, chunk.id, {
          allowed: () => !cancel.current,
        })
        if (useMemoryJobs.getState().jobs[roleId] === 'error') {
          throw new Error('提炼请求失败。已生成的卡片已保存，可以稍后重试，重复内容会跳过。')
        }
        processed++
        useCompanion.setState((state) => ({
          distillations: {
            ...state.distillations,
            [session.id]: { roleId, next: processed, done: false },
          },
        }))
      }
      const count = useCompanion
        .getState()
        .cards.filter((card) => card.roleId === roleId && !before.has(card.id)).length
      if (!cancel.current) {
        useCompanion.setState((state) => ({
          distillations: {
            ...state.distillations,
            [session.id]: { roleId, next: processed, done: true, completedAt: Date.now() },
          },
        }))
      }
      setResult((cancel.current ? '已停止。' : '提炼完成。') + '新增 ' + count + ' 张记忆卡。')
    } catch (error) {
      setResult(error instanceof Error ? error.message : '提炼失败。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="remember-distill">
      {!imported && <p role="status">仅导入的会话支持一次性提炼。日常聊天通过自动记忆积累。</p>}
      {ledger?.done && (
        <p role="status">
          已提炼到 {roles.find((role) => role.id === ledger.roleId)?.name ?? '所选角色'}
          ，此会话已完成提炼。
        </p>
      )}
      <h2>{session?.title || '请先打开一个会话'}</h2>
      <div className="remember-distill-target">
        <p>保存到角色</p>
        <RoleSelect value={roleId} disabled={busy || Boolean(ledger)} onChange={setRoleId} />
      </div>
      <p>
        提炼当前分支中用户明确说过的事实，按维度保存到所选角色。现有记忆会保留，重复文本会跳过。
      </p>
      <p>
        当前需要 {chunks.length} 次提取请求，会调用 DeepSeek 并产生费用。附件内容和 AI
        的回答不用于生成用户事实。
      </p>
      <button
        type="button"
        disabled={
          !imported ||
          ledger?.done ||
          !roleId ||
          busy ||
          !chunks.length ||
          !useSettings.getState().apiKey
        }
        onClick={() => void run()}
      >
        {ledger?.done ? '已提炼' : ledger ? '继续提炼' : '开始提炼'}
      </button>
      {busy && (
        <button
          type="button"
          onClick={() => {
            cancel.current = true
          }}
        >
          停止提炼
        </button>
      )}
      <p role="status">{result}</p>
    </div>
  )
}
