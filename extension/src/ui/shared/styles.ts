import * as vscode from 'vscode';

/**
 * Shared Design System for DevOps Extension
 * 
 * This module provides a sophisticated, premium monochromatic design system
 * with status colors as the only bright accents.
 */

// ============================================================================
// STATUS COLORS (Only Bright Accents)
// ============================================================================

export const STATUS_COLORS = {
  READY: '#3b82f6',           // Blue: Task is ready for agent
  AGENT_ACTIVE: '#22c55e',    // Green: Agent is actively working
  NEEDS_FEEDBACK: '#f97316',  // Orange: User action required
  BLOCKED: '#ef4444',         // Red: Task is blocked
  DONE: '#6b7280',            // Gray: Task is complete
} as const;

// VS Code Theme Color mappings for status
export const STATUS_THEME_COLORS = {
  READY: 'charts.blue',
  AGENT_ACTIVE: 'charts.green',
  NEEDS_FEEDBACK: 'charts.orange',
  BLOCKED: 'charts.red',
  DONE: undefined, // Use default gray
} as const;

// ============================================================================
// FONT LOADING
// ============================================================================

export function getFontLink(webview?: vscode.Webview, extensionUri?: vscode.Uri): string {
  if (webview && extensionUri) {
    try {
      const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'assets', 'codicons', 'codicon.css'));
      return `
            <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
            <link href="${codiconUri}" rel="stylesheet" />
        `;
    } catch (e) {
      console.warn('Failed to generate local codicon URI, falling back to CDN', e);
    }
  }

  // Fallback to CDN
  return `
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/vscode-codicons/0.0.17/codicon.min.css" rel="stylesheet">
  `;
}

// ============================================================================
// CSS STYLES
// ============================================================================

