# Project artwork

- `overview.svg`: original editable illustration used by the README, 1280 × 640.
- `social-preview.png`: raster export of the same illustration, 1280 × 640, intended for GitHub Settings → General → Social preview.

The artwork explains intended behavior. It is not a screenshot, a test result, or a memory/performance benchmark. Text and vectors were created for this project under its MIT license. The PNG was rendered from the SVG; no third-party photographs, logos or illustrations are included.

The source uses a system sans-serif stack. Rendering tools are only needed to regenerate the PNG; they are not runtime dependencies of Task Resource Guard.

## Verified CI output replay

`demo-replay.gif` is a 1280 × 640, 24-second loop replaying the five actual diagnostics from the successful Windows registered-service demo. The label **Verified CI output replay | timing adjusted** remains visible on every frame. It is a designed text replay, not a screen recording; reveal timing is adjusted for readability and does not represent runtime or a performance benchmark.

- Source: [Windows CI job 120915815964, run 40108746202](https://github.com/john07180718/task-resource-guard/actions/runs/40108746202/job/120915815964).
- Immutable source commit: [`77fef6c4720ed77ccc4a212ce536bbf2bb957ef0`](https://github.com/john07180718/task-resource-guard/commit/77fef6c4720ed77ccc4a212ce536bbf2bb957ef0).
- Environment: Windows Server 2022 (10.0.20348), Node.js 24.22.1, PowerShell 7.6.8.
- Evidence scope: this isolated demo completed successfully in that CI environment. The replay makes no claim about memory savings, speed improvements, or other product integrations.
- Provenance: the exact diagnostic strings are embedded in `render-demo-replay.py`; the typography and shapes were created for this project under its MIT license. No credentials, private paths, or full logs are included.

To reproduce, use Python with Pillow and DejaVu Sans fonts:

```shell
python docs/assets/render-demo-replay.py
```

The default font location is `/usr/share/fonts/truetype/dejavu`. Use `--font-dir` to provide a directory containing `DejaVuSans.ttf`, `DejaVuSans-Bold.ttf`, and `DejaVuSansMono.ttf` on another system. Pillow and fonts are rendering requirements only, not toolkit runtime dependencies.
