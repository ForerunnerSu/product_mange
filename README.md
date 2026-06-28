# 超市保质期管理（Shelf-Life Manager）

> 手机端 PWA 应用：扫码/手动录入商品、到期自动预警、多设备云端实时同步、离线可用。
> 基于 Firebase + Cloudflare Pages 免费额度，**完全免费**部署。

## 在线访问

- **Cloudflare Pages（推荐，国内直连）**：https://product-mange.pages.dev/
- GitHub Pages（需代理）：https://forerrunnersu.github.io/product_mange/

## 功能特性

### 核心功能
- **首页仪表盘**：商品总数/已过期/即将到期/临近到期/安全 五项统计卡片，点击可跳转商品列表按状态筛选
- **扫码录入**：调用摄像头识别条码（EAN/UPC/Code128 等），自动匹配商品库填入信息
- **手动录入**：商品名称、类别、生产日期+保质期天数自动算到期日、货架位置、备注
- **分级预警**：已过期（红）/ 即将到期 7 天内（橙）/ 临近到期 30 天内（黄）/ 安全（绿）
- **预警管理**：按状态分区展示，支持标记已处理（带确认弹窗防误触）、编辑、导出 CSV
- **商品管理**：列表展示，支持搜索、按类别/状态筛选，每张卡片常驻编辑/已处理/删除按钮
- **商品库**：扫码录入时自动记忆商品信息，下次扫码自动填入

### 数据同步
- **云端实时同步**：Firebase Realtime Database，任一设备操作后其他设备秒级更新
- **跨设备登录**：同一账号可在多台手机/电脑同时登录使用
- **离线可用**：断网时数据存本地，联网后自动合并同步
- **删除墓碑机制**：删除商品时标记云端墓碑，防止其他设备旧缓存恢复已删除数据
- **云端权威同步**：本地商品若不在云端且创建超过60秒，自动判定为已被其他设备删除

### PWA 特性
- **安装到主屏幕**：像原生 App 一样使用，全屏体验
- **离线缓存**：Service Worker 缓存应用外壳，离线可打开
- **自动更新**：检测到新版本自动刷新加载

### 数据管理
- **导入导出**：JSON 格式备份/恢复全量数据
- **预警导出**：CSV 格式导出预警商品清单
- **清空数据**：支持一键清空（带确认）

## 文件结构

