// @ts-nocheck
// src/ts/utils/logger.ts
import { moduleId } from "../constants";

/**
 * Utility for module logging with debug mode support
 */
export class ModuleLogger {
  /**
   * Check if debug mode is enabled
   */
  static debugLevel(): number {
    // Default to debug level if settings aren't registered yet
    try {
      return game.settings.get(moduleId, "logLevel") as number;
    } catch (e) {
      // Settings not registered yet, default to debug (0)
      return 0;
    }
  }

  /**
   * Get timestamp for log messages
   */
  private static getTimestamp(): string {
    const now = new Date();
    return `[${now.toISOString()}]`;
  }

  /**
   * Format the caller information
   */
  private static getCallerInfo(): string {
    try {
      const err = new Error();
      const stack = err.stack?.split('\n');
      if (stack && stack.length > 3) {
        const callerLine = stack[3];
        const match = callerLine.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
        if (match) {
          const [, functionName, , line] = match;
          return `[${functionName}:${line}]`;
        }
      }
    } catch (e) {
      // Ignore errors in getting caller info
    }
    return '';
  }

  /**
   * Log a debug message (only when debug mode is enabled)
   */
  static debug(message: string, ...args: any[]): void {
    if (this.debugLevel() < 1) {
      const timestamp = this.getTimestamp();
      const caller = this.getCallerInfo();
      console.log(`%c${moduleId} ${timestamp} DEBUG ${caller} | ${message}`, 'color: #888', ...args);
    }
  }

  /**
   * Log info message
   */
  static info(message: string, ...args: any[]): void {
    if (this.debugLevel() < 2) {
      const timestamp = this.getTimestamp();
      const caller = this.getCallerInfo();
      console.log(`%c${moduleId} ${timestamp} INFO ${caller} | ${message}`, 'color: #4a90e2', ...args);
    }
  }

  /**
   * Log warning message
   */
  static warn(message: string, ...args: any[]): void {
    if (this.debugLevel() < 3) {
      const timestamp = this.getTimestamp();
      const caller = this.getCallerInfo();
      console.warn(`%c${moduleId} ${timestamp} WARN ${caller} | ${message}`, 'color: #ff9800', ...args);
    }
  }

  /**
   * Log error message
   */
  static error(message: string, ...args: any[]): void {
    if (this.debugLevel() < 4) {
      const timestamp = this.getTimestamp();
      const caller = this.getCallerInfo();
      console.error(`%c${moduleId} ${timestamp} ERROR ${caller} | ${message}`, 'color: #f44336', ...args);
    }
  }

  /**
   * Log function entry (debug level)
   */
  static functionEntry(functionName: string, params?: any): void {
    this.debug(`→ Entering ${functionName}`, params ? { params } : '');
  }

  /**
   * Log function exit (debug level)
   */
  static functionExit(functionName: string, result?: any): void {
    this.debug(`← Exiting ${functionName}`, result !== undefined ? { result } : '');
  }

  /**
   * Log WebSocket traffic (debug level)
   */
  static websocket(direction: 'send' | 'receive', data: any): void {
    const arrow = direction === 'send' ? '→' : '←';
    this.debug(`WebSocket ${arrow}`, data);
  }
}