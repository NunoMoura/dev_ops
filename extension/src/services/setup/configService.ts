import * as path from 'path';
import { Workspace } from '../../types';

export interface DeveloperConfig {
    name: string;
    email?: string;
}

export interface ProjectConfig {
    developer?: DeveloperConfig;
    projectType?: 'greenfield' | 'brownfield' | 'fresh' | 'skip';
    githubWorkflowsEnabled?: boolean;
    selectedIDEs?: string[];
    [key: string]: any;
}

export class ConfigService {
    constructor(private workspace: Workspace) { }

    private getConfigPath(): string {
        return path.join(this.workspace.root, '.dev_ops', 'config.json');
    }

    public async readConfig(): Promise<ProjectConfig> {
        const configPath = this.getConfigPath();
        if (!await this.workspace.exists(configPath)) {
            return {};
        }

        try {
            const content = await this.workspace.readFile(configPath);
            return JSON.parse(content) as ProjectConfig;
        } catch (error) {
            console.error(`[ConfigService] Failed to read config: ${error}`);
            return {};
        }
    }

    public async writeConfig(config: ProjectConfig): Promise<void> {
        const configPath = this.getConfigPath();
        const dir = path.dirname(configPath);

        if (!await this.workspace.exists(dir)) {
            await this.workspace.mkdir(dir);
        }

        await this.workspace.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    public async updateConfig(updates: Partial<ProjectConfig>): Promise<ProjectConfig> {
        const config = await this.readConfig();

        // Handle nested developer update
        if (updates.developer) {
            config.developer = {
                ...(config.developer || {}),
                ...updates.developer
            };
            delete (updates as any).developer;
        }

        Object.assign(config, updates);
        await this.writeConfig(config);
        return config;
    }

    public async getDeveloperName(): Promise<string | undefined> {
        const config = await this.readConfig();
        return config.developer?.name;
    }
}
