# 安全範圍與問題回報

本專案採 MIT，為小範圍的原始碼候選；沒有支援回覆時間承諾。一般合成重現可用 [GitHub Issues](https://github.com/john07180718/task-resource-guard/issues)；敏感安全問題請使用 [GitHub 私密漏洞回報](https://github.com/john07180718/task-resource-guard/security/advisories/new)。若頁面沒有回報按鈕，先以不含漏洞細節的 Issue 詢問私密通道，不公開敏感資訊。

本儲存庫的 private vulnerability reporting 已於 2026-10-24 啟用並由 API 讀回確認；通知是否送達仍依維護者的 GitHub 通知設定，不承諾特定時間回覆。

只管理可驗證的自有登記開發資源，並保護忙碌工作。沒有提權、按名稱批次終止、PID 收養、程序樹強殺、檔案刪除或瀏覽器資料清理。預設 dry-run 不改變持久狀態。

OS 身分與服務合作檢查都是必要條件；身分查詢失敗、ACL 不符、路徑重新導向、紀錄損壞或關閉失敗時保留資源。真正所有權與完整工作保護仍依賴 adapter 正確，不能用常數 true 取代安全判斷。

登記目錄需使用者及 SYSTEM 專用 ACL，包含控制 capability、路徑、SID，不可公開。能力字串只用於隨機本機 named pipe，不等同防禦相同使用者惡意程式的沙箱；同使用者竄改、權限更高的攻擊者或遭入侵的服務不在安全保證內。

若要回報問題，先停用新清理操作、保留當前工作；提供去識別化的版本、預覽模式、事件種類與合成重現。不要附真實登記檔、完整命令列、Cookie、DPAPI、.env、憑證、私人日誌或對話。沒有安全私密通道時，先聯絡維護者取得方式，不在公開 Issue 貼敏感細節。
