# Changelog

## Unreleased

No version has been tagged. `v0.1.0` is a proposed first tagged release, subject to the release checklist and maintainer approval. The source is MIT licensed.

- Task-private lifecycle helper that awaits work and normal close, retaining both failures when needed.
- Opt-in Windows Node service registration with process identity checks, work gates, idle/expiry checks and authenticated cooperative shutdown.
- Cleanup CLI and optional schedule manager defaulting to preview; no automatic installation or existing task replacement.
- Fail-closed handling for a safety callback that incorrectly returns a Promise, observing rejection without shutting down the service.
- Synthetic offline tests, a private-listener example, a scoped Skill and English/Traditional Chinese introduction.
- Source provenance, MIT license (including the installable Skill), integration and removal instructions, contributor guidance and release gates.

No claimed production integration, public adoption, memory benchmark or executed CI run accompanies this candidate.
