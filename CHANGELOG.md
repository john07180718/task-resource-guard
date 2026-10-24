# Changelog

## Unreleased

The proposed first pre-release is `v0.1.0-alpha.1`, subject to the release checklist and maintainer review. Prepared notes are in [docs/RELEASE-NOTES-v0.1.0-alpha.1.md](docs/RELEASE-NOTES-v0.1.0-alpha.1.md); a notes file is not a published release. The source is MIT licensed.

### Onboarding and feedback

- Reworked English and Traditional Chinese READMEs with a short first-run path and a clear distinction between examples, Skill installation and real-service integration.
- Added bilingual quickstarts and an isolated registered-service demo with two real loopback HTTP services. It verifies dry-run, protects an active HTTP request, confirms normal child exits and removes only its new synthetic workspace.
- Added tests for the full Windows demo, normal teardown after interruption, and rejection before resource creation on unsupported platforms.
- Added a read-only GitHub Actions workflow for Linux helper checks and Windows integration, plus guided bug-report and voluntary usage-feedback forms.
- Added original SVG/PNG project artwork, prepared pre-release notes, repository setup instructions and promotion drafts. These files do not apply settings, publish releases or send messages.

### Initial toolkit

- Task-private lifecycle helper that awaits work and normal close, retaining both failures when needed.
- Opt-in Windows Node service registration with process identity checks, work gates, idle/expiry checks and authenticated cooperative shutdown.
- Cleanup CLI and optional schedule manager defaulting to preview; no automatic installation or existing task replacement.
- Fail-closed handling for a safety callback that incorrectly returns a Promise, observing rejection without shutting down the service.
- Synthetic offline tests, a private-listener example, a scoped Skill and English/Traditional Chinese introduction.
- Source provenance, MIT license (including the installable Skill), integration and removal instructions, contributor guidance and release gates.

Production integration, public adoption and memory/performance benefits have not been established. Dated verification and CI evidence belong in [VALIDATION.md](VALIDATION.md).
