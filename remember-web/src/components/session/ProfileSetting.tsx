import { useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { showToast } from '../base/toastState.js'
import { Menu } from '../base/Menu.js'
import { IconButton } from '../base/IconButton.js'
import { IconEllipsisOutline16, IconTrashOutline16 } from '../base/icons.js'

export const useProfile = create<{ name: string; avatar: string }>()(
  persist(() => ({ name: '我', avatar: '' }), { name: 'remember-profile-v1' })
)

export async function readAvatar(file: File): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new Error('请选择 5 MB 以内的 PNG、JPEG 或 WebP 图片。')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 384
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('无法处理图片。')
    }
    const side = Math.min(bitmap.width, bitmap.height)
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      384,
      384
    )
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    bitmap.close()
  }
}

export function ProfileSetting() {
  const profile = useProfile()
  const [name, setName] = useState(profile.name)
  const input = useRef<HTMLInputElement>(null)
  const dirty = name.trim() !== profile.name && Boolean(name.trim())
  return (
    <section className="remember-account">
      <div className="remember-account-heading">
        <h3>我的资料</h3>
        {profile.avatar && (
          <Menu
            options={[
              {
                key: 'remove-avatar',
                label: '移除头像',
                icon: <IconTrashOutline16 />,
                onSelect: () => useProfile.setState({ avatar: '' }),
              },
            ]}
          >
            {({ toggle }) => (
              <IconButton icon={<IconEllipsisOutline16 />} aria-label="资料选项" onClick={toggle} />
            )}
          </Menu>
        )}
      </div>
      <form
        className="remember-account-card"
        onSubmit={(event) => {
          event.preventDefault()
          if (dirty) {
            try {
              useProfile.setState({ name: name.trim() })
              setName(name.trim())
              showToast('昵称已保存')
            } catch {
              showToast('昵称保存失败，请重试。')
            }
          }
        }}
      >
        <button
          className="remember-account-avatar"
          type="button"
          aria-label="更换我的头像"
          onClick={() => input.current?.click()}
        >
          {profile.avatar ? (
            <img alt="" src={profile.avatar} />
          ) : (
            <span>{profile.name.slice(0, 1)}</span>
          )}
          <span className="remember-account-camera" aria-hidden="true">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M8 6l2-3h4l2 3h4v14H4V6z" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
        </button>
        <input
          ref={input}
          type="file"
          hidden
          aria-label="头像图片"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) {
              return
            }
            try {
              useProfile.setState({ avatar: await readAvatar(file) })
            } catch (error) {
              showToast(error instanceof Error ? error.message : '头像保存失败。')
            }
          }}
        />
        <div className="remember-account-name">
          <div>
            <label htmlFor="remember-profile-name">昵称</label>
            <button
              type="submit"
              disabled={!dirty}
              style={{ visibility: dirty ? 'visible' : 'hidden' }}
            >
              保存
            </button>
          </div>
          <input
            id="remember-profile-name"
            aria-label="我的昵称"
            maxLength={32}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <small>点击头像更换图片</small>
        </div>
      </form>
    </section>
  )
}
