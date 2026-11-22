import { appVersion } from './AboutPage.js'

const updates = [
  {
    version: '0.4.0-preview', date: '2026-11-22', title: '屏幕陪伴，按需开启',
    items: ['合并屏幕陪伴，默认关闭，从具体对话启动。', '圆形头像、气泡、小窗文字与语音输入，支持暂停和安静陪伴。', '修复顶部操作越界和记忆提炼错误提示。'],
  },
  {
    version: '0.3.18-preview',
    date: '2026-11-19',
    title: '让长对话的节奏由你掌握',
    items: [
      '自动压缩可开关，支持 64K、128K、256K、512K 档位与 32K–800K 自定义阈值。',
      '最近保留消息可调整为 8–200 条，默认 32 条。',
      '压缩仅替换发送给 AI 的早期上下文，原始聊天记录保持完整。',
      '统一压缩设置的纵向布局、主题色与用量提醒。',
    ],
  },
  {
    version: '0.3.17-preview',
    date: '2026-11-19',
    title: '让历史更好查找',
    items: [
      '30 天前的对话统一默认折叠，展开后保留月份分组与数量。',
      '搜索时自动展示匹配的旧对话，清空搜索后恢复折叠选择。',
    ],
  },
  {
    version: '0.3.16-preview',
    date: '2026-11-19',
    title: '让每个页面保持同一种节奏',
    items: [
      '新增独立版本更新记录页。',
      '设置按外观、对话、账户与应用分组，统一控件与留白。',
      '重新设计角色设置，集中呈现头像、资料、人设与记忆偏好。',
    ],
  },
  {
    version: '0.3.15-preview',
    date: '2026-11-19',
    title: '应用入口',
    items: [
      '支持切换原应用入口的内置名称与图标。',
      '移除自定义快捷方式功能，保留“记得”和“Memory”两套方案。',
    ],
  },
  {
    version: '0.3.13–0.3.14',
    date: '2026-11-19',
    title: '阅读与个性化',
    items: [
      '聊天正文支持 14–24 px 字号、即时预览和恢复默认。',
      '试验桌面快捷方式，并补充权限引导与添加状态检查。',
    ],
  },
  {
    version: '0.3.12-preview',
    date: '2026-11-19',
    title: '独立的记忆详情',
    items: [
      '记忆卡点击后打开独立详情页，支持来源查看、编辑、启停与删除。',
      '应用英文名改为 Memory，中文名保持“记得”。',
    ],
  },
  {
    version: '0.3.10–0.3.11',
    date: '2026-11-19',
    title: '更一致的交互',
    items: [
      '增加回车发送／换行设置。',
      '统一维度、语言、位置与音色选择器，以及角色头像和开关控件。',
      '增加额外 API 用量说明与费用提示。',
    ],
  },
  {
    version: '0.3.9-preview',
    date: '2026-11-19',
    title: '更清晰的记忆与身份',
    items: [
      '修复管理页面滚动内容穿过标题栏的问题。',
      '记忆使用第三人称摘要及独立原文证据，支持相关卡片合并。',
      '增加特性、情绪支持维度与长对话压缩摘要机制。',
    ],
  },
  {
    version: '0.3.8-preview',
    date: '2026-11-18',
    title: '首次开源预览',
    items: [
      '公开源码及 Android 预览版，保留 DeepSeek MIT 版权和许可证。',
      '新增关于页，展示听岚工作室署名、版本及开源来源。',
      '包含角色卡、多维记忆、历史导入与提炼、语音和 API 余额查询。',
    ],
  },
]

export function VersionHistoryPage() {
  return (
    <article className="memory-version-history">
      <div className="memory-version-intro">
        <span>Memory · 记得</span>
        <h1>一点一点，更好相处。</h1>
        <p>当前版本 {appVersion}</p>
      </div>
      {updates.map((update, index) => (
        <section className="memory-version-entry" key={update.version}>
          <div className="memory-version-meta">
            <span>{update.version}</span>
            <time dateTime={update.date}>{update.date}</time>
            {index === 0 && <small>当前版本</small>}
          </div>
          <h2>{update.title}</h2>
          <ul>
            {update.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  )
}
