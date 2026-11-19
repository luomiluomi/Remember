import { useState } from 'react'
import { useCompanion, categories } from '../../services/chat/companion.js'
import { Modal } from '../base/Modal.js'
import { Select } from '../base/Select.js'
import { showToast } from '../base/toastState.js'

export function MemoryDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const card = useCompanion((state) => state.cards.find((item) => item.id === id))
  const roles = useCompanion((state) => state.roles)
  const [text, setText] = useState(card?.text ?? '')
  const [category, setCategory] = useState(card?.category ?? categories[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!card) {
    return null
  }
  return (
    <Modal title="记忆详情" closable className="remember-memory-detail" onClose={onClose}>
      <p className="remember-detail-owner">
        {roles.find((role) => role.id === card.roleId)?.name} · {card.active ? '已启用' : '已停用'}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim()) {
            return
          }
          useCompanion.setState((state) => ({
            cards: state.cards.map((item) =>
              item.id === id ? { ...item, text: text.trim(), category } : item
            ),
          }))
          showToast('记忆已保存')
          onClose()
        }}
      >
        <div className="remember-setting-row">
          <span>记忆维度</span>
          <Select
            value={category}
            onChange={setCategory}
            ariaLabel="编辑记忆维度"
            options={categories.map((value) => ({ value, label: value }))}
          />
        </div>
        <label className="remember-detail-label">
          记忆内容
          <textarea
            aria-label="编辑记忆内容"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            maxLength={800}
          />
        </label>
        <small>{text.length} / 800 · 本地编辑，不调用 API</small>
        {card.createdAt && (
          <p className="remember-detail-date">创建于 {new Date(card.createdAt).toLocaleString()}</p>
        )}
        {card.sourceQuote && (
          <details className="remember-detail-source">
            <summary>查看来源原文</summary>
            <p>{card.sourceQuote}</p>
          </details>
        )}
        <div className="remember-detail-actions">
          <button
            type="button"
            onClick={() =>
              useCompanion.setState((state) => ({
                cards: state.cards.map((item) =>
                  item.id === id ? { ...item, active: !item.active } : item
                ),
              }))
            }
          >
            {card.active ? '停用记忆' : '启用记忆'}
          </button>
          <button type="submit">保存修改</button>
        </div>
      </form>
      {confirmDelete ? (
        <div className="remember-detail-delete">
          <p>确定删除这张记忆卡？</p>
          <button type="button" onClick={() => setConfirmDelete(false)}>
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              useCompanion.setState((state) => ({
                cards: state.cards.filter((item) => item.id !== id),
              }))
              onClose()
            }}
          >
            确认删除
          </button>
        </div>
      ) : (
        <button
          className="remember-delete-memory"
          type="button"
          onClick={() => setConfirmDelete(true)}
        >
          删除记忆
        </button>
      )}
    </Modal>
  )
}