```
shelf-life-manager/
├── index.html              # 主应用（单文件，含 HTML/CSS/JS）
├── manifest.json           # PWA 应用清单
├── sw.js                   # Service Worker（离线缓存 v5）
├── icon-512.jpg            # 应用图标
├── .nojekyll               # 禁用 GitHub Pages 的 Jekyll 处理
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions 自动部署到 GitHub Pages
└── README.md               # 本说明文件
```

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           部署层 (CDN)                               │
│                                                                       │
│   GitHub 仓库 ──push──→ ┌──────────────────┐  ┌──────────────────┐  │
│   (ForerunnerSu/        │  GitHub Actions   │  │ Cloudflare Pages │  │
│    product_mange)       │  (deploy.yml)     │  │ (自动监听push)    │  │
│                         └────────┬─────────┘  └────────┬─────────┘  │
│                                  ▼                     ▼            │
│                          github.io/...          pages.dev/...       │
│                         (备用地址)              (主地址,国内快)       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 用户访问 (HTTPS)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        用户设备（手机/电脑）                           │
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  Service Worker  │  │          PWA 应用 (index.html)            │  │
│  │  (sw.js v5)      │  │                                          │  │
│  │                  │  │  ┌────────┐┌────────┐┌────────┐┌──────┐ │  │
│  │ ·离线缓存外壳     │  │  │ 首页   ││ 录入   ││ 商品   ││ 预警 │ │  │
│  │ ·导航优先网络     │  │  │ 仪表盘 ││扫码+手动││ 列表   ││ 管理 │ │  │
│  │ ·自动检测更新     │  │  └────────┘└────────┘└────────┘└──────┘ │  │
│  │ ·PWA可安装主屏    │  │                                          │  │
│  └─────────────────┘  │  ┌─────────────────────────────────────┐  │  │
│                       │  │       原生 JavaScript 业务逻辑        │  │  │
│  ┌─────────────────┐  │  │ ·商品CRUD ·状态计算 ·筛选排序 ·导入导出│  │  │
│  │   Quagga2 库     │  │  └──────────┬──────────────┬──────────┘  │  │
│  │  (条码识别)       │  │             │              │              │  │
│  │ ·摄像头调用       │  │  ┌──────────┴────┐ ┌───────┴──────────┐  │  │
│  │ ·EAN/UPC/Code128 │  │  │  localStorage  │ │ Firebase JS SDK   │  │  │
│  │ ·自动填入表单     │  │  │  (本地缓存)    │ │ (云端同步层)       │  │  │
│  └─────────────────┘  │  │                │ │                    │  │  │
│                       │  │ ·products      │ │ ·on('value')监听   │  │  │
│                       │  │ ·library       │ │ ·按ID粒度写入      │  │  │
│                       │  │ ·deleted_ids   │ │ ·墓碑同步          │  │  │
│                       │  │ ·session       │ │ ·冲突合并(LWW)     │  │  │
│                       │  │ ·users         │ │ ·上传失败重试      │  │  │
│                       │  └────────────────┘ └────────┬───────────┘  │  │
│                       └─────────────────────────────┼───────────────┘  │
└─────────────────────────────────────────────────────┼──────────────────┘
                                                      │ WebSocket 长连接
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Firebase Realtime Database                          │
│                    (云端数据存储 + 实时同步)                            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      users/{username}/                          │ │
│  │  ├── auth/          (账号认证：用户名 + SHA-256 密码哈希)          │ │
│  │  ├── products/      (商品数据：CRUD + 实时推送)                   │ │
│  │  ├── deleted/       (删除墓碑：跨设备同步删除)                     │ │
│  │  └── library/       (商品库：条码 → 商品信息映射)                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 技术栈关联图

```
┌─────────────────────────────────────────────────────────────────┐
│  开发者编写代码 → git push → GitHub 仓库                          │
│                                │                                  │
│                    ┌───────────┴───────────┐                     │
│                    ▼                       ▼                      │
│             GitHub Actions          Cloudflare Pages             │
│             自动构建部署              自动监听push部署              │
│                    │                       │                      │
│                    ▼                       ▼                      │
│             github.io/...          pages.dev/...                 │
│             (备用地址)              (主地址,国内快)               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ 用户访问 (HTTPS)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Service Worker 拦截 → 有网?优先网络 : 返回离线缓存               │
│  PWA Manifest → 可安装到主屏幕                                    │
│  页面渲染 (HTML + CSS + Font Awesome)                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
            ┌────────────┐         ┌──────────────┐
            │  Quagga2   │         │  用户操作     │
            │  扫码识别   │         │  手动录入     │
            │  →自动填表  │         │              │
            └─────┬──────┘         └──────┬───────┘
                  └────────┬──────────────┘
                           ▼
              localStorage 即时保存 + UI更新
                           │
                           ▼
              Firebase SDK 上传云端 (带重试)
                           │
                           ▼
              on('value') 推送所有在线设备
```

### 数据流向图

```
              ┌───────────┐
              │  设备 A    │
              │ (操作端)   │
              └─────┬─────┘
                    │ 添加/编辑/删除
          ┌─────────┴─────────┐
          ▼                   ▼
  ┌───────────────┐   ┌───────────────┐
  │  localStorage  │   │   Firebase     │
  │  即时更新UI    │   │  按ID粒度写入   │
  └───────────────┘   └───────┬───────┘
                              │ WebSocket 推送
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ 设备 B    │    │ 设备 C    │    │ 设备 D    │
        │ (电脑)    │    │ (手机2)   │    │ (平板)    │
        └─────┬────┘    └─────┬────┘    └─────┬────┘
              └────────┬──────┴───────────────┘
                       ▼
            ┌────────────────────────┐
            │  on('value') 监听触发   │
            │                        │
            │  合并策略:              │
            │  · 跳过墓碑(已删除)     │
            │  · LWW: 最后修改优先    │
            │  · 云端权威: 本地缺失   │
            │    超60秒视为已删除     │
            └───────────┬────────────┘
                        ▼
            更新 localStorage + 刷新UI
```

