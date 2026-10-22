import './style.css'

// Keep links pinned to the same inspected upstream revision as the claims below.
const revision = '08166678bc79a739a210d52114322f29e87930ae'
const source = (path: string, line?: number) =>
  `https://github.com/packit/ai-workflows/blob/${revision}/${path}${line ? `#L${line}` : ''}`

type Reference = { label: string; path?: string; line?: number; href?: string }
type Step = {
  id: string
  number: string
  eyebrow: string
  title: string
  summary: string
  detail: string
  signal: string
  refs: Reference[]
  kind?: string
}

const steps: Step[] = [
  {
    id: 'intake', number: '01', eyebrow: 'ENTRY', title: 'Jira intake',
    summary: 'Scheduled scans find eligible issues and authorized maintainer requests.',
    detail: 'The normal fetcher runs every 15 minutes against the <a href="https://redhat.atlassian.net/issues/?filter=108880" target="_blank" rel="noopener noreferrer">Jira filter</a>. A separate 5-minute scan picks up maintainer requests. The fetcher verifies who made the request, removes duplicate work, and marks issues before processing.',
    signal: '15 min scan · 5 min request scan',
    refs: [{ label: 'Fetcher', path: 'ymir/jira_issue_fetcher/jira_issue_fetcher.py', line: 609 }, { label: 'Jira filter', href: 'https://redhat.atlassian.net/issues/?filter=108880' }, { label: 'Scan schedules', path: 'openshift/cronjob-jira-issue-fetcher.yml', line: 10 }, { label: 'Todo schedule', path: 'openshift/cronjob-jira-issue-fetcher-todo.yml', line: 9 }]
  },
  {
    id: 'queues', number: '02', eyebrow: 'HANDOFF', title: 'Work handoff',
    summary: 'Tasks wait until a worker is ready; maintainer requests are prioritized.',
    detail: 'Tasks wait until a worker is ready. Maintainer requests are handled first, and fix work goes to the right package stream.',
    signal: 'issue scan → triage → fix',
    refs: [{ label: 'Triage worker', path: 'ymir/agents/triage_agent.py', line: 2116 }]
  },
  {
    id: 'triage', number: '03', eyebrow: 'DECISION', title: 'Triage',
    summary: 'Reads the issue, checks applicability, and selects a resolution.',
    detail: 'Triage may select rebase, backport, rebuild, not affected, postponement, clarification, or open-ended analysis. Actionable fixes move to the appropriate workstream. Other resolutions may finish without a package MR or enter a waiting loop. An optional reproducer follows its own criteria.',
    signal: 'ymir_triaged_rebase / backport / rebuild',
    refs: [{ label: 'Triage dispatch', path: 'ymir/agents/triage_agent.py', line: 2020 }, { label: 'Resolution model', path: 'ymir/common/models.py', line: 250 }, { label: 'Reproducer gate', path: 'docs/reproducer_architecture.md', line: 129 }]
  },
  {
    id: 'rebase', number: '04A', eyebrow: 'FIX PATH', title: 'Rebase',
    summary: 'Update a package to a requested newer upstream version.',
    detail: 'Triage uses this route when the issue asks for a rebase or update. The worker prepares the package change and normally submits its SRPM to Copr before filing an MR. Modular issues skip Copr, and an ordinary build timeout may allow the workflow to continue.',
    signal: 'package updated → merge request',
    refs: [{ label: 'Resolution rule', path: 'README-agents.md', line: 29 }, { label: 'Triage route', path: 'ymir/agents/triage_agent.py', line: 2077 }, { label: 'Build branch', path: 'ymir/agents/rebase_agent.py', line: 420 }], kind: 'route'
  },
  {
    id: 'backport', number: '04B', eyebrow: 'FIX PATH', title: 'Backport',
    summary: 'Apply the specific upstream fix to the target package stream.',
    detail: 'The worker selects and applies the fix, resolves conflicts, and normally submits the SRPM to Copr before opening an MR. Modular issues skip Copr, and an ordinary build timeout may allow the workflow to continue. Eligible backport MRs are included in consolidation by default; packages can opt out.',
    signal: 'fix applied → merge request',
    refs: [{ label: 'Agent overview', path: 'README-agents.md', line: 30 }, { label: 'Triage route', path: 'ymir/agents/triage_agent.py', line: 2081 }, { label: 'Build branch', path: 'ymir/agents/backport_agent.py', line: 1348 }, { label: 'Consolidation behavior', path: 'ymir/agents/backport_agent.py', line: 1835 }], kind: 'route'
  },
  {
    id: 'rebuild', number: '04C', eyebrow: 'FIX PATH', title: 'Rebuild',
    summary: 'Rebuild a package when a dependency change calls for it.',
    detail: 'Triage sends rebuild work to the appropriate package stream. A standalone rebuild skips the shared Copr validation stage. Eligible rebuild MRs are included in consolidation by default; packages can opt out.',
    signal: 'package rebuilt → merge request',
    refs: [{ label: 'Triage route', path: 'ymir/agents/triage_agent.py', line: 2085 }, { label: 'Build exception', path: 'README-agents.md', line: 173 }, { label: 'Consolidation behavior', path: 'ymir/agents/rebuild_agent.py', line: 360 }], kind: 'route'
  },
  {
    id: 'validation', number: '05', eyebrow: 'EVIDENCE', title: 'Package validation',
    summary: 'Applicable Copr builds and optional Testing Farm reproducers provide evidence.',
    detail: 'Non-modular rebase and backport paths use BuildWorkflow: build_package submits and polls a Copr SRPM build, with failure diagnosis when build logs are available. A package-enabled, non-modular reproducer can run in parallel and attempt verification on Testing Farm. Reuse of an existing passing test needs no new MR. Standalone rebuild skips Copr.',
    signal: 'Copr build · optional Testing Farm test',
    refs: [{ label: 'Build workflow', path: 'ymir/agents/build_agent.py', line: 48 }, { label: 'Copr tool', path: 'ymir/tools/privileged/copr.py', line: 98 }, { label: 'Reproducer gate', path: 'ymir/agents/triage_agent.py', line: 2095 }, { label: 'MR decision', path: 'ymir/agents/reproducer_agent.py', line: 379 }]
  },
  {
    id: 'review', number: '06', eyebrow: 'HANDOFF', title: 'MR + human review',
    summary: 'The package change reaches a merge request for maintainer review.',
    detail: 'Agents publish merge requests for proposed package changes. Reviewers need to inspect the selected fix, spec changes, build evidence, and security implications before merging. The packaging map ends at this handoff.',
    signal: 'merge request → maintainer decision',
    refs: [{ label: 'Project overview', path: 'README.md', line: 5 }, { label: 'Human review', path: 'README.md', line: 29 }]
  }
]

