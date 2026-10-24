# Task Resource Guard

**工作做完，讓這次任務建立的資源正常收尾。**

提供 JavaScript 資源收尾函式、需主動接入的 Windows Node 服務登記介面，以及給 AI 使用的 Skill。先預覽哪些服務符合條件，保護尚未完成的工作，再請服務正常關閉。

[![CI](https://github.com/john07180718/task-resource-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/john07180718/task-resource-guard/actions/workflows/ci.yml)
[MIT 授權](LICENSE) · 初期開發中 · [English](README.md)

![Task Resource Guard 流程：管理任務自己的資源、保護進行中的工作、先預覽再正常關閉](docs/assets/overview.svg)

[快速開始](docs/QUICKSTART.zh-TW.md) · [接入服務](skills/task-resource-guard/references/usage.md) · [安裝 Skill](INSTALL.md) · [驗證紀錄](VALIDATION.md)

## 先跑一個獨立範例

這份 Windows 入門流程使用 **Node.js 24 與 PowerShell 7**。以下下載指令另外需要 Git；無須執行 npm install，也不需要 API 金鑰。

```powershell
git clone https://github.com/john07180718/task-resource-guard.git
cd task-resource-guard
node examples/scoped-resource.mjs
```

範例只建立自己的本機 listener，完成模擬工作，再等待正常關閉。預期輸出：

```text
Private example resource closed normally.
```

想看「閒置服務正常關閉、忙碌服務繼續工作」的完整流程，可在 Windows 執行：

```powershell
node examples/registered-demo.mjs
```

示範會在新的暫存工作區建立兩個私有 HTTP 服務，先預覽，再關閉符合條件的閒置服務；等另一個服務的請求完成後，才正常關閉它。確認兩個子程序都退出後，移除示範自己的暫存工作區。**示範會對自己建立的服務實際執行清理；一般清理 CLI 仍預設只預覽。**

環境準備、各階段結果與排錯方式見 [快速開始](docs/QUICKSTART.zh-TW.md)。執行範例不會安裝 Skill，也不會接管你現有的工具。

## 依需求選擇用法

| 你想做的事 | 使用方式 | 需要提供什麼 |
| --- | --- | --- |
| 任務完成後關閉新建資源 | `withOwnedResource` | 建立資源、等待工作完成、正常關閉的方法 |
| 清理已閒置的開發服務 | 服務登記＋清理 CLI | 明確所有權、工作追蹤、同步安全判斷、正常關閉方法 |
| 讓 AI 依照相同流程操作 | 選擇安裝 Skill | 指定技能安裝位置；每個服務仍須個別接入 |

收尾函式會在工作失敗後繼續嘗試正常關閉；兩邊都失敗時保留兩個錯誤。登記式清理會核對身分、到期時間、閒置狀態及停止條件，關閉前再次檢查，之後確認程序是否真的退出。

## 先接入自己的服務，再預覽

只接入這次任務專用、你有權修改的獨立開發服務。[接入說明](skills/task-resource-guard/references/usage.md) 列出如何追蹤排隊、下載、寫檔與登入；工具無法自行理解所有服務的內部工作。

完成服務接入及私有登記目錄初始化後，執行：

```powershell
node skills/task-resource-guard/scripts/cli.mjs --workspace 'C:\Work\my-private-dev-tool'
```

這是預覽。沒有符合條件的服務也是正常結果。確定要請合格服務正常關閉時，才加入 `--apply`。到期只代表可以開始檢查，並不是強制停止期限。

## 適用範圍與必要條件

- **登記式清理：** Windows、本機磁碟、Node.js、PowerShell 7，以及必要的 CIM 程序身分查詢權限。入門流程使用 Node.js 24；實際測過的環境以 [驗證紀錄](VALIDATION.md) 為準。
- **任務自己的資源：** 主動接入的開發伺服器、測試 worker、自動化控制服務。正式服務、共用資源及任意既有程序不在支援範圍。
- **正常關閉：** 忙碌、身分不確定或關閉失敗時，只回報而不強制終止。接入程式必須正確追蹤工作，關閉結果也可能無法確認。
- **私有登記資料：** 工作區的 `.task-resource-guard` 含控制 capability 與本機身分資訊，不要加入 Git 或上傳。
- **效益與限制：** 尚未量測 RAM、速度、費用或 Token 的節省效果；崩潰與斷電可能無法完成收尾。收尾函式的跨平台驗證情況另列於 [驗證紀錄](VALIDATION.md)。

工具不會接管任意 PID、清除瀏覽器資料、安裝背景輪詢，或修復 Codex 自身的記憶體洩漏。Skill 安裝與選用排程都需另外設定。接入真實服務前，請先閱讀 [安全界線](SECURITY.md)。

## 一起改善下一版

專案仍在初期開發階段。已發布版本請看 [Releases](https://github.com/john07180718/task-resource-guard/releases)；已測項目與未驗證範圍請看 [驗證紀錄](VALIDATION.md)。CI 徽章顯示實際工作流程狀態，範例成功不代表每種產品接入都已驗證。

如果它對你有幫助，歡迎按 **Star** 收藏。試用後可到 [Issues](https://github.com/john07180718/task-resource-guard/issues) 分享執行環境、試了哪個範例或接入方式，以及實際結果。回報請使用去除私密資訊的輸出，不要附上登記資料或憑證。

[貢獻指南](CONTRIBUTING.md) · [維護方向](docs/ROADMAP.md) · [變更紀錄](CHANGELOG.md) · [發布檢查表](docs/RELEASE-CHECKLIST.md) · [原始碼與授權來源](PROVENANCE.md)

本專案為獨立開發，未宣稱獲得 OpenAI、Codex 或其他工具供應商的隸屬或背書。
