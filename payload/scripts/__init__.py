"""DevOps Scripts - Agent-callable automation utilities for the dev_ops framework.

Scripts for agents to call directly:
- board_ops: Task management (claim, move, create_task, etc.)
- artifact_ops: Ephemeral artifacts & archives (plans, validations, bugs, research, task archives)
- doc_ops: Persistent documentation (architecture, stories, mockups, PRDs)
- project_ops: Project detection and rule generation (used in /bootstrap)
- git_ops: Git commit helpers and GitHub PR operations
"""

from . import artifact_ops, board_ops, doc_ops, git_ops, project_ops, utils

__all__ = [
    "board_ops",
    "artifact_ops",
    "doc_ops",
    "project_ops",
    "git_ops",
    "utils",
]
