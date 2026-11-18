import { mitLicense } from '../../app/license.js'

const studio = new URL('../../app/tinglan-studio.png', import.meta.url).href
export const appVersion =
  document.querySelector('meta[name="application-version"]')?.getAttribute('content') ?? '未知版本'

export function AboutPage() {
  return (
    <article className="remember-about">
      <img className="remember-studio-art" src={studio} alt="听岚 studio，金色山峰与云海" />
      <div className="remember-about-identity">
        <h1>
          记得 <span>Remember</span>
        </h1>
        <p>听岚工作室·吟游诗人洛米鸡</p>
        <small>版本 {appVersion}</small>
      </div>
      <section>
        <h2>源自开源，继续开源</h2>
        <p>
          本项目基于 DeepSeek 开源项目 chat-demo
          重构与扩展，以角色和记忆为核心，探索更有温度的日常对话。感谢 DeepSeek 提供的开源代码与 API
          服务。
        </p>
        <p>
          上游代码和本项目源码遵循 MIT 许可证。保留 DeepSeek 原始版权声明与许可文本，允许依照 MIT
          条款使用、修改和分发。
        </p>
        <a href="https://github.com/deepseek-ai/chat-demo" target="_blank" rel="noreferrer">
          DeepSeek chat-demo ↗
        </a>
        <a href="https://github.com/luomiluomi/Remember" target="_blank" rel="noreferrer">
          记得 · GitHub 源码 ↗
        </a>
      </section>
      <details className="remember-license">
        <summary>MIT 许可证全文</summary>
        <pre>{mitLicense}</pre>
      </details>
      <footer>听岚工作室 · 2026</footer>
    </article>
  )
}