const waiting = [
  { id: 'dependency', title: 'Dependency', time: 'Every 6 hours', cron: '0 */6 * * *', label: 'ymir_postponed_dependency', check: 'Check the blocker’s Fixed in Build and confirm that build is in the target buildroot.', path: 'ymir/sweep/dependency.py', schedule: 'openshift/cronjob-sweep-dependency.yml' },
  { id: 'y-stream', title: 'Y-stream CVE', time: 'Every 12 hours', cron: '0 */12 * * *', label: 'ymir_postponed_y_stream', check: 'Re-run CVE triage eligibility; wait while Z-stream clone dependencies are pending.', path: 'ymir/sweep/y_stream.py', schedule: 'openshift/cronjob-sweep-y-stream.yml' },
  { id: 'pr', title: 'Pending PR / MR', time: 'Every 8 hours', cron: '0 */8 * * *', label: 'ymir_postponed_pr_pending', check: 'Query the upstream GitHub PR or GitLab MR. Merge returns to triage; closure moves to no-patch.', path: 'ymir/sweep/pr_pending.py', schedule: 'openshift/cronjob-sweep-pr-pending.yml' },
  { id: 'patch', title: 'No patch yet', time: 'Daily at 04:00', cron: '0 4 * * *', label: 'ymir_postponed_no_patch', check: 'Return up to 20 eligible issues to triage without a blocker check; triage decides whether a patch now exists.', path: 'ymir/sweep/no_patch.py', schedule: 'openshift/cronjob-sweep-no-patch.yml' }
]

