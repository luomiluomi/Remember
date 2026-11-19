# 记得 · Memory

以角色和记忆为核心的陪伴型 AI 聊天工具。无需自建后端，使用自己的 DeepSeek API Key，直接连接官方 API。

**听岚工作室·吟游诗人洛米鸡** · 当前版本 **0.3.17-preview** · [MIT 许可证](LICENSE)

![听岚工作室](remember-web/src/app/tinglan-studio.png)

## 下载与使用

在 [Releases](https://github.com/luomiluomi/Remember/releases) 下载 Android 预览版 APK，安装后在「设置 → 数据管理」填写 API Key。API 费用由你的 DeepSeek 账户承担；余额可在设置中查询。「设置 → 关于应用」提供独立的版本更新记录、署名、开源来源与完整许可证。

当前 Android 版本使用 **React / TypeScript 静态前端 + Java WebView 容器**。根目录的 Flutter 工程是早期基础原型，并非当前 Android 安装包的实现。

## 功能

- 主题配色、个人头像与昵称；带头像的角色选择，角色卡独立管理。默认 DeepSeek 固定官方名称和 Logo，不附加自定义人设，允许开启自动记忆。
- 继承并扩展 DeepSeek chat-demo 的多会话、自动标题、重命名与删除、编辑问题、重新生成、消息分支、流式输出、深度思考、联网搜索、链接阅读与来源引用、停止与符合条件的续写、附件及 Markdown / 代码 / KaTeX / Mermaid 渲染。
- 语音输入、朗读与自动朗读；移动端空白输入区长按说话、录音声波。语音识别、语音合成和附件等能力需要相应 DeepSeek API 可用。
- 导入符合上游 ZIP v3 结构的 DeepSeek 历史对话。每个导入会话可手动提炼到已有角色，成功后标记，当前设备禁止重复提炼，中断后可继续。
- 记忆按角色隔离，分为偏好、日常、人际、经历、目标、沟通方式、特性、情绪支持。日常对话可自动提取原文支持的长期信息，回复前按维度选择相关记忆，每维度最多两张，总计最多六张。支持手动维护与来源查看，详见 [记忆设计](docs/memory-design.md)。

- 30 天前的对话默认折叠，支持手动展开；搜索时自动展示命中的旧对话。
- 独立的记忆详情、版本更新记录页，按模块分组的设置与角色编辑页。
- 支持回车发送／换行、14–24 px 聊天字号以及内置的原应用入口图标和名称切换。
- 长对话可自动生成独立上下文摘要并显示提示；相关说明及限制见 [记忆设计](docs/memory-design.md)。

## 数据与限制

聊天与附件存于 IndexedDB；API Key、个人资料、角色、记忆和提炼标记存于当前设备的站点本地存储，未加密。使用聊天、搜索、附件、语音或记忆功能时，对应数据会发送给 DeepSeek。没有 Remember 自建后端。

导入历史会覆盖本地会话与附件。上游历史 ZIP **不备份角色、记忆、API Key、角色绑定或提炼标记**；清除应用数据会丢失这些信息。自动记忆与维度选择会产生额外 API 请求与延迟。模型分类、事实提取可能出错，当前不具备语义矛盾自动合并，应在记忆页维护。

## 本地运行 Web

准备 Node.js 22.12+ 和 pnpm：

```powershell
cd remember-web
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://localhost:8090。`pnpm type`、`pnpm lint` 检查代码，`pnpm build` 生成静态目录 `remember-web/dist`。浏览器录音需要 HTTPS 或 localhost，以及麦克风权限。

## 构建 Android 预览版（Windows）

需要 JDK（含 javac）、Android SDK Platform 36、Build Tools 36.0.0 及本机 Android debug keystore。脚本只适用于标准 Android debug key 格式；请勿提交密钥文件。

```powershell
cd remember-web
pnpm install --frozen-lockfile
pnpm build
cd ..
powershell -ExecutionPolicy Bypass -File android-preview/build.ps1 -Sdk "你的 Android SDK 路径"
```

输出为 `build/android-preview/Remember-Android-preview.apk`。当前预览包使用本机 debug key 签名，独立构建的签名不同可能无法覆盖已有安装。正式发布签名和跨设备备份仍待完善。

版本号由 `remember-web/package.json` 写入 Web 页面元数据；Android 的版本号在 `android-preview/AndroidManifest.xml`，发布时保持一致。

## 开源与鸣谢

基于 [DeepSeek chat-demo](https://github.com/deepseek-ai/chat-demo) 提交 `5d5dd754ebc1948e977ddb880a9eb5aa25f37b4c` 重构与扩展，感谢 DeepSeek 的开源贡献。保留 [上游 MIT 许可证](remember-web/LICENSE) 与版权声明；本项目源码采用 [MIT](LICENSE)。第三方依赖仍按各自许可证分发，构建包保留工具生成的许可证文件。

默认 DeepSeek 头像取自 [DeepSeek 官方 GitHub 账号](https://github.com/deepseek-ai)，仅用于标识该基础角色。听岚工作室图片由项目作者提供。DeepSeek 名称和 Logo 不代表对本项目的官方背书。

署名：**听岚工作室·吟游诗人洛米鸡**。
