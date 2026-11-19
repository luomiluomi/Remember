import { useRef, type Dispatch, type SetStateAction } from 'react'
import { basic, type Role } from '../../services/chat/companion.js'
import { readAvatar } from './ProfileSetting.js'
import { RoleAvatar } from './RoleSelect.js'
import { showToast } from '../base/toastState.js'

export function RoleEditorFields({
  role,
  onChange,
}: {
  role: Role
  onChange: Dispatch<SetStateAction<Role>>
}) {
  const file = useRef<HTMLInputElement>(null)
  const isDefault = role.id === basic.id
  return (
    <>
      <div className="memory-role-intro">
        <button
          type="button"
          className="memory-role-portrait"
          aria-label="更换角色头像"
          disabled={isDefault}
          onClick={() => file.current?.click()}
        >
          <RoleAvatar role={{ ...role, name: role.name || '新' }} />
        {!isDefault && <span className="memory-avatar-edit-label">编辑</span>}
        </button>
        <div>
          <h2>{isDefault ? 'DeepSeek' : role.name || '新的聊天伙伴'}</h2>
          <p>{isDefault ? '官方基础角色' : '为这个角色赋予独特的相处方式'}</p>
          {!isDefault && role.avatar && (
            <button
              type="button"
              className="memory-text-link"
              onClick={() => onChange({ ...role, avatar: '' })}
            >
              移除头像
            </button>
          )}
        </div>
        <input
          type="file"
          hidden
          ref={file}
          accept="image/png,image/jpeg,image/webp"
          aria-label="角色头像图片"
          onChange={async (event) => {
            const picked = event.target.files?.[0]
            event.target.value = ''
            if (!picked) {
              return
            }
            const id = role.id
            try {
              const avatar = await readAvatar(picked)
              onChange((previous) => (previous.id === id ? { ...previous, avatar } : previous))
            } catch (error) {
              showToast(error instanceof Error ? error.message : '头像读取失败')
            }
          }}
        />
      </div>
      {!isDefault ? (
        <>
          <section className="memory-form-section">
            <h3>基本资料</h3>
            <div className="memory-form-surface">
              <label>
                角色昵称
                <input
                  required
                  maxLength={40}
                  value={role.name}
                  placeholder="怎么称呼这位伙伴"
                  onChange={(event) => onChange({ ...role, name: event.target.value })}
                />
              </label>
              <label>
                性别 <small>选填</small>
                <input
                  maxLength={30}
                  value={role.gender}
                  placeholder="由你定义"
                  onChange={(event) => onChange({ ...role, gender: event.target.value })}
                />
              </label>
            </div>
          </section>
          <section className="memory-form-section">
            <h3>相处方式</h3>
            <div className="memory-form-surface">
              <label>
                人设提示词
                <textarea
                  rows={7}
                  maxLength={3000}
                  value={role.prompt}
                  placeholder="描述角色的性格、说话方式，以及你希望如何相处…"
                  onChange={(event) => onChange({ ...role, prompt: event.target.value })}
                />
              </label>
              <p className="memory-field-hint">
                这里描述角色自己。关于你的信息，会保存在这个角色的记忆里。
              </p>
              <small className="memory-field-count">{role.prompt.length} / 3000</small>
            </div>
          </section>
        </>
      ) : (
        <p className="memory-field-hint">
          保持 DeepSeek 默认对话风格，不添加自定义人设。你仍可单独开启自动记忆。
        </p>
      )}
      <section className="memory-form-section">
        <h3>记忆偏好</h3>
        <div className="memory-form-surface">
          <div className="remember-setting-row">
            <div>
              <span>自动记忆</span>
              <p className="memory-field-hint">记住你明确表达的重要信息</p>
            </div>
            <button
              type="button"
              className="remember-switch"
              role="switch"
              aria-label="自动记忆"
              aria-checked={role.auto}
              onClick={() => onChange({ ...role, auto: !role.auto })}
            >
              <span />
            </button>
          </div>
          <p className="memory-api-caption">
            开启后，聊天结束时会额外调用 DeepSeek
            整理记忆，使用账户额度。生成的记忆可随时查看、修改或停用。
          </p>
        </div>
      </section>
    </>
  )
}
