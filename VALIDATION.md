# 本候選版的驗證

## 試用流程增補：2026-10-24

本次增補保留既有核心程式，新增兩個真實 loopback HTTP child 的登記示範與測試。示範核對預覽保留兩個服務、第一次 apply 只關閉閒置服務、忙碌請求完成後再正常關閉，以及中斷時正常收尾。完整命令：

```powershell
node --test --test-concurrency=1 tests/owned-resource.test.mjs tests/cli.test.mjs tests/metadata.test.mjs tests/registered-cleanup.test.mjs tests/registered-demo.test.mjs
```

本機檢視環境為 Linux、Node 24.22.1。使用同程序測試模式 `--test-isolation=none` 實際得到 **7 通過、3 項 Windows 測試跳過、0 失敗**；跳過不算 Windows 通過。這個模式只用於本次受限本機測試環境，CI 使用標準的預設程序隔離。

`examples/scoped-resource.mjs` 在允許本機 loopback listener 的執行環境中正常退出，輸出 `Private example resource closed normally.`。初次在禁止 listener 的沙箱執行遇到 `EPERM`，沒有把環境限制當作成功；取得執行權限後才驗證該範例。此結果只涵蓋這個 Linux／Node 組合下的小型 helper 範例。

另已核對新增 JavaScript 語法、YAML／Issue Forms 結構、Markdown 相對連結與圖片尺寸（1280 × 640）。本機沒有 PowerShell 7 或 Windows，新增 HTTP 示範的兩項 Windows 測試與既有 Windows 整合測試，仍須查看實際 [GitHub CI](https://github.com/john07180718/task-resource-guard/actions/workflows/ci.yml) 的完成結果。工作流程檔案本身不代表測試已通過。

發布版本、repository Topics、Social preview 與宣傳草稿各有獨立狀態；不由測試結果推定已完成。沒有新增效能、RAM、費用、Token 或外部採用數據。

## 原始來源候選版：2026-10-24 Windows 驗證紀錄

日期：2026-10-24；Windows 10.0.26300、Node 24.16.0、PowerShell Core 7.6.5。這是本次獨立候選套件的驗證，不能替代每個產品的 adapter 驗收。

## 已執行

| 範圍 | 實際結果 |
| --- | --- |
| owned-resource.test.mjs | 4 項通過：await 工作與 close、失敗仍收尾、雙重錯誤／建立失敗、close 失敗／falsy 工作錯誤保留 |
| cli.test.mjs | 1 項通過：預設 dry-run、明確工作區、衝突與未知參數拒絕 |
| metadata.test.mjs | 1 項通過：此 Skill 使用的簡單 YAML frontmatter、名稱與 description 格式 |
| registered-cleanup.test.mjs | 本輪含誤回傳拒絕 Promise 的安全判斷案例，整合測試通過，約 46 秒 |
| PowerShell AST | 3 個腳本語法通過 |
| schedule.ps1 | Install 與 Remove 的預覽均為 Preview／Changed=false；沒有加 -Apply |
| examples/scoped-resource.mjs | 一次性私有 listener 正常關閉，退出碼 0 |

發布前在候選根目錄執行 README 的完整測試命令，單次 7/7 通過、0 失敗、0 跳過、退出碼 0，約 49.6 秒。包含 6 項單元／metadata 與 1 項隔離整合測試。前輪公開準備約 46.2 秒也全數通過；本次授權文件完成後已重跑發布門檻。

整合測試只建立七個本次私有 Node child：可清理、忙碌、尚未到期、未登記、probe 後狀態改變、正常關閉回呼失敗、安全判斷誤回傳拒絕的 Promise。驗證：

- dry-run 不停止程序、登記內容逐位元組相同、不產生日誌。
- 只有合格的一個 child 被確認退出；其他六個仍在運行，之後才由測試正常收尾。
- 啟動時間不符的合成登記被保留；這是 PID 重用風險模擬，不是實際強迫 Windows 重用 PID。
- 無效 capability 不接受停止；再次核對忙碌狀態；closing 閘門拒絕新工作。
- 關閉回呼失敗不強殺、不冒稱已退出。
- 安全判斷誤回傳 Promise 時保守回報 blocked，觀察其 rejection 以免造成未處理錯誤；dry-run 與 apply 都不關閉該服務。
- 真實 Windows junction 被拒絕；跨工作區紀錄標為無效；CLI 無模式旗標時仍為預覽，且不輸出 capability。
- 七個 child 全部以 code 0、無終止 signal 正常退出；合成狀態目錄已由測試清除，沒有留下本次持續程序。前輪六個 child 的驗收是舊版本證據，不混用為本輪數量。

執行入口見 README。需要指定測試用 PowerShell 時，可設定一次性 `TRG_TEST_POWERSHELL` 為可信任執行檔路徑；產品本身使用明確 `powershell` 設定，不讀測試變數。

## 發現與修正

初輪整合失敗：測試對含身分不符的登記仍要求 CLI code 0；CLI 正確回傳 code 2。第二輪發現該對照使用已被本測試正常關閉的 child，因此後續應是 already-exited，而非仍存活的 identity-mismatch。測試改用保持忙碌且存活的私有 child 作對照，保留嚴格的警示退出碼與事件核對；未削弱產品安全檢查。

排程預覽首次執行的測試命令從 PATH 取到多個 Node 路徑，無法轉為單一字串，沒有執行排程操作。文件與驗證命令改為明確取第一個執行檔，再次預覽通過。

最後檢視將 Windows service 查詢也改為 CIM 端的指定 PID 篩選，避免取回全部服務後再本地篩選；已重驗該腳本語法及整合測試。

本輪公開準備修正 `safeToStop` 誤回傳 Promise 的邊界：async function 本來即拒絕登記，但普通函式仍可能回傳 Promise。現改為 blocked 並觀察 rejection，保留服務；新增合成案例核對預覽、apply 後存活及正常測試收尾。其他清理條件與預設行為保留。

## 無法執行與尚未執行

官方 skill-creator `quick_validate.py` 已嘗試，但環境缺 PyYAML，退出碼 1；系統與 bundled Python 都未提供該模組。本次沒有安裝依賴，改以套件內 metadata 測試及人工檢查確認這份簡單 YAML，**不宣稱官方 validator 通過**。

沒有測試排程實際安裝／觸發／解除、不同帳戶／管理員／NTFS 權限組合、其他 OS、長期負載、真實 MCP／瀏覽器／Remotion／Python 產品整合或實際 OS PID 重用。沒有測量 RAM／速度／Token 淨效益，沒有正式服務、真實憑證、付費 API 或 JEV API 呼叫。

檔案與來源盤點另見 PROVENANCE.md；私人審閱目錄的唯讀檢查器用來核對候選清單、私密路徑／憑證模式、相對連結、禁止的強殺原語及申請欄位長度。模式檢查不是完整機密掃描或安全認證，發布前仍要人工審閱實際內容。
