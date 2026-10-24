# 快速開始

[English](QUICKSTART.md) · [回專案首頁](../README.zh-TW.md)

先執行獨立範例，再決定要安裝 Skill 或接入自己的服務。這是三件不同的事：跑過示範，不會改動 AI 的設定，也不會登記你現有的工具。

## 1. 準備 Windows 執行環境

使用一般 PowerShell 終端機，以及你擁有的本機目錄。

| 必要條件 | 用途 |
| --- | --- |
| Windows 與沒有重新導向的本機工作區 | 登記式清理使用 Windows 程序身分及 named pipe |
| Node.js 24 | 執行 JavaScript 工具與範例 |
| PowerShell 7，可找到 `pwsh.exe` | 查詢指定程序並核對私有登記目錄權限 |
| Git | 使用以下指令下載原始碼 |
| 必要的 CIM 程序身分查詢權限 | 核對示範自己建立的服務 |

先檢查電腦上已安裝的工具：

```powershell
node --version
pwsh --version
git --version
```

示範不會安裝這些工具、修改 PowerShell 執行原則或提升權限。不需要其他 npm 套件、API 金鑰或付費服務。實際測過的環境以 [驗證紀錄](../VALIDATION.md) 為準，本教學不代表所有版本組合都已通過。

選擇尚未存在 `task-resource-guard` 專案資料夾的位置，下載原始碼：

```powershell
git clone https://github.com/john07180718/task-resource-guard.git
cd task-resource-guard
```

後續指令都在這個專案根目錄執行。也可以使用 GitHub 的 **Code → Download ZIP** 下載並解壓縮，取代 Git 下載步驟。

## 2. 看資源如何在工作完成後關閉

```powershell
node examples/scoped-resource.mjs
```

範例會建立自己的 `127.0.0.1` listener，完成模擬工作，再等待原有關閉方法執行完成，不連線至外部服務。

成功時會看到：

```text
Private example resource closed normally.
```

這是在示範 `withOwnedResource`。工作丟出錯誤後仍會嘗試正常關閉；工作與關閉都失敗時，會保留兩個錯誤。這個結果只表示範例自己的資源已收尾。

## 3. 看登記式清理如何保護忙碌中的工作

**此範例限 Windows。** 它會建立新的暫存工作區，以及兩個私有 HTTP 子服務，並對這些服務實際執行預覽與清理，讓你看到完整流程。

```powershell
node examples/registered-demo.mjs
```

如果 PowerShell 7 不在 `PATH`，可指定可信任執行檔的完整路徑；以下路徑請依實際安裝位置調整：

```powershell
node examples/registered-demo.mjs --powershell 'C:\Program Files\PowerShell\7\pwsh.exe'
```

示範會檢查以下階段：

| 階段 | 觀察重點 |
| --- | --- |
| 建立服務 | 啟動兩個私有服務，其中一個保留尚未完成的真實 HTTP 請求 |
| 預覽 | 閒置服務符合清理條件，兩個服務都繼續執行 |
| 第一次清理 | 閒置服務正常關閉，忙碌的服務受到保護 |
| 完成工作 | 保留的請求完成後，第二次清理才正常關閉剩下的服務 |
| 收尾 | 確認兩個子程序都退出，再移除示範自己的暫存工作區 |

示範為了讓流程容易觀察，使用較短的到期與閒置門檻；這些設定只適用於示範，不是你的工具應採用的預設建議。一般清理 CLI 仍預設只預覽，要實際清理必須明確加入 `--apply`。

範例成功代表這個隔離情境完成，並不表示真實 MCP、瀏覽器、正式服務或你的接入程式都已通過驗證。崩潰與斷電後無法保證正常收尾；若無法確認退出，工具會回報狀況，不會改用強制終止。

## 4. 決定下一步

### 在程式中使用資源收尾函式