export function getSharedStyles(): string {
  return `<style>
    /* ========================================
       DESIGN TOKENS
       ======================================== */
    
    :root {
      /* Status Colors */
      --status-ready: ${STATUS_COLORS.READY};
      --status-agent-active: ${STATUS_COLORS.AGENT_ACTIVE};
      --status-needs-feedback: ${STATUS_COLORS.NEEDS_FEEDBACK};
      --status-blocked: ${STATUS_COLORS.BLOCKED};
      --status-done: ${STATUS_COLORS.DONE};
      
      /* Brand Colors - Removed custom brand gradients in favor of Native Theme */
      
      /* Shadows (Subtle Elevation - using native widget shadows if possible, or keeping subtle defaults) */
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
      --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.12);
      
      /* Borders (Alpha-based) */
      --border-subtle: var(--vscode-widget-border, rgba(255, 255, 255, 0.08));
      --border-normal: var(--vscode-widget-border, rgba(255, 255, 255, 0.12));
      --border-strong: var(--vscode-focusBorder, rgba(255, 255, 255, 0.16));
      
      /* Spacing Scale */
      --space-xs: 4px;
      --space-sm: 6px;
      --space-md: 8px;
      --space-lg: 12px;
      --space-xl: 16px;
      --space-2xl: 24px;
      
      /* Typography Scale */
      --text-xs: 10px;
      --text-sm: 11px;
      --text-base: 12px;
      --text-md: 13px;
      --text-lg: 14px;
      --text-xl: 16px;
      --text-2xl: 18px;
      
      /* Transition Timings */
      --transition-fast: 0.1s;
      --transition-normal: 0.15s;
      --transition-slow: 0.3s;
      
      /* Font Weights */
      --weight-normal: 400;
      --weight-medium: 500;
      --weight-semibold: 600;
      --weight-bold: 700;
    }
    
    /* ========================================
       BASE STYLES
       ======================================== */
    
    body {
      font-family: 'IBM Plex Sans', var(--vscode-font-family), sans-serif;
      font-size: var(--text-base);
      font-weight: var(--weight-normal);
      margin: 0;
      padding: var(--space-lg);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    
    /* ========================================
       TYPOGRAPHY
       ======================================== */
    
    h1, h2, h3, h4, h5, h6 {
      margin: 0;
      font-weight: var(--weight-semibold);
      line-height: 1.3;
    }
    
    h2 {
      font-size: var(--text-xl);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-lg);
    }
    
    h3 {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-md);
    }
    
    label {
      display: block;
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-xs);
      letter-spacing: 0.01em;
    }
    
    .label-caps {
      text-transform: uppercase;
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      letter-spacing: 0.05em;
      opacity: 0.85;
    }
    
    /* ========================================
       BUTTONS
       ======================================== */
    
    button {
      font-family: 'IBM Plex Sans', var(--vscode-font-family), sans-serif;
      cursor: pointer;
      transition: all var(--transition-normal) ease;
    }
    
    .btn-ghost {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px; /* Native standard usually 2px or 4px */
      padding: var(--space-md) var(--space-xl);
      color: var(--vscode-textLink-foreground);
      font-weight: var(--weight-medium);
      font-size: var(--text-base);
    }
    
    .btn-ghost:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
      color: var(--vscode-textLink-activeForeground);
      border-color: transparent;
    }
    
    .btn-ghost:active {
      transform: translateY(0);
    }
    
    .btn-primary {
      background: var(--vscode-button-background);
      border: 1px solid transparent;
      border-radius: 2px; /* VS Code buttons are often sharper */
      padding: 6px 14px;
      color: var(--vscode-button-foreground);
      font-weight: var(--weight-medium);
      font-size: var(--text-base);
      font-family: var(--vscode-font-family);
    }
    
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
      cursor: pointer;
      /* Remove custom transforms/shadows to feel native */
    }
    
    .btn-primary:active {
      transform: translateY(0);
    }
    
    .btn-danger {
      background: transparent;
      border: 1px solid var(--status-blocked);
      border-radius: 6px;
      padding: var(--space-md) var(--space-xl);
      color: var(--status-blocked);
      font-weight: var(--weight-semibold);
      font-size: var(--text-base);
    }
    
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
      box-shadow: var(--shadow-sm);
    }
    
    .btn-small {
      padding: var(--space-xs) var(--space-md);
      font-size: var(--text-sm);
      border-radius: 4px;
    }
    
    /* ========================================
       CARDS & SURFACES
       ======================================== */
    
    .card {
      background: var(--vscode-sideBar-background); /* Blend with background for native list look, or editor-background */
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
      padding: var(--space-lg);
      /* Remove shadow for cleaner look or make very subtle */
    }
    
    .card-elevated {
      background: var(--vscode-editor-background);
      border: 1px solid var(--border-normal);
      border-radius: 8px;
      padding: var(--space-lg);
      box-shadow: var(--shadow-md);
      transition: all var(--transition-normal) ease;
    }
    
    .card-elevated:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
    }
    
    /* ========================================
       FORM INPUTS
       ======================================== */
    
    input[type="text"],
    input[type="email"],
    input[type="password"],
    textarea,
    select {
      width: 100%;
      box-sizing: border-box;
      padding: var(--space-md);
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: 'IBM Plex Sans', var(--vscode-font-family), sans-serif;
      font-size: var(--text-base);
      transition: all var(--transition-normal) ease;
    }
    
    input[type="text"]:focus,
    input[type="email"]:focus,
    input[type="password"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder), var(--shadow-sm);
    }
    
    textarea {
      min-height: 80px;
      resize: vertical;
    }
    
    /* ========================================
       BADGES
       ======================================== */
    
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 2px var(--space-md);
      border-radius: 4px;
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      letter-spacing: 0.02em;
    }
    
    .badge-status {
      border: 1px solid;
      background: transparent;
    }
    
    .badge-status.ready {
      color: var(--status-ready);
      border-color: var(--status-ready);
      background: rgba(59, 130, 246, 0.1);
    }
    
    .badge-status.agent-active {
      color: var(--status-agent-active);
      border-color: var(--status-agent-active);
      background: rgba(34, 197, 94, 0.1);
    }
    
    .badge-status.needs-feedback {
      color: var(--status-needs-feedback);
      border-color: var(--status-needs-feedback);
      background: rgba(249, 115, 22, 0.1);
    }
    
    .badge-status.blocked {
      color: var(--status-blocked);
      border-color: var(--status-blocked);
      background: rgba(239, 68, 68, 0.1);
    }
    
    .badge-status.done {
      color: var(--status-done);
      border-color: var(--status-done);
      background: rgba(107, 114, 128, 0.1);
    }
    
    .badge-neutral {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-subtle);
      color: var(--vscode-descriptionForeground);
    }
    
    /* ========================================
       DIVIDERS
       ======================================== */
    
    .divider {
      height: 1px;
      background: var(--border-subtle);
      margin: var(--space-lg) 0;
    }
    
    .divider-strong {
      height: 1px;
      background: var(--border-normal);
      margin: var(--space-xl) 0;
    }
    
    /* ========================================
       UTILITIES
       ======================================== */
    
    .hidden {
      display: none !important;
    }
    
    .text-muted {
      color: var(--vscode-descriptionForeground);
      opacity: 0.85;
    }
    
    .text-xs { font-size: var(--text-xs); }
    .text-sm { font-size: var(--text-sm); }
    .text-base { font-size: var(--text-base); }
    .text-md { font-size: var(--text-md); }
    .text-lg { font-size: var(--text-lg); }
    .text-xl { font-size: var(--text-xl); }
    
    .font-normal { font-weight: var(--weight-normal); }
    .font-medium { font-weight: var(--weight-medium); }
    .font-semibold { font-weight: var(--weight-semibold); }
    .font-bold { font-weight: var(--weight-bold); }
    
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-xs { gap: var(--space-xs); }
    .gap-sm { gap: var(--space-sm); }
    .gap-md { gap: var(--space-md); }
    .gap-lg { gap: var(--space-lg); }
  </style>`;
}

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

export function getCSPMeta(): string {
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https: data:; font-src vscode-resource: https: data:; style-src 'unsafe-inline' vscode-resource: https:; script-src 'unsafe-inline' vscode-resource:; worker-src 'none'; connect-src https:;" />`;
}
