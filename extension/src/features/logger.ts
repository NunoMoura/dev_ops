import * as vscode from 'vscode';

/**
 * Centralized logger for DevOps extension using VS Code output channel.
 * 
 * Replaces console.log statements with proper VS Code logging, viewable in
 * Output panel under "DevOps" channel.
 */
class DevOpsLogger {
    private static instance: DevOpsLogger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('DevOps');
    }

    public static getInstance(): DevOpsLogger {
        if (!DevOpsLogger.instance) {
            DevOpsLogger.instance = new DevOpsLogger();
        }
        return DevOpsLogger.instance;
    }

    /**
     * Log an informational message.
     */
    public log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Log a warning message.
     */
    public warn(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ⚠ ${message}`);
    }

    /**
     * Log an error message with optional error object.
     */
    public error(message: string, error?: unknown): void {
        const timestamp = new Date().toISOString();
        const errorDetails = error ? `: ${String(error)}` : '';
        this.outputChannel.appendLine(`[${timestamp}] ❌ ${message}${errorDetails}`);
    }

    /**
     * Show the output channel to the user.
     */
    public show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the output channel.
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}

// Export singleton access and convenience functions
export const logger = DevOpsLogger.getInstance();

export function log(message: string): void {
    logger.log(message);
}

export function warn(message: string): void {
    logger.warn(message);
}

export function error(message: string, err?: unknown): void {
    logger.error(message, err);
}