從 `skills/task-resource-guard/scripts/owned-resource.mjs` 引入 `withOwnedResource`，提供**新建、任務專用資源**的建立方式、等待完整工作完成的函式，以及資源原有的正常關閉方法。可先參考 [最小範例](../examples/scoped-resource.mjs)。

### 安裝給 AI 使用的 Skill

依 [安裝與移除說明](../INSTALL.md)，將完整的 `skills/task-resource-guard` 資料夾複製到選定的 Codex home，保留其中的 scripts、references 與 LICENSE。目的地已存在時，先比較內容再決定如何處理。

這個動作讓代理取得指引與腳本，不會自動替服務登記、建立清理排程或修改全域規則。排程是另外選擇的功能，也列在安裝說明中。

### 接入你自己的開發服務

閱讀 [接入介面說明](../skills/task-resource-guard/references/usage.md)。每個服務都必須主動登記、追蹤完整工作生命週期、同步確認現在能否停止，並提供原有的正常關閉方法。排隊、下載、寫檔與登入都要納入工作狀態。

只接入這次任務專用、你擁有且有權修改的獨立開發服務。正式或共用服務不在範圍內。服務入口檔必須位於指定的本機工作區。

先將 `C:\Work\my-private-dev-tool` 換成該服務所在、已存在的工作區，再建立**新的**私有登記目錄：

```powershell
$workspace = 'C:\Work\my-private-dev-tool'
$tool = '.\skills\task-resource-guard\scripts\cli.mjs'
$powerShellExe = (Get-Command pwsh.exe -CommandType Application | Select-Object -First 1).Source
node $tool --workspace $workspace --powershell $powerShellExe --init
```

目錄已存在時，初始化會拒絕覆蓋。啟動已接入的服務，讓它完成登記，再預覽：

```powershell
node $tool --workspace $workspace --powershell $powerShellExe
```

預覽不會發出關閉請求、修改登記或寫入持久日誌。尚無服務登記，或條件尚未符合時，沒有可清理項目是正常結果。檢視範圍後，確定要關閉符合條件的服務時才執行：

```powershell
node $tool --workspace $workspace --powershell $powerShellExe --apply
```

關閉前會再次核對服務身分與工作狀態。TTL 到期只代表可開始檢查，不是強制停止期限。目前登記介面的預設門檻是六小時後可檢查、至少閒置十五分鐘；接入者可依服務需求設定。

## 遇到問題時

| 狀況 | 先檢查什麼 |
| --- | --- |
| 找不到 `node`、`pwsh` 或 `git` | 檢查既有安裝與終端機的 `PATH`；本專案不會安裝必要工具 |
| 登記示範回報不支援的平台 | 在 Windows 執行；收尾函式的跨平台證據請另看驗證紀錄 |
| 沒有符合條件的服務 | 確認服務已主動接入、工作有被追蹤、已到期且閒置時間足夠 |
| CLI 安全停止 | 檢查指定工作區、已初始化的私有登記、PowerShell 路徑、CIM 查詢及檔案權限 |
| 關閉失敗或未確認退出 | 檢查服務自己的正常關閉方法；工具不會改用強制終止 |

CLI 退出碼：**0**＝這輪處理完成，包含沒有合格服務；**1**＝無法安全執行；**2**＝登記、身分、關閉或退出確認結果需要檢視。這是 CLI 的退出碼定義，兩個範例會各自回報成功或失敗。

`.task-resource-guard` 含控制 capability、使用者身分與本機路徑，請保留在本機，不要提交 Git 或附在 Issue。清理 CLI 會保留舊登記供檢視，不會自動刪除。

有問題或可重現的失敗，可到 [Issues](https://github.com/john07180718/task-resource-guard/issues) 提供作業系統、Node／PowerShell 版本、執行指令與去除私密資訊的輸出。敏感問題請依 [SECURITY.md](../SECURITY.md) 回報。

[驗證紀錄](../VALIDATION.md) · [貢獻指南](../CONTRIBUTING.md) · [發布狀態](https://github.com/john07180718/task-resource-guard/releases)
