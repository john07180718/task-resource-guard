# 接入與使用

只在使用者已授權修改的獨立開發服務接入。不要用這份範例自動改造其他產品。工具不需要 API 金鑰、不讀 .env。

## 明確設定

`scripts/common.mjs` 的 `context({ workspace, state, powershell })`：

- workspace：必填，存在的本機 Windows 絕對目錄，不可用磁碟根、UNC、junction 或 symlink。
- state：可省略；為 workspace 直接子目錄 `.task-resource-guard`，不接受其他目錄。
- powershell：預設 `pwsh.exe`，透過 PATH 尋找；需要固定執行環境時指定可信任的絕對執行檔路徑。不改執行原則、不提權。

先用 CLI `--init` 建立新登記；若已存在不重設權限、不覆蓋。權限查詢失敗時停止，不能轉用較弱檢查。

## 服務內部 adapter 範例

以下是接入片段，`queue`、`writes`、`loginInProgress`、`server` 必須替換成該服務的真實狀態與原始 handle；不能直接貼上常數作為安全判斷。工作入口與佇列接受點都必須納入設計，不能只包最外層的一個 HTTP handler。

```js
import { context } from '/absolute/path/to/scripts/common.mjs';
import { registerService } from '/absolute/path/to/scripts/service.mjs';

const ctx = await context({ workspace: approvedWorkspace, powershell: trustedPowerShell });
const registration = await registerService(ctx, {
  serviceName: 'private-preview',
  kind: 'dev-server',
  ownedDisposableDevelopmentService: true,
  ttlMs: 6 * 3600000,
  idleMs: 15 * 60000,
  safeToStop: () => queue.length === 0 && writes.size === 0 && !loginInProgress,
  shutdown: () => new Promise((resolve, reject) =>
    server.close(error => error ? reject(error) : resolve())),
});

// 每一個工作／排隊生命週期必須 await；實際工作也可能有下載或寫檔。
await registration.run(() => completePrivateJob());
// 自己結束服務時，先等所有工作完成，再正常關閉原始 handle，最後：
await registration.dispose();
```

`safeToStop` 必須是沒有業務副作用的查詢，同步回傳 true 才合格；async function 拒絕登記。普通函式若誤回傳 Promise／thenable，清理會回報 blocked 並觀察 rejection，避免未處理錯誤造成退出；這不代表支援非同步安全判斷。預覽也會查它，不能在這個回呼內修改工作或結束資源。TTL 與 idleMs 是最低資格，沒有到期強制回收。`shutdown` 必須用原始 handle 的正常停止方法，不能自行用 PID kill 或在關閉前留下未 await 工作。`dispose` 只關登記控制管道，不代替關閉你的產品資源；忙碌時拒絕 dispose。

到期與閒置通過後，工具先 probe；apply 時再核對 OS 身分，服務再檢查工作狀態並原子設定 closing，拒絕新 `run()`。關閉失敗仍保持 closing；需人工檢視，沒有自動重試／重啟／強殺。

## 使用限制

預覽會短暫建立自己的互斥控制管道及查詢既有服務，沒有持久寫入、停止請求或日誌。清理結果只在記憶體／CLI 計數中，不記錄服務名稱、capability、完整命令列或記憶體數值。

狀態 ACL 只允許目前使用者及 SYSTEM；本機 capability 不對其他同使用者惡意程式提供安全保證。不要分享整個狀態目錄；登記上限 256 筆，舊紀錄不自動刪，需確認資源狀態後另行人工處理。

控制連線有協定逾時限制，僅終止本次控制 socket，不停止服務或推斷工作已結束。關閉後只做有限身分查詢；退出未確認就如實回報。
