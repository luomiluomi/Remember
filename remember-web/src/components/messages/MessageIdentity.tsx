import { useChatStore } from '../../services/chat/store.js'
import { getRole, useCompanion, roleAvatarSrc } from '../../services/chat/companion.js'
import { useProfile } from '../session/ProfileSetting.js'

export function MessageIdentity({
  sessionId,
  user = false,
}: {
  sessionId: string
  user?: boolean
}) {
  const roleId = useChatStore((state) => state.sessionCache[sessionId]?.roleId)
  useCompanion((state) => state.roles)
  const profile = useProfile()
  const identity = user ? profile : getRole(roleId)
  const avatar = user ? profile.avatar : roleAvatarSrc(getRole(roleId))
  return (
    <div className="remember-message-identity">
      {avatar ? <img src={avatar} alt="" /> : <span>{identity.name.slice(0, 1)}</span>}
      <strong>{identity.name}</strong>
    </div>
  )
}