const links = (refs: Reference[]) => refs.map(ref => `<a href="${ref.href ?? source(ref.path!, ref.line)}" target="_blank" rel="noopener noreferrer">${ref.label}<span aria-hidden="true"> ↗</span></a>`).join('')
const selected = (step: Step) => `<div class="detail-top"><span class="detail-index">${step.number} / ${step.eyebrow}</span><span class="detail-live">SOURCE VERIFIED</span></div><h3 id="detail-title">${step.title}</h3><p>${step.detail}</p><div class="detail-bottom"><div><span class="mini-label">WORKFLOW SIGNAL</span><code>${step.signal}</code></div><div><span class="mini-label">INSPECT SOURCE</span><div class="source-links">${links(step.refs)}</div></div></div>`

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Ymir, back to top"><span class="brand-mark">Y</span><span>YMIR<span class="brand-light"> / WORKFLOWS</span></span></a>
      <nav aria-label="Main navigation"><a href="#map">The map</a><a href="#waiting">Waiting loop</a><a href="#validation">Validation</a></nav>
      <button type="button" class="theme-toggle" aria-label="Dark mode" aria-pressed="false"><span class="theme-icon" aria-hidden="true">◐</span><span class="theme-label">Dark mode</span></button>
      <span class="header-tag">ENGINEER FIELD GUIDE <span class="tag-dot"></span> 2026</span>
    </header>

    <main id="main">
      <section id="top" class="hero page-width" aria-labelledby="hero-title">
        <div class="hero-copy"><div class="section-kicker"><span class="kicker-line"></span> THE PACKAGING PATH, EXPLAINED</div><h1 id="hero-title">From issue<br>to <em>review.</em></h1><p class="hero-deck">Follow a Jira issue through Ymir’s workflow. Explore the branches, the reasons work waits, and the evidence produced before a human merges.</p><a class="primary-link" href="#map">Explore the workflow <span aria-hidden="true">↗</span></a></div>
        <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><span class="orbit-node node-a"></span><span class="orbit-node node-b"></span><span class="orbit-node node-c"></span><div class="hero-center"><span>ISSUE</span><strong>→</strong><span>MR</span></div><div class="art-caption">A system of decisions<br>and deliberate handoffs.</div></div>
      </section>

      <section id="map" class="workflow-section section-pad" aria-labelledby="map-title"><div class="page-width">
        <div class="section-heading"><div><div class="section-kicker"><span class="kicker-line"></span> 01 / THE MAP</div><h2 id="map-title">One issue. Several possible routes.</h2></div><p>Choose a node to inspect its stage, behavior, and source. Actionable fix routes can reach an MR; validation depends on the route.</p></div>
        <div class="workflow-board" aria-label="Interactive packaging workflow map">
          <div class="board-row board-main" role="group" aria-label="Intake and triage">
            ${steps.slice(0,3).map(s => `<button type="button" class="flow-node" data-step="${s.id}" aria-pressed="false"><span class="node-number">${s.number} <span aria-hidden="true">↗</span></span><strong>${s.title}</strong><small>${s.summary}</small></button>`).join('<span class="flow-arrow" aria-hidden="true">→</span>')}
          </div>
          <div class="branch-label"><span aria-hidden="true">↓</span> TRIAGE RESOLUTION</div>
          <div class="board-row board-branches" role="group" aria-label="Fix routes">
            ${steps.slice(3,6).map(s => `<button type="button" class="flow-node branch-node" data-step="${s.id}" aria-pressed="false"><span class="node-number">${s.number} <span aria-hidden="true">↗</span></span><strong>${s.title}</strong><small>${s.summary}</small></button>`).join('')}
          </div>
          <div class="branch-label"><span aria-hidden="true">↓</span> VALIDATION WHERE APPLICABLE · MR HANDOFF</div>
          <div class="board-row board-end" role="group" aria-label="Validation and review">
            ${steps.slice(6).map(s => `<button type="button" class="flow-node" data-step="${s.id}" aria-pressed="false"><span class="node-number">${s.number} <span aria-hidden="true">↗</span></span><strong>${s.title}</strong><small>${s.summary}</small></button>`).join('<span class="flow-arrow" aria-hidden="true">→</span>')}
          </div>
          <div class="board-aside"><span class="aside-symbol" aria-hidden="true">↗</span><div><strong>Conditional and no-MR outcomes</strong><p>A package-enabled <button type="button" class="text-button" data-jump="validation">reproducer</button> may run beside a fix or after a not-affected result. By default, eligible backport and rebuild MRs are grouped for review; packages can opt out of <a href="#consolidation">MR consolidation</a>. Other triage outcomes may wait or finish without a package MR.</p></div></div>
        </div>
        <div id="step-detail" class="step-detail" aria-live="polite" aria-atomic="true">${selected(steps[0])}</div>
      </div></section>

      <section id="waiting" class="waiting-section section-pad" aria-labelledby="waiting-title"><div class="page-width">
        <div class="section-heading"><div><div class="section-kicker"><span class="kicker-line"></span> 02 / THE WAITING LOOP</div><h2 id="waiting-title">Paused work stays in view.</h2></div><p>Postponed resolutions receive a Jira label. Sweeps check blockers or requeue no-patch issues for fresh triage.</p></div>
        <div class="loop-banner"><span class="loop-pulse" aria-hidden="true"></span><span>POSTPONED LABEL</span><b aria-hidden="true">→</b><span>SCHEDULED SWEEP</span><b aria-hidden="true">→</b><span>WHEN READY: TRIAGE</span><b aria-hidden="true">↺</b></div>
        <div class="waiting-grid">${waiting.map((item, index) => `<article class="wait-card"><div class="wait-top"><span class="wait-index">0${index+1} / ${item.title}</span><span class="wait-time">${item.time}</span></div><h3>${item.title}</h3><p>${item.check}</p><div class="wait-meta"><span class="mini-label">JIRA LABEL</span><code>${item.label}</code><span class="mini-label">CRON · ${item.cron}</span></div><div class="source-links">${links([{label:'Sweep logic', path:item.path}, {label:'Schedule', path:item.schedule, line:9}])}</div></article>`).join('')}</div>
        <div class="manual-hold"><span class="hold-icon" aria-hidden="true">◇</span><div><strong>A separate human-triggered hold</strong><p>When package rules disable automatic creation of a missing internal z-stream branch, Ymir sets <code>ymir_manual_branch_needed</code>. A maintainer creates the branch and adds <code>ymir_todo</code> to the primary issue to resume triage.</p><div class="source-links">${links([{label:'Triage hold',path:'ymir/agents/triage_agent.py',line:524},{label:'Branch policy',path:'README-agents.md',line:43},{label:'Label behavior',path:'jira_label_workflow_routing.md',line:104}])}</div></div></div>
      </div></section>

      <section id="validation" class="validation-section section-pad" aria-labelledby="validation-title"><div class="page-width">
        <div class="section-heading"><div><div class="section-kicker"><span class="kicker-line"></span> 03 / PACKAGE EVIDENCE</div><h2 id="validation-title">Validation follows the route.</h2></div><p>Copr builds and reproducer tests are separate paths. Which one runs depends on the resolution and package configuration.</p></div>
        <div class="validation-grid"><article class="validation-card"><span class="card-overline">BUILD PATH / 01</span><div class="validation-icon" aria-hidden="true">▦</div><h3>Copr build</h3><p>Non-modular rebase and backport paths use a shared workflow to submit an SRPM to Copr and poll its result. Available build logs can drive failure diagnosis. Ordinary timeouts may still allow an MR; inherited changes and consolidated builds require a successful build when that stage runs.</p><div class="route-pill">NON-MODULAR REBASE + BACKPORT · MR CONSOLIDATION</div><p class="fine-print">Modular fixes and standalone rebuilds skip this Copr stage.</p><div class="source-links">${links([{label:'Build workflow',path:'ymir/agents/build_agent.py',line:48},{label:'Modular rebase',path:'ymir/agents/rebase_agent.py',line:426},{label:'Modular backport',path:'ymir/agents/backport_agent.py',line:1348},{label:'Rebuild exception',path:'README-agents.md',line:173}])}</div></article>
        <article class="validation-card accent-card"><span class="card-overline">TEST PATH / 02</span><div class="validation-icon" aria-hidden="true">⌁</div><h3>Testing Farm reproducer</h3><p>When the triage flag and package rule enable it, a non-modular rebase, backport, rebuild, or not-affected result can start a parallel reproducer. The agent attempts to verify a new, reused, or adapted test on Testing Farm. For a new or adapted test, tmt lint must pass before an MR can be opened or updated. An existing passing test needs no new MR.</p><div class="route-pill">PACKAGE RULE + TRIAGE FLAG · NON-MODULAR</div><p class="fine-print">This path runs independently of fix work and does not require Copr validation.</p><div class="source-links">${links([{label:'Triage gate',path:'ymir/agents/triage_agent.py',line:2095},{label:'Package config',path:'ymir/agents/triage_agent.py',line:224},{label:'tmt lint gate',path:'ymir/agents/reproducer_agent.py',line:1022},{label:'MR decision',path:'ymir/agents/reproducer_agent.py',line:379},{label:'Testing Farm path',path:'docs/reproducer_architecture.md',line:260}])}</div></article></div>
        <aside id="consolidation" class="consolidation"><div class="consolidation-tag">DEFAULT MR PATH</div><h3>Several fixes, one reviewable MR.</h3><p>By default, eligible backport and rebuild changes are grouped into one MR for review. Packages can opt out; no configuration is needed to enable consolidation. Automatic grouping requires at least two open MRs for the same branch, including a backport. Maintainers can also request a specific group through Jira. The consolidated change runs Copr validation when an SRPM is available.</p><div class="source-links">${links([{label:'Submission behavior',path:'ymir/agents/tasks.py',line:1657},{label:'Targeted requests',path:'ymir/agents/mr_consolidation_agent.py',line:324},{label:'Automatic grouping',path:'ymir/agents/mr_consolidation_agent.py',line:491},{label:'Branch eligibility',path:'ymir/agents/mr_consolidation_agent.py',line:614},{label:'Copr stage',path:'ymir/agents/mr_consolidation_agent.py',line:794}])}</div></aside>
      </div></section>

    </main>
    <footer class="site-footer"><div class="page-width footer-inner"><div><span class="footer-brand">YMIR / WORKFLOWS</span><p>A concise map of the current packaging path.</p></div><div><span class="mini-label">SOURCE SNAPSHOT</span><a href="https://github.com/packit/ai-workflows/tree/${revision}" target="_blank" rel="noopener noreferrer"><code>${revision.slice(0,12)}</code> ↗</a></div></div></footer>
  </div>`

const detail = document.querySelector<HTMLElement>('#step-detail')!
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-step]')]
function activate(id: string, moveFocus = false) {
  const step = steps.find(item => item.id === id)
  if (!step) return
  for (const button of buttons) {
    const active = button.dataset.step === id
    button.setAttribute('aria-pressed', String(active))
    button.classList.toggle('is-active', active)
    if (active && moveFocus) button.focus()
  }
  detail.innerHTML = selected(step)
}
for (const button of buttons) {
  button.addEventListener('click', () => activate(button.dataset.step!))
  button.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = buttons.indexOf(button)
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    activate(buttons[next].dataset.step!, true)
  })
}
document.querySelector<HTMLButtonElement>('[data-jump="validation"]')?.addEventListener('click', () => {
  activate('validation')
  detail.scrollIntoView({ behavior: 'smooth', block: 'center' })
})
const themeToggle = document.querySelector<HTMLButtonElement>('.theme-toggle')!
function syncThemeToggle() {
  const dark = document.documentElement.dataset.theme === 'dark'
  themeToggle.setAttribute('aria-pressed', String(dark))
}
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  try { localStorage.setItem('ymir-theme', next) } catch { /* Theme still changes for this visit. */ }
  syncThemeToggle()
})
syncThemeToggle()
activate('intake')
