/**
 * Data module - Data access layer
 * 
 * This module provides all data access functionality including:
 * - Board file I/O (boardStore)
 * - Board business operations (boardRepository)
 * - Python CLI wrapper (pythonCli)
 */

// Python CLI wrapper (Deprecated/Removed)
// export * from './pythonCli';

// Board storage (file I/O)
export * from './boardStore';

// Board repository (business operations)
export { BoardService, boardService } from './boardRepository';
