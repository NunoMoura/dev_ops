import * as vscode from 'vscode';

export interface TaskContext {
    taskId: string;
    phase: string;
    description?: string;
}

export interface AgentAdapter {
    readonly id: string;
    readonly name: string;

    /**
     * Checks if the agent environment is available/installed.
     */
    isAvailable(): Promise<boolean>;

    /**
     * Starts a session with the given context.
     * @param context The task context to preload.
     */
    startSession(context: TaskContext): Promise<void>;
}
