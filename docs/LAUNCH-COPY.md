# Launch copy — drafts for review

These drafts have not been posted or sent. Review the current repository and validation evidence before publishing. Do not add success rates, user counts, memory savings or compatibility claims without evidence. Share the repository's default-branch quickstart only after the relevant changes are merged.

## X / Threads — 繁體中文

用 AI 開發時，你也遇過任務做完、臨時預覽服務卻還留在背景嗎？

我整理了 Task Resource Guard：讓自己的 Node.js 開發服務先登記，確認沒有未完成的工作後，再透過原本的關閉方式正常收尾。

預設先預覽；正在忙的服務會保留。需要逐個服務接入，目前登記式清理以 Windows 為範圍。

專案提供可自行執行的隔離範例，歡迎試用、回報接入時卡住的地方。覺得有幫助也可以 Star 收藏。

https://github.com/john07180718/task-resource-guard

## X — English

Task Resource Guard helps task-owned Node.js dev services close normally when their work is done. Windows-first, opt-in, preview by default. Try the isolated demo and share where integration gets difficult.

https://github.com/john07180718/task-resource-guard

## Show HN

Suggested title:

> Show HN: Task Resource Guard — cooperative cleanup for Windows Node dev tools

Suggested first comment:

> I made this for development sessions that leave private preview services or test tools running after the work ends. The project offers a small scoped-resource helper and an opt-in adapter for Windows Node.js services.
>
> A service registers its own identity, tracks work and supplies a normal shutdown callback. The CLI previews by default. Applying cleanup requires identity, expiry, idleness and a synchronous safety check, and the service checks again before closing.
>
> The repository includes an isolated example you can run locally and a walkthrough showing an idle service closing while a busy service remains running. Real services still need a correct adapter; this does not automatically manage every Node process or MCP server.
>
> I would especially welcome feedback on the first-run experience and on the effort needed to track all work entry points. No RAM or performance savings have been measured.

Only submit once the linked version can be tried. Follow [Show HN's guidelines](https://news.ycombinator.com/showhn.html), including being available to discuss the work and not soliciting upvotes/comments from friends.

## DEV Community project introduction

Suggested title: **Let your development services tell you when they are safe to close**

Suggested structure:

1. Show the development problem using your own reproducible example.
2. Run the isolated idle/busy service walkthrough; include actual output and the tested environment.
3. Explain the scoped helper and registered-service adapter with links to complete examples.
4. State the Windows requirement, integration work and existing limits.
5. Ask readers which part of their workflow makes normal shutdown difficult.

Use `#showdev` for the project introduction and follow the [tag's guidelines](https://dev.to/t/showdev). Keep the explanation useful even if a reader chooses not to use this tool.

## First tester invitation

> 我正在找使用 Windows、Node.js 和 AI 開發工具的朋友試用一個開發服務收尾工具。想請你照快速開始跑一次隔離範例；如果剛好有適合的自有開發服務，再看能不能接入。最想知道的是：哪一步看不懂、哪一步跑不動，以及這個功能是否真的對你的工作有幫助。沒有要求按 Star，也不用提供程式碼、金鑰或私有登記檔。

Send only to appropriate people who have agreed to receive the invitation. This file does not authorize or perform outreach.
