# Repository launch settings

These are exact suggested settings and release materials. Files in this repository do not apply repository settings or publish a release by themselves. Verify the live repository before marking any step complete.

## About and Topics

Suggested description:

> Graceful cleanup for task-owned Node.js dev services on Windows. Opt-in registration, busy-work protection, and preview by default.

Suggested Topics (choose these in the repository's About editor):

```text
nodejs
windows
powershell
developer-tools
resource-management
graceful-shutdown
codex
```

These describe current scope; they do not imply an official vendor relationship or universal MCP support. No external website is required: direct visitors to this repository and its quickstart.

## Social preview

Upload [`assets/social-preview.png`](assets/social-preview.png) in Settings → General → Social preview. The image is 1280 × 640. Its editable source is [`assets/overview.svg`](assets/overview.svg).

Putting the image in Git does not automatically set GitHub's social preview. Inspect a shared repository link after saving the setting; social platforms may cache previews.

## First pre-release

The proposed first version is **`v0.1.0-alpha.1`**, explicitly a pre-release. The prepared body is [RELEASE-NOTES-v0.1.0-alpha.1.md](RELEASE-NOTES-v0.1.0-alpha.1.md).

Before publishing:

1. Review and merge the onboarding changes.
2. Check a completed successful Windows CI run for the exact commit being tagged, including the registered-service demo. A passing Linux unit test is not Windows evidence.
3. Read the current [validation record](../VALIDATION.md), [release checklist](RELEASE-CHECKLIST.md), and known limits in the release notes.
4. In the published body, replace the prepared notes' default-branch file links with links to the actual release tag, and link the exact completed CI run. Create a release targeting that reviewed commit, use the proposed tag, and mark **Set as a pre-release**. Do not mark it as the latest stable release.
5. Read back the published tag, source commit and release body. Replace any draft wording only after publication is verified.

No tag, release, npm package, scheduled cleanup or external promotion is created by following the quickstart. This file is a preparation checklist, not publication evidence.

## Feedback and measurement

Use the issue templates for bug reports and voluntary usage feedback. A report that someone ran the sample is separate from a report that they integrated their own service. Never attach live registry data.

Once a week, record the repository's **Insights → Traffic** visitor/clone/referrer totals and the Star count. Traffic is a rolling 14-day view, so overlapping snapshots must not be summed as unique people. Clones and Stars are not active users. Record voluntary reports of a successful integration and continued use separately; do not invent adoption counts.

## Reference documentation

- [GitHub Topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [GitHub social preview requirements](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- [Creating and managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Repository traffic](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)