### 删除同步流程图

```
  设备A删除商品           云端Firebase           其他设备(B/C/D)
  ─────────────  ──────────────────  ──────────────────

  ① 本地删除商品
     + 标记墓碑 ──→ ② products/{id} 删除
                   ② deleted/{id} 写入墓碑
                                     │
                                     │ ③ on('value')监听触发
                                     ▼
                                     ④ 收到墓碑
                                     + 合并到本地墓碑
                                     + 删除本地商品
                                     + 刷新UI

  ※ 墓碑7天过期自动清理，防止无限增长
  ※ 商品新增/编辑时清除对应墓碑
```

### 前端

- **原生 HTML/CSS/JavaScript**：无构建步骤，无框架依赖，单文件应用
- **CSS 自定义属性**：主题色统一管理，彩色边框区分功能区块
- **响应式设计**：移动端优先，适配各种手机屏幕

### 后端服务

- **Firebase Realtime Database**：云端数据存储与实时同步
- **无服务端逻辑**：所有业务逻辑在客户端完成

### 第三方库

- **Firebase JS SDK 10.12.0**：云端数据库实时同步
- **Quagga2**：条码识别（EAN/UPC/Code128 等）
- **Font Awesome 6.5.1**：图标库

### 部署平台

- **Cloudflare Pages**（主部署）：全球 CDN，国内访问较快
- **GitHub Pages**（备用）：GitHub Actions 自动部署
- **Vercel**（备用）：可选部署平台

## 数据结构

### Firebase Realtime Database

```
users/
  └── {username}/
      ├── auth/
      │   ├── username: string
      │   ├── passwordHash: string (SHA-256)
      │   └── createdAt: number
      ├── products/
      │   └── {productId}/
      │       ├── name: string
      │       ├── category: string
      │       ├── barcode: string
      │       ├── prodDate: string (YYYY-MM-DD)
      │       ├── shelfLife: number (天数)
      │       ├── expiryDate: string (YYYY-MM-DD)
      │       ├── shelf: string (货架位置)
      │       ├── notes: string
      │       ├── handled: boolean
      │       ├── createdAt: number (时间戳)
      │       └── updatedAt: number (时间戳)
      ├── deleted/
      │   └── {productId}: number (删除时间戳，墓碑)
      └── library/
          └── {barcode}/
              ├── name: string
              ├── category: string
              ├── shelfLife: number
              └── updatedAt: number
```

### 本地存储（localStorage）

| Key | 说明 |
|-----|------|
| `shelflife_products` | 本地商品数据（JSON 数组） |
| `shelflife_library` | 商品库（条码 → 商品信息） |
| `shelflife_deleted_ids` | 已删除商品ID（墓碑，7天过期） |
| `shelflife_users` | 本地用户（用户名 → 密码哈希） |
| `shelflife_session` | 当前登录会话 |
| `shelflife_last_sync` | 最后同步时间 |
| `shelflife_sync_status` | 同步状态 |

## 同步机制

### 实时同步
- Firebase `on('value')` 监听 `products` 和 `deleted` 节点
- 任一设备数据变化，所有连接的设备秒级收到更新

### 冲突解决
- **商品更新**：基于 `updatedAt` 时间戳，最后修改优先（Last Write Wins）
- **商品删除**：墓碑机制，标记删除的商品不会被任何设备恢复
- **跨设备删除**：墓碑同步到云端，其他设备监听到墓碑后自动删除本地商品
- **云端权威**：本地商品若不在云端且创建超过60秒，视为已被其他设备删除

