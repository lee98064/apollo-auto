# Apollo Auto

自動化 Apollo HR 系統打卡解決方案，整合排程管理、Telegram 通知與 Chrome 擴充功能。

## 專案簡介

Apollo Auto 是一個完整的自動化打卡系統，能夠自動處理 [Apollo HR (mayohr.com)](https://apollo.mayohr.com) 的上下班打卡，支援彈性的排程設定、工作日選擇、時區管理，並透過 Telegram 即時通知執行狀態。

### 主要功能

- **自動化打卡排程**：設定每日上下班時間，系統自動執行打卡
- **工作日選擇**：彈性選擇星期幾執行任務（例如：僅週一至週五）
- **時區支援**：完整支援多時區，預設為 Asia/Taipei
- **Telegram 通知**：即時推送任務執行結果
- **Cookie 自動更新**：每日自動刷新 Apollo 登入狀態
- **狀態追蹤**：完整記錄每次打卡的執行狀態（成功/失敗/跳過）
- **Chrome 擴充功能**：友善的視覺化介面，輕鬆管理所有設定

## 專案架構

此專案採用前後端分離架構，包含兩個主要子專案：

```
apollo-auto/
├── apollo-auto-server/      # Express.js 後端 API 服務
│   ├── src/
│   │   ├── controller/      # API 控制器
│   │   ├── service/         # 業務邏輯層
│   │   ├── routes/          # 路由定義
│   │   ├── prisma/          # 資料庫 Schema
│   │   ├── swagger/         # OpenAPI 文件
│   │   └── jobManager.ts    # 排程任務管理器
│   └── ...
│
├── apollo-auto-extention/   # Chrome 擴充功能
│   ├── src/
│   │   ├── views/           # Vue 頁面組件
│   │   ├── components/      # UI 組件
│   │   ├── background/      # Service Worker
│   │   └── router/          # 路由配置
│   └── ...
│
├── docker-compose.yaml      # Docker 服務編排
└── CLAUDE.md               # 開發指南
```

### 技術棧

**後端 (apollo-auto-server)**
- Node.js + Express.js
- Prisma ORM + MySQL
- JWT 身份驗證
- node-schedule (排程管理)
- OpenAPI / Swagger (API 文件)
- Telegram Bot API

**前端 (apollo-auto-extention)**
- Vue 3 + Vue Router
- Vite (建置工具)
- Element Plus (UI 框架)
- Chrome Extension APIs

**開發工具**
- Biome (格式化 & Lint)
- Docker + Docker Compose
- GitHub Actions (CI/CD)

## 快速開始

### 前置需求

- Node.js 16+
- Yarn 1.22+
- MySQL 8.0+ (或使用 Docker)
- Chrome 瀏覽器 (用於擴充功能)

### 使用 Docker 快速啟動（推薦）

適合本地開發測試，完整的生產環境部署請參考 [Docker Self-Host 部署指南](#docker-self-host-部署指南)。

```bash
# 1. 複製專案
git clone <repository-url>
cd apollo-auto

# 2. 啟動所有服務（包含 MySQL, phpMyAdmin, API Server）
docker-compose up -d

# 3. 執行資料庫遷移
docker-compose exec apollo-auto-server yarn db:deploy
```

服務啟動後：
- API Server: http://localhost:4000
- API 文件: http://localhost:4000/docs
- phpMyAdmin: http://localhost:8080

**注意：** 預設配置使用弱密碼，僅適合本地測試。生產環境部署請務必修改密碼和 JWT Secret，詳見 [Docker Self-Host 部署指南](#docker-self-host-部署指南)。

### 本地開發環境設定

#### 1. 後端 Server

```bash
cd apollo-auto-server

# 安裝依賴
yarn install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入必要參數

# 生成 Prisma Client
yarn db:generate

# 執行資料庫遷移
yarn db:dev

# 啟動開發伺服器（支援熱重載）
yarn dev
```

#### 2. Chrome 擴充功能

```bash
cd apollo-auto-extention

# 安裝依賴
yarn install

# 開發模式（瀏覽器預覽）
yarn dev

# 建置擴充功能
yarn build
```

**載入擴充功能到 Chrome：**
1. 開啟 Chrome，前往 `chrome://extensions/`
2. 啟用「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 `apollo-auto-extention/dist/` 目錄

## 環境變數設定

### Server (.env)

```bash
# 資料庫連線
DATABASE_URL=mysql://user:password@localhost:3306/apollo_auto

# JWT 設定
JWT_SECRET=your_random_secret_key_here
JWT_ACCESS_TTL=365d

# 排程設定（Cron 格式）
CHECK_IN_JOB_SCHEDULE="*/1 * * * * *"
COOKIE_REFRESH_JOB_SCHEDULE="0 0 12 * * *"

# Apollo 系統
APOLLO_BASE_URL=https://apollo.mayohr.com

# 伺服器設定
PORT=4000
NODE_ENV=development
```

## Docker Self-Host 部署指南

使用 Docker 部署 Apollo Auto 可以獲得以下優點：
- 一鍵啟動完整服務（MySQL + API Server + phpMyAdmin）
- 環境隔離，不影響本機其他服務
- 資料持久化，重啟不丟失資料
- 易於在 VPS、NAS 等環境部署

### 部署步驟

#### 1. 準備伺服器

確保伺服器已安裝：
- Docker 20.10+
- Docker Compose 2.0+

```bash
# 檢查版本
docker --version
docker-compose --version
```

#### 2. 下載專案

```bash
git clone https://github.com/your-username/apollo-auto.git
cd apollo-auto
```

#### 3. 配置環境變數（重要！）

編輯 `docker-compose.yaml`，修改以下重要設定：

```yaml
services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: <請更改為強密碼>
      MYSQL_DATABASE: apollo-auto
      MYSQL_USER: apollo-auto
      MYSQL_PASSWORD: <請更改為強密碼>

  apollo-auto-server:
    environment:
      DATABASE_URL: mysql://apollo-auto:<與上面相同的密碼>@mysql:3306/apollo-auto
      JWT_SECRET: "<請更改為隨機字串，至少32字元>"
      PORT: 4000
      NODE_ENV: production
```

**安全性建議：**
- `MYSQL_ROOT_PASSWORD`: 使用強密碼（至少16字元，包含大小寫、數字、符號）
- `MYSQL_PASSWORD`: 使用不同於 root 的強密碼
- `JWT_SECRET`: 使用隨機產生的長字串，可使用以下指令產生：
  ```bash
  openssl rand -base64 32
  ```

#### 4. 啟動服務

```bash
# 啟動所有容器（背景執行）
docker-compose up -d

# 查看啟動日誌
docker-compose logs -f apollo-auto-server
```

#### 5. 初始化資料庫

等待 MySQL 容器完全啟動後（約30秒），執行資料庫遷移：

```bash
# 進入 server 容器
docker-compose exec apollo-auto-server sh

# 執行資料庫遷移
yarn db:deploy

# 退出容器
exit
```

#### 6. 驗證部署

開啟瀏覽器測試：
- API Server: http://your-server-ip:4000
- API 文件: http://your-server-ip:4000/docs
- phpMyAdmin: http://your-server-ip:8080

### 資料持久化

Docker Compose 已配置 volume 用於資料持久化：

```yaml
volumes:
  mysql-data:  # MySQL 資料庫檔案儲存位置
```

即使容器被刪除，資料仍會保留。要完全移除資料：

```bash
docker-compose down -v  # 警告：會刪除所有資料！
```

### 埠號映射

預設映射的埠號：

| 服務 | 容器內埠號 | 主機埠號 | 說明 |
|-----|---------|---------|------|
| apollo-auto-server | 4000 | 4000 | API 服務 |
| mysql | 3306 | 3306 | 資料庫 |
| phpmyadmin | 80 | 8080 | 資料庫管理介面 |

若埠號衝突，可修改 `docker-compose.yaml` 中的映射：

```yaml
ports:
  - "4001:4000"  # 將主機的 4001 映射到容器的 4000
```

### 更新與維護

#### 更新程式碼

```bash
# 停止服務
docker-compose down

# 拉取最新程式碼
git pull

# 重新建置並啟動
docker-compose up -d --build

# 執行資料庫遷移（如有必要）
docker-compose exec apollo-auto-server yarn db:deploy
```

#### 查看日誌

```bash
# 查看所有服務日誌
docker-compose logs

# 即時追蹤日誌
docker-compose logs -f

# 只查看特定服務
docker-compose logs -f apollo-auto-server
```

#### 重啟服務

```bash
# 重啟所有服務
docker-compose restart

# 重啟特定服務
docker-compose restart apollo-auto-server
```

#### 備份資料庫

```bash
# 匯出資料庫
docker-compose exec mysql mysqldump -u apollo-auto -p apollo-auto > backup.sql

# 還原資料庫
docker-compose exec -T mysql mysql -u apollo-auto -p apollo-auto < backup.sql
```

### 生產環境建議

#### 1. 使用 Reverse Proxy（反向代理）

建議使用 Nginx 或 Caddy 作為反向代理，提供 HTTPS 支援：

**使用 Caddy（自動 HTTPS）：**

```bash
# Caddyfile
your-domain.com {
    reverse_proxy localhost:4000
}
```

**使用 Nginx：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 2. 防火牆設定

如果直接暴露在公網，建議設定防火牆規則：

```bash
# 僅允許特定 IP 訪問（替換為你的 IP）
sudo ufw allow from YOUR_IP_ADDRESS to any port 4000
sudo ufw enable
```

#### 3. 環境變數管理

生產環境建議使用 `.env` 檔案管理環境變數：

```bash
# 建立 .env 檔案
cat > .env << EOF
MYSQL_ROOT_PASSWORD=your_strong_password
MYSQL_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
EOF

# 修改 docker-compose.yaml 使用 .env
# 將環境變數改為：
# ${MYSQL_ROOT_PASSWORD}
```

#### 4. 定期備份

設定 cron job 自動備份：

```bash
# 編輯 crontab
crontab -e

# 每天凌晨 2 點備份
0 2 * * * cd /path/to/apollo-auto && docker-compose exec -T mysql mysqldump -u apollo-auto -p${MYSQL_PASSWORD} apollo-auto > /backup/apollo-auto-$(date +\%Y\%m\%d).sql
```

### 疑難排解

#### 問題：容器無法啟動

```bash
# 查看詳細錯誤訊息
docker-compose logs

# 檢查容器狀態
docker-compose ps

# 重新建置
docker-compose up -d --build --force-recreate
```

#### 問題：無法連接資料庫

```bash
# 確認 MySQL 容器是否正常運行
docker-compose ps mysql

# 進入 MySQL 容器測試連線
docker-compose exec mysql mysql -u apollo-auto -p

# 檢查 MySQL 日誌
docker-compose logs mysql
```

#### 問題：埠號已被占用

```bash
# 查看哪個程式占用埠號
sudo lsof -i :4000

# 修改 docker-compose.yaml 使用其他埠號
# 或停止占用埠號的程式
```

#### 問題：資料庫遷移失敗

```bash
# 重置 Prisma
docker-compose exec apollo-auto-server yarn db:generate
docker-compose exec apollo-auto-server yarn db:deploy

# 如果還是失敗，查看詳細錯誤
docker-compose exec apollo-auto-server sh
cd src/prisma
npx prisma migrate deploy --schema=./schema.prisma
```

### Chrome 擴充功能連接設定

部署完成後，在 Chrome 擴充功能的設定頁面：

1. 伺服器網址設定為：`http://your-server-ip:4000` 或 `https://your-domain.com`
2. 如使用 HTTPS，確保憑證有效
3. 測試連線是否正常

## 使用方式

### 1. 註冊帳號

開啟 Chrome 擴充功能，點擊「註冊」建立新帳號。

### 2. 設定 Apollo Cookie

1. 登入 [Apollo HR 系統](https://apollo.mayohr.com)
2. 在擴充功能中前往「Cookie 管理」分頁
3. 點擊「新增 Cookie」，系統會自動擷取當前登入狀態

### 3. 建立打卡排程

1. 前往「任務管理」分頁
2. 點擊「新增任務」
3. 設定：
   - 上班時間（例如：09:00）
   - 下班時間（例如：18:00）
   - 選擇執行日期（週一至週五）
4. 儲存後系統會自動執行

### 4. 設定 Telegram 通知（選用）

1. 前往「Telegram」分頁
2. 建立 Telegram Bot 並取得 Token
3. 取得你的 Chat ID
4. 在擴充功能中新增 Token 並啟用

## 開發指南

### 程式碼風格

本專案使用 Biome 統一管理程式碼風格：

```bash
# 格式化所有程式碼
yarn biome format --write .

# 執行 Lint 檢查並自動修復
yarn biome lint --write .
```

**風格規則：**
- 單引號
- 2 空格縮排
- 80 字元行寬限制
- 需要時加分號
- ES5 風格的尾隨逗號

### 資料庫操作

```bash
cd apollo-auto-server

# 建立新的遷移
yarn db:dev

# 部署遷移到生產環境
yarn db:deploy

# 重新生成 Prisma Client
yarn db:generate
```

### API 文件

啟動 Server 後，前往 http://localhost:4000/docs 查看完整的 Swagger API 文件。

## 排程機制說明

系統使用 `JobManager` 管理以下定時任務：

| 任務名稱 | 執行頻率 | 說明 |
|---------|---------|------|
| SET_JOB_STATUS | 每秒 | 更新所有使用者任務的下次執行時間 |
| CHECK_IN | 用戶設定 | 執行上班打卡 |
| CHECK_OUT | 用戶設定 | 執行下班打卡 |
| REFRESH_APOLLO_COOKIES | 每日中午12點 | 自動刷新 Apollo Cookie |

所有任務執行結果會記錄在資料庫，狀態包含：
- `PENDING`: 等待執行
- `SUCCESS`: 執行成功
- `FAILED`: 執行失敗
- `SKIPPED`: 跳過執行（非工作日）

## CI/CD

專案使用 GitHub Actions 自動化建置與發布：

- **Release Extension**: 自動建置 Chrome 擴充功能並發布 Release

查看 `.github/workflows/` 目錄了解更多。

## 常見問題

**Q: 打卡失敗怎麼辦？**
A: 檢查以下項目：
1. Apollo Cookie 是否過期（前往 Cookie 管理重新擷取）
2. 網路連線是否正常
3. 查看 Telegram 通知或伺服器日誌了解錯誤訊息

**Q: 可以設定多個打卡時間嗎？**
A: 可以，每個帳號可以建立多個任務，分別設定不同的上下班時間。

**Q: 如何更改時區？**
A: 目前時區預設為 Asia/Taipei，如需修改請透過 API 更新使用者設定。

**Q: Cookie 多久需要更新一次？**
A: 系統每天中午 12 點會自動刷新，通常無需手動更新。若打卡失敗可嘗試手動重新擷取。

## 專案文件

- [CLAUDE.md](./CLAUDE.md) - 完整開發指南
- [Server README](./apollo-auto-server/README.md)
- [Extension README](./apollo-auto-extention/README.md)
- [API 文件](http://localhost:4000/docs) - 需先啟動 Server

## 授權

MIT License

## 貢獻

歡迎提交 Issue 或 Pull Request！

---

**注意事項：**
- 本專案僅供個人學習與研究使用
- 請遵守公司考勤規定，謹慎使用自動化工具
- 使用者需自行承擔使用本工具的風險與責任
