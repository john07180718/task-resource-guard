# 安裝、解除安裝與選用排程

本套件採 MIT，見 LICENSE。以下是選擇安裝的操作說明；公開原始碼不代表已替任何使用者安裝 Skill、改全域規則或建立排程。

第一次使用，請先閱讀 [快速開始](docs/QUICKSTART.zh-TW.md)／[English quick start](docs/QUICKSTART.md)。跑範例、安裝 Skill、接入自己的服務是三個獨立步驟，可先試範例再決定後續設定。

## 不安裝也能檢查

在套件根目錄執行 README 的範例與隔離測試即可。這不會建立全域 Skill、全域規則、排程或常駐清理器。Node／PowerShell 需由使用者既有環境提供，不自動下載或變更執行原則。

## 選擇安裝 Skill

確認使用者安裝意圖後，只複製 `skills/task-resource-guard` 整個資料夾到選定 Codex home 的 `skills/task-resource-guard`。scripts、references 與其中的 LICENSE 要一起保留。目的地已存在時先比較，不覆蓋，也不要把 README 中的指令當成已執行結果。

可用以下 PowerShell 做明確路徑檢查後的複製；兩個路徑都要先改成自己的，目的地的 `skills` 父目錄必須已存在且不是連結：

```powershell
$source = 'C:\Tools\task-resource-guard\skills\task-resource-guard'
$destination = 'C:\ChosenCodexHome\skills\task-resource-guard'
if (Test-Path -LiteralPath $destination) { throw 'Destination exists; compare first' }
# 先人工核對來源、目的地及其祖先沒有重新導向，再執行安裝。
Copy-Item -LiteralPath $source -Destination $destination -Recurse -WhatIf
# 預覽與使用者選擇確認後：
Copy-Item -LiteralPath $source -Destination $destination -Recurse -ErrorAction Stop
```

本套件不覆寫 AGENTS.md。解除安裝時先停止此技能的後續調用、確認沒有工作仍引用其腳本，並比較目的地仍是本次安裝的副本。只移除該獨立技能目錄；若有其他修改，先保留，不批次刪其他 Skill。解除安裝不清除任何使用者資料或瀏覽器登入。

## 可選排程：預設不安裝

只在使用者另行決定後操作。先手動 dry-run／apply 驗收其**自有開發服務**，再決定是否適合排程。預設建議人工執行。本腳本不觸碰任何原有清理排程，名稱必須是新的 `TaskResourceGuard-...`。

```powershell
$schedule = 'C:\Tools\task-resource-guard\skills\task-resource-guard\scripts\schedule.ps1'
$arguments = @{
  TaskName = 'TaskResourceGuard-MyPrivateTool'
  Workspace = 'C:\Work\my-private-dev-tool'
  NodeExe = (Get-Command node.exe -CommandType Application | Select-Object -First 1).Source
  PowerShellExe = (Get-Command pwsh.exe -CommandType Application | Select-Object -First 1).Source
}
& $schedule @arguments                   # 僅預覽，不查改排程
# 使用者明確選擇後才執行：
& $schedule @arguments -Apply            # 建立新的目前使用者排程，不提權、不覆蓋
& $schedule @arguments -Action Remove    # 僅預覽移除
& $schedule @arguments -Action Remove -Apply
```

選用安裝會在約 10 分鐘後首次執行，其後每六小時對**指定工作區的登記**執行 apply。只限使用者登入時、同時只跑一份；不是每六小時一定會釋放記憶體。工具／工作區路徑移動後需重新檢視，不能默默覆寫舊任務。移除只接受同名且 description、執行檔、完整參數都吻合的任務；不符就保留。

本次只驗證排程腳本語法與 Install／Remove 的預覽；真正註冊、觸發、移除及不同帳戶權限尚未實測。未經使用者另行同意，不執行上述兩行 `-Apply`。

## 登記資料的保留

工作區 `.task-resource-guard` 含私密 capability、SID、路徑；不隨技能複製，不加入 Git，不上傳。移除技能或排程不等於服務已退出。要處理舊登記，先逐一確認服務狀態及所有權，另行取得資料移除授權；本套件不提供遞迴刪除登記資料的命令。
