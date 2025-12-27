# Multi-Agent DevOps Dashboard

VS Code-first orchestration platform where multiple agents and developers collaborate through a shared board.

---

## Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│ VS Code / Cursor / Antigravity / Any Fork                           │
├─────────────────────────────┬───────────────────────────────────────┤
│                             │  ┌─────────────────────────────────┐  │
│                             │  │ [Gemini ▼] [Claude] [O1] [+]   │  │  ← Agent CLI Selector
│      Editor Area            │  ├─────────────────────────────────┤  │
│    (unchanged)              │  │ $ gemini                        │  │  ← Terminal Instance
│                             │  │ > Working on TASK-001...        │  │
│                             │  └─────────────────────────────────┘  │
├─────────────────────────────┴───────────────────────────────────────┤
│  Embedded Kanban Dashboard (Webview)                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Backlog │ │Planning │ │Implement│ │ Review  │ │  Done   │       │
│  │ TASK-04 │ │ TASK-02 │ │TASK-01 ●│ │         │ │ TASK-00 │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│  Status Bar: TASK-001 • Gemini • implementing                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Core Principle:** The board is the source of truth. Any agent (Gemini, Claude, Cursor, etc.) or human can claim and work on tasks by following the same protocol. Agents work **together**, not just at the same time.

---

## Architecture

### Layer 1: Data (board.json)

```json
{
  "tasks": [{
    "id": "TASK-001",
    "title": "Implement auth",
    "columnId": "implementing",
    "assignee": "gemini-cli",
    "assigneeType": "agent",
    "statusMessage": "Writing tests...",
    "blockedBy": [],
    "lastUpdate": "2024-12-27T10:30:00Z"
  }]
}
```

### Layer 2: VS Code Extension

```
extension/src/
├── ui/
│   ├── terminalManager.ts    # Multi-agent terminal tabs
│   ├── agentViewProvider.ts  # Sidebar with agent selector
│   └── providers.ts          # Tree data providers
├── services/
│   ├── agentRegistry.ts      # Track active agents
│   └── boardStore.ts         # Read/write board.json
├── boardView.ts              # Embedded Kanban Webview
├── statusBar.ts              # Current task indicator
└── extension.ts              # Entry point
```

### Layer 3: Agent Protocol

Any agent participates via CLI:

```bash
# 1. Claim task
python scripts/kanban_ops.py claim TASK-001 --assignee=gemini --type=agent

# 2. Update status
python scripts/kanban_ops.py update TASK-001 --status-message="Writing tests..."

# 3. Do the work
gemini -p "$(cat rules/development_phases/implementing.md)"

# 4. Mark ready + release
python scripts/kanban_ops.py update TASK-001 --column=reviewing
python scripts/kanban_ops.py release TASK-001
```

### Layer 4: Browser Dashboard (Optional - Phase 5)

Same React components as Webview, served via FastAPI for:
- PMs/stakeholders without IDE access
- Mobile quick-check
- Team standups

---

## Implementation Phases

### Phase 1: Terminal Manager (~20h)

- [ ] Create `terminalManager.ts` with agent CLI registry
- [ ] Add terminal panel with agent selector (dropdown/tabs)
- [ ] Connect terminal sessions to VS Code lifecycle
- [ ] Register configuration for custom agent CLIs

### Phase 2: Kanban Webview Enhancements (~8h)

- [ ] Add agent badges on assigned task cards
- [ ] Real-time status indicators (🟢🟡🔵🔴)
- [ ] Show `blockedBy` dependencies visually
- [ ] Display `statusMessage` on cards

### Phase 3: Single Agent Integration (~10h)

- [ ] Create `phase_worker.sh` wrapper script
- [ ] Add `claim`, `release`, `update` commands to `kanban_ops.py`
- [ ] Test complete cycle: claim → work → update → release
- [ ] Validate Gemini CLI integration

### Phase 4: Multi-Agent Orchestration (~15h)

- [ ] Create `agentRegistry.ts` for concurrent agent tracking
- [ ] Implement conflict resolution (double-claim prevention)
- [ ] Add dependency-aware task queuing
- [ ] Activity log in sidebar

### Phase 5: Polish + Optional Browser (~15h)

- [ ] Status bar enhancements
- [ ] Extract Webview components to shared module
- [ ] Optional: FastAPI + Vite dashboard for browser
- [ ] Documentation and user guide

**Total: ~68h** (browser adds ~15h if needed)

---

## CLI Wrapper Example

```bash
#!/bin/bash
# phase_worker.sh - Orchestrated agent work cycle
TASK_ID=$1
PHASE=$2
AGENT=${3:-gemini}

# Claim
python3 scripts/kanban_ops.py claim "$TASK_ID" --assignee="$AGENT" --type=agent

# Update status
python3 scripts/kanban_ops.py update "$TASK_ID" --status-message="Starting $PHASE phase..."

# Run agent with phase-specific prompt
$AGENT -p "$(cat rules/development_phases/${PHASE}.md | sed "s/{{TASK_ID}}/$TASK_ID/g")"

# Mark ready for next phase
python3 scripts/kanban_ops.py update "$TASK_ID" --status-message="Ready for review"
python3 scripts/kanban_ops.py release "$TASK_ID"
```

---

## Key Differentiator

> **"Antigravity runs agents at the same time. We help them work together."**

| Aspect | Antigravity/Cursor | This Framework |
|--------|-------------------|----------------|
| Model | Parallel silos | Coordinated collaboration |
| Agents aware of each other? | ❌ No | ✅ Yes (shared board) |
| Agent A can wait on Agent B? | ❌ No concept | ✅ `blockedBy` field |
| Swap agents freely? | ❌ Locked in | ✅ Any CLI |
| Works outside IDE? | ❌ | ✅ CLI + optional browser |

---

## What Gets Refactored

| Current | Action |
|---------|--------|
| agentViewProvider.ts | Refactor → add terminal selector |
| boardView.ts | Enhance → agent badges, status indicators |
| kanban_ops.py | Extend → claim/release/update commands |
| Phase rules | Keep → used as prompts by agents |
| board.json | Extend → new optional fields |

---

## Future Possibilities

1. **Role-based access** – Agents can only do certain phases
2. **Agent specialization** – Gemini for research, Claude for docs
3. **Cost tracking** – Token usage per task
4. **CI/CD as agent** – GitHub Actions claims tasks
5. **Historical analytics** – Time per phase, success rates
6. **Auto-claim watchers** – Agents auto-claim when dependencies resolve
