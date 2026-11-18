import { useState, useRef } from 'react'
import { Modal } from '../base/Modal.js'
import { IconChevronDownOutline14 } from '../base/icons.js'
import { basic, useCompanion, roleAvatarSrc, type Role } from '../../services/chat/companion.js'

export function RoleAvatar({ role }: { role: Role }) {
  const avatar = roleAvatarSrc(role)
  return avatar ? (
    <img className="remember-avatar" alt="" src={avatar} />
  ) : (
    <span className="remember-avatar remember-avatar-initial">{role.name.slice(0, 1)}</span>
  )
}
export function RoleSelect({
  value: active,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const roles = useCompanion((s) => s.roles)
  const [open, setOpen] = useState(false)
  const current = roles.find((role) => role.id === active)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <div className="remember-roles">
      <button
        ref={trigger}
        disabled={disabled}
        type="button"
        className="remember-role-trigger"
        aria-label="选择聊天角色"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {current && <RoleAvatar role={current} />}
        <span>{current?.name || '选择角色'}</span>
        <span className="remember-role-chevron" aria-hidden="true"><IconChevronDownOutline14 /></span>
      </button>
      {open && (
        <Modal title="选择聊天角色" closable className="remember-role-choice" onClose={close}>
          <div className="remember-role-options">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                aria-pressed={active === role.id}
                onClick={() => {
                  onChange(role.id)
                  close()
                }}
              >
                <RoleAvatar role={role} />
                <span>
                  <strong>{role.name}</strong>
                  <small>
                    {role.id === basic.id && !role.prompt
                      ? 'DeepSeek 基础角色'
                      : role.gender || '聊天伙伴'}
                  </small>
                </span>
                <span className="remember-role-check" aria-hidden="true">
                  {active === role.id ? '✓' : ''}
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