### 安全措施
- 密码 SHA-256 哈希存储（不存明文）
- 商品ID、条码等用户输入在拼接 onclick 时做 `escapeJs` 转义防 XSS
- 退出登录时清除本地所有数据
- Firebase 初始化防重复调用守卫
- 商品上传失败自动重试（最多3次）
- `syncLocalToCloud` 按ID粒度写入，避免全量覆盖其他设备新增数据

## 部署步骤

### 第 1 步：配置 Firebase

1. 打开 https://console.firebase.google.com ，登录 Google 账号
2. 点击「添加项目」，创建项目
3. 进入 **Realtime Database** → 创建数据库（测试模式）
4. 进入 **项目设置** → 注册 Web 应用，获取配置信息
5. 打开 `index.html`，搜索 `firebaseConfig`，替换为你的配置：

```javascript
const firebaseConfig = {
    apiKey: "你的API Key",
    databaseURL: "https://你的项目-default-rtdb.firebaseio.com",
    // ...其他配置
};
```

6. 进入 **Realtime Database** →「规则」，粘贴以下规则并发布：

```json
{
  "rules": {
    "users": {
      "$username": {
        ".read": true,
        ".write": true,
        "products": { ".indexOn": ["expiryDate", "handled", "category"] },
        "deleted": { ".indexOn": [".value"] }
      }
    }
  }
}
```

### 第 2 步：推送到 GitHub

```bash
cd shelf-life-manager
git init
git add .
git commit -m "超市保质期管理 PWA 应用"
git branch -M main
git remote add origin https://github.com/你的用户名/product_mange.git
git push -u origin main
```

### 第 3 步：部署到 Cloudflare Pages（推荐）

1. 打开 https://dash.cloudflare.com → Workers & Pages
2. 点击 Create → Pages 标签 → Connect to Git
3. 选择你的 GitHub 仓库
4. 配置：
   - Framework preset: None
   - Build command: 留空
   - Build output directory: `/`
5. 点击 Save and Deploy

### 第 4 步：使用

1. 访问部署地址，注册账号
2. 手机浏览器「添加到主屏幕」安装为 App
3. 多台设备用同一账号登录，数据自动同步

## 本地预览

```bash
# Python
python -m http.server 8080

# Node
npx serve
```

浏览器访问 `http://localhost:8080`

> Service Worker 仅在 HTTPS 或 localhost 下生效。

## 常见问题

**Q：扫码用不了？**
A：需 HTTPS 环境和摄像头权限。Cloudflare Pages 默认 HTTPS，手机访问时允许摄像头权限即可。

**Q：数据不同步？**
A：① 确认 `firebaseConfig` 已正确配置；② 确认数据库规则已发布；③ 首页右上角云图标为绿色表示已连接。

**Q：删除的商品又出现了？**
A：已通过墓碑机制修复。若仍出现，清除浏览器缓存后重新访问，确保加载到最新版本（SW缓存 v5+）。

**Q：手机和电脑数据不一致？**
A：等几秒让实时同步触发。若仍不一致，清除浏览器缓存重新加载。

**Q：忘记密码？**
A：本地账号密码无法找回（仅存哈希）。可重新注册新账号。

**Q：多设备同时登录？**
A：支持。同一账号可在多台设备同时使用，数据实时同步。

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | 原生 HTML/CSS/JavaScript（单文件，无框架） |
| 数据库 | Firebase Realtime Database |
| 条码识别 | Quagga2 |
| 图标 | Font Awesome 6.5.1 |
| PWA | Service Worker + Web App Manifest |
| 部署 | Cloudflare Pages / GitHub Pages |
| CI/CD | GitHub Actions |

## 版本历史

- **v5**（当前）：修复5个高危漏洞（双重初始化/XSS/退出清理/全量覆盖/上传重试）
- **v4**：云端权威同步，本地商品不在云端且创建超60秒自动删除
- **v3**：云端墓碑同步，跨设备删除商品不再恢复
- **v2**：首页统计卡片可点击跳转筛选，编辑删除按钮常驻显示
- **v1**：基础功能，扫码录入、预警管理、云端同步
