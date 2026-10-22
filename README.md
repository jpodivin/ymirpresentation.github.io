# Ymir workflow presentation

A standalone, one-page guide to the current packaging workflow. The site is deliberately separate from the Python application and has no runtime API dependency.

The theme control follows the system color scheme on first visit and saves an explicit light or dark choice in local storage.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

## Publishing

The [Pages workflow](.github/workflows/pages.yml) checks and builds the site with pnpm on every push to `main`, then deploys `dist/` to GitHub Pages. It can also be started manually from the Actions tab. The build uses `/ymirpresentation.github.io/` as its Vite base path because this repository is a project site. The published address is <https://jpodivin.github.io/ymirpresentation.github.io/>.

Before the first deployment, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** in the GitHub repository. Commit and push `package.json`, `pnpm-lock.yaml`, `index.html`, `src/`, and the workflow; `node_modules/` and `dist/` are generated and ignored. For a local check of the published path, run `pnpm build --base=/ymirpresentation.github.io/` and inspect `dist/index.html`.

The source links in the page point to `packit/ai-workflows` at commit `08166678bc79a739a210d52114322f29e87930ae`, the inspected upstream revision. The entry and routing map follows `ymir/jira_issue_fetcher/jira_issue_fetcher.py`, `ymir/agents/triage_agent.py`, and `ymir/common/constants.py`. Sweep behavior and schedules follow `ymir/sweep/*.py` and the four `openshift/cronjob-sweep-*.yml` manifests. Package validation follows `README-agents.md`, `ymir/tools/privileged/copr.py`, and `docs/reproducer_architecture.md`.

The presentation reflects conditional paths in the implementation: modular fixes skip Copr and reproducer enqueue; standalone rebuild skips Copr; a verified existing reproducer needs no new MR; no-patch sweeps requeue without a separate blocker check. CronJobs do not set `spec.timeZone`, so the page presents the `04:00` schedule without claiming a UTC execution time.

The map ends at MR review. Older README diagrams mention a supervisor and release workflow, but that is outside the current packaging path represented here. Some sweep modules still import shared utilities from `ymir/supervisor`; those imports do not imply a supervisor handoff.
