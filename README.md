# DeepSeek 搜索

调用 [DeepSeek Search API](https://api-docs.deepseek.com/zh-cn/guides/search/) 的轻量搜索网站。API Key 只保留在服务端，浏览器永远不会接触到它。

## 功能

- 实时网页搜索，展示标题、摘要、站点、日期、相关度与权威性标记
- 高级筛选：精确短语、排除词、包含/排除站点、语言、发布时间范围
- 自动拼装 DeepSeek 查询语法（`site:`、`lang:`、`after:` 等），并显示最终查询
- 搜索历史与收藏（仅保存在本机 localStorage，可导出/导入 JSON 备份）
- 深色模式（跟随系统 / 浅色 / 深色），刷新不闪烁
- 键盘快捷键：`/`、`Ctrl/⌘ K`、`j` / `k`、`Enter`、`f`、`Esc`、`?`
- 可选的访问密码、按 IP 限流、每日额度与内存缓存，适合部署到公网
- 无需 API Key 的 Mock 模式，便于开发和验收 UI

## 技术栈

Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS 4，全部运行在一个 Node 进程中。

## 快速开始

需要 Node.js 20.9+（推荐 22）。

```bash
npm install
cp .env.example .env.local
```

先不花一分钱，用 Mock 数据启动：

```bash
# .env.local
MOCK_SEARCH=1

npm run dev
```

打开 <http://localhost:3000>，搜索任意词即可看到 8 条示例结果。特殊关键词 `__empty__` 和 `__error__` 可分别触发空结果与错误状态。

### 使用真实 API

1. 在 [DeepSeek 开放平台](https://platform.deepseek.com/) 创建 API Key。
2. 编辑 `.env.local`：

```dotenv
DEEPSEEK_API_KEY=sk-...
MOCK_SEARCH=0
```

3. 重启 `npm run dev`。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 空 | 真实搜索必填；只会在服务端使用 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 上游地址 |
| `MOCK_SEARCH` | `0` | 设为 `1` 使用本地假数据，不调用 API |
| `ACCESS_PASSWORD` | 空 | 设置后全站需要密码登录 |
| `COOKIE_SECURE` | 自动 | `1` 强制 Secure Cookie，`0` 强制关闭 |
| `RATE_LIMIT_PER_MINUTE` | `20` | 每 IP 每分钟搜索请求数，`0` 不限 |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | `5` | 每 IP 每分钟登录尝试数 |
| `DAILY_SEARCH_LIMIT` | `0` | 全站每日付费搜索上限，`0` 不限 |
| `SEARCH_CACHE_TTL_MS` | `300000` | 成功结果的缓存时间（毫秒），`0` 禁用 |
| `TRUST_CF_CONNECTING_IP` | `0` | 仅在 Cloudflare Workers 上设为 `1`，信任平台写入的 `CF-Connecting-IP` |
| `ALLOWED_DEV_ORIGINS` | 空 | 仅开发模式：允许加载 HMR 资源的额外主机名（逗号分隔，不含协议/端口） |

`.env.local` 已被 `.gitignore` 忽略，不要提交真实 Key 或密码。

## 搜索语法

高级筛选会自动拼装这些操作符。你也可以直接在搜索框里输入：

| 语法 | 示例 | 说明 |
| --- | --- | --- |
| `site:` | `DeepSeek site:github.com` | 限定站点；多个站点用 `site:a OR site:b` |
| `-site:` | `DeepSeek -site:example.com` | 排除站点 |
| `-词` | `DeepSeek -广告` | 排除关键词 |
| `-"短语"` | `DeepSeek -"release notes"` | 排除短语 |
| `"短语"` | `DeepSeek "精确短语"` | 精确匹配 |
| `lang:` | `DeepSeek lang:zh,en` | 限定语言，逗号分隔 |
| `after:` / `before:` | `after:2025` 或 `after:2025-01-01` | 限定发布日期 |

最终 query 最多 128 个 Unicode 字符（操作符也计入）。界面会实时显示长度并在超限时阻止提交。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建（输出 standalone） |
| `npm run start` | 启动生产构建 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | Vitest 单元测试 |

## 部署

### Vercel

1. 导入仓库，设置 `DEEPSEEK_API_KEY`、`ACCESS_PASSWORD` 等环境变量。
2. 不要设置 `MOCK_SEARCH=1`。
3. 建议设置 `DAILY_SEARCH_LIMIT` 作为额度兜底。

注意：本项目的内置限流和缓存是**进程内存**实现，在 Vercel 等 Serverless 平台上每个实例各自独立，只能作为粗略保护。公网部署时请务必设置访问密码、设置每日上限，并在 DeepSeek 控制台关注余额。

### Cloudflare Workers（免费版）

项目已包含 OpenNext Cloudflare 配置（`wrangler.jsonc`、`open-next.config.ts`），使用 Workers 免费计划即可运行。免费版限制：每天 100,000 请求、每次请求 10ms CPU、50 个子请求；所有路由都是动态的，使用 dummy 增量缓存，**不需要 R2**。

```bash
npm install
npx wrangler login          # 或设置 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
npm run cf:build            # 本地构建验证
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put ACCESS_PASSWORD
npm run cf:deploy
```

- `DEEPSEEK_API_KEY`、`ACCESS_PASSWORD` 必须用 `wrangler secret put` 设置，不要写进 `wrangler.jsonc` 或提交到仓库。
- 默认地址是 `https://ai-search.<你的 workers.dev 子域>.workers.dev`。绑定自定义域名时，在 `wrangler.jsonc` 增加 `routes`（域名需已托管在 Cloudflare）。
- `wrangler.jsonc` 已设置 `TRUST_CF_CONNECTING_IP=1`，按 IP 限流读取平台写入的 `CF-Connecting-IP`，避免客户端伪造 `X-Forwarded-For`。该变量在其他环境必须保持 `0`。
- 注意：限流、缓存和 `DAILY_SEARCH_LIMIT` 是进程内存实现，在 Workers 上每个 isolate 各自独立，只能作为粗略保护。公网部署请设置访问密码，并给 DeepSeek 账户设置消费上限；需要全局限额时建议接入 D1/KV。
- 免费版每次请求只有 10ms CPU，SSR/鉴权较重时可能触发 `1102`；流量上来后可升级 Workers Paid（$5/月）。
- Cloudflare 免费版没有中国大陆节点，主要用户在国内时访问速度可能不如现有 VPS。

### Docker

```bash
docker build -t ai-search .
docker run --rm -p 3000:3000 --env-file .env.local ai-search
```

镜像基于 `next.config.ts` 的 `output: "standalone"` 构建，以非 root 用户运行，并通过 `/api/health` 做健康检查。若在本地用 HTTP 访问，认证 Cookie 会自动使用非 Secure 模式；也可显式设置 `COOKIE_SECURE=0`。

## 安全与费用

- API Key 只在服务端读取，构建产物和前端代码中不会出现。
- 设置 `ACCESS_PASSWORD` 后，未登录的页面请求会跳转到 `/login`，API 请求返回 401。登录 Cookie 为 HttpOnly，值为密码的 SHA-256 派生串，修改密码会使旧 Cookie 失效。
- 搜索按**成功请求次数**计费（官方价格：每 1000 次成功请求 ¥5，`count` 不影响单价）。本项目通过防重复提交、内存缓存、按 IP 限流和可选的每日上限来降低费用。
- 按 IP 限流默认读取 `X-Forwarded-For` 的第一个地址（`TRUST_CF_CONNECTING_IP=1` 时改用 `CF-Connecting-IP`）。若直接暴露 Node 端口，客户端可以伪造该头绕过限流；请放在 Nginx/Caddy 等反向代理之后，由代理覆盖并写入真实来源地址，同时保留访问密码和每日上限作为兜底。
- 第三方站点图标由浏览器直接加载，使用 `referrerPolicy="no-referrer"`；图标加载失败时显示首字母占位。
- 历史与收藏保存在浏览器 localStorage，不会上传到服务器。可在历史/收藏面板中导出 JSON 备份；导入时会校验结构、只接受 `http(s)` 链接，并与现有数据按查询签名/URL 去重合并。
- 浏览器清理站点数据后本地历史/收藏会丢失；导出备份可在清理后或换浏览器时手动恢复。

## 项目结构

```
src/
  app/                 # 页面与 API 路由（search/login/logout/health）
  components/          # 搜索、筛选、结果卡片、面板等 UI
  hooks/use-hotkeys.ts # 全局键盘快捷键
  lib/                 # 查询组装、校验、上游调用、缓存、限流、认证、存储
  proxy.ts             # Next.js 16 Proxy：访问密码保护
tests/                 # 查询组装、校验、认证单元测试
```

## License

MIT
