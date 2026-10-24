# 來源與授權盤點

## 2026-10-24：試用流程與展示資料補充

本次為同一公開專案新增中英文快速開始、兩個隔離 HTTP 服務的可執行示範、對應測試、Issue Forms、CI 定義、發布草稿與原創 SVG／PNG 展示圖。這些新增內容沿用本專案 MIT 授權；沒有加入第三方照片、商標素材或正式服務的登記資料。PNG 由同目錄 SVG 轉出。

核心 `skills/task-resource-guard/` 程式與 Skill 在這輪保留原樣。工具執行時仍不需要 npm 套件或外部 API。CI 使用 GitHub 官方 checkout/setup-node Actions，固定至已核對的 commit；它們只在 CI runner 使用，不隨本工具包重新授權或成為本機執行依賴。詳見 [CI 說明](docs/CI.md)。

本次文件與測試紀錄會區分本機可驗證的部分、Windows CI 的實際結果，以及尚未執行的發布／展示設定；草稿不代表已對外發布。所有公開檔案的 SHA-256 清單見 `PACKAGE-MANIFEST.sha256`（不包含該清單本身）。

## 原始候選版盤點

盤點日期：2026-10-24。本文件只涵蓋這個候選目錄，不是全機或全部歷史程式的授權保證。完整的本機來源路徑／雜湊留在目錄外的私人審閱材料，不帶入公開候選。

維護者於 2026-10-24 明確確認有權公開本機來源與改編內容，並授權以 MIT、署名 john07180718 發布此獨立專案。根目錄與可安裝 Skill 目錄均附 LICENSE。這是權利人的聲明與本次授權範圍，不是第三方來源的獨立法律鑑定。

| 本套件檔案 | 來源與本次處理 | 授權狀態 |
| --- | --- | --- |
| scripts/owned-resource.mjs | 本機 task-tool-release helper；保留 await 工作、await close、雙重錯誤邏輯，調整註解 | 維護者確認有權以 MIT 公開 |
| scripts/common.mjs | 本機 registered-cleanup/common.mjs 的身分、路徑與登記讀取概念；改為明確工作區、可配置 PowerShell，移除私用路徑及日誌 | 維護者確認有權以 MIT 公開 |
| scripts/service.mjs | 本機 registered-cleanup/service.mjs；保留自身登記、capability、同步閒置判斷及原子停止閘門，調整關閉與錯誤處理；本輪另補誤回傳 Promise 時阻擋清理並觀察 rejection | 維護者確認有權以 MIT 公開 |
| scripts/cleanup.mjs | 本機 registered-cleanup/cleanup.mjs；只保留合作式程序關閉，移除檔案刪除、記憶體紀錄與私人日誌 | 維護者確認有權以 MIT 公開 |
| scripts/inspect.ps1 | 本機 registered-cleanup/inspect.ps1 改編；只讀必要身分，不記錄記憶體或完整命令列 | 維護者確認有權以 MIT 公開 |
| scripts/state-permissions.ps1 | 改寫本機 protect-state.ps1，增加唯讀 ACL 核對，取消固定使用者目錄 | 維護者確認有權以 MIT 公開 |
| scripts/cli.mjs、schedule.ps1 | 本次候選版整理新增；內建 Node／Windows API，不引入第三方程式原文 | MIT |
| tests/、examples/ | 本次新增合成案例；部分測試情境參考本機既有驗收，不讀真實登記或正式服務 | MIT |
| SKILL.md、references/、根目錄與 docs/ 說明 | 本次重新整理，另補英文入口、貢獻指南、未發布變更、維護方向及發布檢查表；未複製全域規則、其他技能或私人報告 | MIT |

表格 scripts 為 `skills/task-resource-guard/scripts/` 簡稱。沒有複製 manual-force 分支、檔案刪除器、排程現況、JEV 專用接入、第三方插件碼、DPAPI、Cookie、profile、.env、私人 log 或備份。

## 外部執行環境與參考

候選版沒有第三方 npm／Python 套件依賴，使用者自行提供 Node.js、PowerShell 7 與 Windows；這些執行環境沒有隨包散布，仍依各自條款使用。官方文件只作 API 與設計參考，不是它們背書本專案的證據：

- [Node.js net](https://nodejs.org/api/net.html)、[child_process](https://nodejs.org/api/child_process.html)、[test](https://nodejs.org/api/test.html)
- [Windows PowerShell Get-Acl](https://learn.microsoft.com/powershell/module/microsoft.powershell.security/get-acl)、[ScheduledTasks](https://learn.microsoft.com/powershell/module/scheduledtasks/)
- 歷史收尾建議參考 [Python contextlib](https://docs.python.org/3/library/contextlib.html) 與 [Remotion openBrowser](https://www.remotion.dev/docs/renderer/open-browser)；本套件沒有包含或實測它們的產品程式。

此盤點不能排除未揭露的上游來源；若發現未列出的第三方內容，需核對並保留其必要 notices，不把「未找到授權」解讀為「沒有授權限制」。本專案依維護者此次明確授權採 MIT。
