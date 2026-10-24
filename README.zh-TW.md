[English](README.md)

# Task Resource Guard（安全收尾與登記式清理）

**MIT 授權的獨立原始碼候選版，尚無標籤版本。** 本套件與其他 Router、交易工具無關。授權與來源見 [LICENSE](LICENSE) 與 [PROVENANCE.md](PROVENANCE.md)。專案位置為 [john07180718/task-resource-guard](https://github.com/john07180718/task-resource-guard)，一般問題可用 GitHub Issues 回報。

AI 協助開發時，臨時測試 worker、預覽或自動化程序可能在工作結束後留下。直接按名稱關閉所有 Node／瀏覽器程序，容易一起中斷別人的工作。本套件提供兩種可選做法：

- **先做好收尾**：新建私有資源包在 `withOwnedResource`，等待整批工作與正常 close，工作失敗也收尾，保留雙重錯誤。
- **讓可配合的開發服務自行登記**：只有身分可核對、到期、閒置、沒有工作且明確允許停止的服務，才接受正常關閉請求。CLI 預設 dry-run，零回收是正常結果。

Skill 教代理何時使用這兩種做法；工具不會攔截所有程式，也不會自動接管 MCP 或既有 PID。

## 適用範圍

登記式清理目前限 Windows、本機磁碟、同一使用者的獨立 Node 開發服務；需 Node.js 與 PowerShell 7，並可讀取必要的 CIM 程序身分。此候選版在 Node 24.16.0／PowerShell 7.6.5 上驗證，未宣稱其他版本皆通過。沒有 npm 依賴、安裝鉤子、API 金鑰或外部 API 呼叫。

`owned-resource.mjs` 僅使用 JavaScript；跨平台尚未實測。Python 請沿用原生 `with`／`async with`，本套件沒有 Python wrapper。

## 先試不接觸現有服務的範例

在套件根目錄執行：

```powershell
node .\examples\scoped-resource.mjs
node --test --test-concurrency=1 .\tests\owned-resource.test.mjs .\tests\cli.test.mjs .\tests\metadata.test.mjs .\tests\registered-cleanup.test.mjs
```

範例只建立自己的本機臨時 listener，正常關閉後退出。測試只啟動合成 child，不使用你的正式程序或憑證；Windows 測試透過 CIM 查詢自己建立的 PID。測試含失敗與競態模擬，不是正式產品整合驗收。

## 明確指定要管理的工作區

下面都是示範路徑，先換成自己的絕對路徑。`--init` 是明確建立新的私有登記目錄，已存在時拒絕覆蓋；清理命令本身不會自動初始化。

```powershell
$tool = 'C:\Tools\task-resource-guard\skills\task-resource-guard\scripts\cli.mjs'
$work = 'C:\Work\my-private-dev-tool'
$psExe = (Get-Command pwsh.exe -CommandType Application | Select-Object -First 1).Source
node $tool --workspace $work --powershell $psExe --init
node $tool --workspace $work --powershell $psExe
```

最後一行是預覽，不關閉程序、不修改登記、不寫日誌，但會查詢已登記程序與本機控制管道。初次通常回收候選為零：必須先由你有權修改的服務接上 [登記介面](skills/task-resource-guard/references/usage.md)。

確認清理範圍且已取得執行授權後，才明確加入 `--apply`。TTL 到期只代表可以檢查，不等於可以停止。服務會在收到停止請求時再次核對忙碌狀態，並拒絕新工作進入。

CLI 退出碼：0＝完成預覽／處理（包含沒有合格項目）；1＝無法安全執行；2＝有無效登記、身分不符、關閉失敗或未確認退出等需檢視項目。輸出只含模式與事件計數，不含 capability 或程序完整命令列。

## 安裝與移除

見 [INSTALL.md](INSTALL.md)。本機準備不等於已安裝 Skill；沒有改全域規則、桌面按鈕、既有排程或正式工具。排程必須另行選擇，安裝／移除腳本預設也只預覽。

## 安全界線與限制

不按 CPU、執行時間、程序名稱或 PID 數量判定工作結束。不強殺、不走程序樹、不接管原有程序、不自動重啟，也不刪除檔案、快取、Cookie、profile、資料庫或備份。

服務的 `run()` 與同步 `safeToStop()` 必須真實涵蓋工作、排隊、下載、寫檔及登入狀態。這需要逐個服務設計接入；錯誤的 adapter 仍可能導致中斷。拒絕接入正式、共用或沒有正常關閉方法的服務。

私有登記包含路徑、使用者 SID 與控制 capability，不能上傳。狀態目錄限選定工作區的直接子目錄 `.task-resource-guard`，拒絕重新導向，限制 ACL，最多 256 筆；過期紀錄保留待人工檢視。這不是對同一使用者惡意程式的安全沙箱。

關閉回呼成功不等於程序已退出；工具另查身分，未確認就回報，不改用強制終止。崩潰、斷電可能無法執行 finally。本套件沒有修復 Codex 本身的記憶體洩漏，沒有保證 RAM、速度或 Token 節省。

詳見 [SECURITY.md](SECURITY.md)、[VALIDATION.md](VALIDATION.md)。

另附 [貢獻指南](CONTRIBUTING.md)、[尚未標籤的變更](CHANGELOG.md)、[維護方向](docs/ROADMAP.md) 與 [發布檢查表](docs/RELEASE-CHECKLIST.md)。原始碼公開不代表已獲開源支援；目前沒有可宣稱的外部採用數、標籤版本或 GitHub CI 通過紀錄。
