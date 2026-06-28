# 超市保质期管理（Shelf-Life Manager）

> 手机端 PWA 应用：扫码/手动录入商品、到期自动预警、多设备云端实时同步、离线可用。
> 基于 GitHub Pages + Firebase 免费额度，**完全免费**部署。

## 功能特性

- **5 个标签页**：首页仪表盘、录入（扫码+手动）、商品列表、预警管理、个人中心
- **扫码录入**：调用摄像头识别条码（EAN/UPC/Code128 等），自动填入
- **自动计算**：生产日期 + 保质期天数 → 到期日 / 剩余天数 / 预警状态
- **分级预警**：已过期（红）/ 即将到期 7 天内（橙）/ 临近到期 30 天内（黄）/ 安全（绿）
- **云端同步**：Firebase Realtime Database，手机录入电脑自动可见，支持离线缓存
- **跨设备登录**：同一账号可在任意设备登录并拉取数据
- **PWA 安装**：添加到手机主屏幕，像原生 App 一样使用，支持离线
- **数据导入导出**：JSON 备份 / 预警 CSV 导出

## 文件结构

```
shelf-life-manager/
├── index.html              # 主应用（单文件，含 Firebase 配置占位符）
├── manifest.json           # PWA 应用清单
├── sw.js                   # Service Worker（离线缓存）
├── icon-512.jpg            # 应用图标
├── .nojekyll               # 禁用 GitHub Pages 的 Jekyll 处理
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions 自动部署配置
└── README.md               # 本说明文件
```

---

## 部署步骤

### 第 1 步：配置 Firebase（必做，5 分钟）

1. 打开 https://console.firebase.google.com ，用 Google 账号登录
2. 点击「添加项目」，项目名随意（如 `supermarket-shelf-life`）
3. 创建完成后，进入 **Realtime Database** → 选择「测试模式」创建数据库
4. 进入 **项目设置** →「常规」→「您的应用」→ 点击 `</>` 注册一个 Web 应用
5. 复制弹出的配置代码（包含 `apiKey`、`databaseURL` 等）
6. 用文本编辑器打开 `index.html`，搜索 `YOUR_API_KEY`，定位到 `firebaseConfig` 配置块，把占位符替换成你自己的值：

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXX",           // 替换
    authDomain: "your-project.firebaseapp.com",      // 替换
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",  // 替换
    projectId: "your-project",                       // 替换
    storageBucket: "your-project.appspot.com",       // 替换
    messagingSenderId: "1234567890",                 // 替换
    appId: "1:1234567890:web:abcdef123456"           // 替换
};
```

7. 进入 **Realtime Database** →「规则」，粘贴以下规则并发布（允许应用读写自己的数据）：

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true,
      "$username": {
        ".indexOn": ["categoryId", "expiryDate", "status", "updatedAt"]
      }
    }
  }
}
```

> Firebase 免费额度：1GB 存储 + 每月 10GB 流量，个人/小超市完全够用。

### 第 2 步：推送到 GitHub 仓库

1. 打开 https://github.com ，登录或注册
2. 点击「New repository」，仓库名填 `shelf-life-manager`，**设为 Public**（免费 GitHub Pages 需要公开仓库）
3. 在本地把本目录所有文件推送到该仓库：

```bash
cd shelf-life-manager
git init
git add .
git commit -m "超市保质期管理 PWA 应用"
git branch -M main
git remote add origin https://github.com/你的用户名/shelf-life-manager.git
git push -u origin main
```

### 第 3 步：启用 GitHub Pages（自动部署）

1. 进入仓库的 **Settings** → **Pages**
2. **Source** 选择 `GitHub Actions`（不是 Deploy from a branch）
3. 保存。推送代码后会自动触发 `.github/workflows/deploy.yml` 部署
4. 稍等 1-2 分钟，在仓库 **Actions** 标签页可看到部署进度，绿色对勾即成功

### 第 4 步：访问并安装为 App

1. 部署成功后，访问在线地址：
   ```
   https://你的用户名.github.io/shelf-life-manager/
   ```
2. 手机浏览器打开后，浏览器菜单选择「添加到主屏幕」/「安装应用」
3. 桌面会出现「保质期管理」图标，点开即全屏使用，体验等同原生 App
4. 在手机注册账号、录入商品；电脑浏览器打开同一地址登录同账号，数据自动同步

---

## 本地预览（可选）

无需服务器，直接用浏览器打开 `index.html` 即可预览（基础功能可用）。
但扫码、Service Worker 等功能需要 HTTPS 环境，建议用本地服务器：

```bash
# Python 方式
python -m http.server 8080
# 然后浏览器访问 http://localhost:8080

# 或 Node 方式
npx serve
```

> 注意：Service Worker 仅在 HTTPS 或 `localhost` 下生效。Firebase 云同步需先完成第 1 步配置。

## 数据说明

- **本地存储**：商品数据存于浏览器 `localStorage`，账号密码经 SHA-256 哈希后存储
- **云端存储**：Firebase Realtime Database，结构为 `users/{用户名}/products/{商品id}` 和 `users/{用户名}/auth`
- **离线策略**：有网时自动云端同步；断网时数据存本地，联网后自动合并（按 `updatedAt` 时间戳，最后修改优先）
- **跨设备登录**：在新设备用同一账号密码登录，会自动从云端拉取商品数据

## 常见问题

**Q：扫码用不了？**
A：扫码需要 HTTPS 环境和摄像头权限。GitHub Pages 默认 HTTPS，手机访问时允许摄像头权限即可。部分浏览器需手动开启摄像头权限。

**Q：数据不同步？**
A：① 确认 `firebaseConfig` 已正确填写（不再是 `YOUR_API_KEY`）；② 确认 Realtime Database 规则已发布且允许读写；③ 头部右上角云图标为绿色表示已连接。

**Q：添加到主屏幕后离线打不开？**
A：首次访问需联网（Service Worker 安装并缓存资源），之后再离线即可打开。如仍不行，清除浏览器缓存后重新访问一次。

**Q：忘记密码怎么办？**
A：本地账号密码无法找回（仅存哈希）。可在 Firebase 控制台 `users/{用户名}/auth` 节点查看，或重新注册新账号。

## 技术栈

- 原生 HTML/CSS/JavaScript（无构建步骤，单文件应用）
- Firebase Realtime Database（云同步）
- Quagga2（条码识别）
- Service Worker + Web App Manifest（PWA 离线）
- GitHub Actions + GitHub Pages（免费托管）
