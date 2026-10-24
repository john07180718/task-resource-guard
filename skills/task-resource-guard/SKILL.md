---
name: task-resource-guard
description: "Help finish newly created task-private development resources safely and inspect opt-in registered idle Windows Node services. Use for owned resource lifecycle integration or explicitly requested cooperative cleanup; preserve busy, shared, unregistered and identity-uncertain resources."
---

# Task Resource Guard

獨立原始碼候選版，採 MIT，見同目錄 [LICENSE](LICENSE)。這個 Skill 不是系統清理權限，也不新增清理排程。

## 先辨識本次範圍

確認實際工作區、系統、Shell、本次自行建立的資源與正常關閉介面。只做檢查時不執行 `--init`、`--apply`、安裝或修改產品。不跨到其他專案，不把歷史驗收當成即時程序狀態。

保留共用／正式服務、現有未知 PID、人工登入、下載、排隊、未完成寫檔、使用者要求保留的預覽。無法確認所有權、忙碌狀態或正常停止方法時，回報缺項。

## 新建私有資源的正常收尾

優先沿用正確的原生 try/finally、with 或 async with。只有需要共用封裝時才用 `scripts/owned-resource.mjs`。

- `create` 只能建立新的私有 handle，不能回傳 attached/shared resource。
- await 所有工作與排隊後才 await 一次正常 close；不要把 timeout、低 CPU 或 Promise.race 當成完成證據。
- 建立過程部分失敗，由 factory 自己收尾；外層未拿到 handle 不猜測資源。
- close 失敗回報未確認釋放，保留錯誤，不強殺、不另啟替代實例。
- Remotion 單次匯出優先既有 CLI／renderMedia。Python 用原生 context manager；不為節省資源改造無關產品。

## 登記式清理

先讀 [usage.md](references/usage.md)，再按當前授權操作。只有明確需要且獲准接入時才修改服務；不能把工具可用當成正式操作授權。

Windows 服務由自身 `process.pid` 登記；禁止收養既有 PID。服務必須有明確所有權、真實工作閘門、同步安全判斷、正常關閉與完整的工作／佇列保護。

CLI 必須明確指定 `--workspace`，預設只預覽；不自動初始化、修正 ACL 或寫日誌。只有取得清理授權後才加 `--apply`。身分需包含 PID、名稱、執行檔路徑、啟動時間與使用者 SID；到期、閒置、工作數與同步安全判斷必須同時通過，停止前再核對。

不使用 taskkill、Stop-Process、process.kill、程序樹或按名稱批次終止。不刪檔、不清 Cookie/profile、不停止共用瀏覽器、不改既有排程或安全設定。

## 驗證與回報

使用套件隔離測試，只針對本次 adapter 新增的風險補測，不觸碰正式服務或真實憑證。測試自建資源必須正常收尾。

區分「預覽候選」「已請求正常關閉」「已確認退出」「未確認釋放」。零回收如實回報。不能把工作集、私人配置與全機可用 RAM 混用；沒有前後可比證據就不宣稱節省。

禁止輸出／上傳 capability、真實登記、私人日誌、憑證或本機完整命令列。不能宣稱全部 MCP 已自動回收或 Codex 記憶體問題已解決。
