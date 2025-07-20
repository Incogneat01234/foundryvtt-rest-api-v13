/**
 * Foundry VTT REST API - Performance Monitor
 * 
 * Real-time monitoring of WebSocket performance and debug logs
 */

console.log('%c=== REST API Performance Monitor ===', 'color: #9c27b0; font-size: 16px; font-weight: bold');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            errors: 0,
            averageLatency: 0,
            latencies: [],
            messageTypes: {},
            startTime: Date.now()
        };
        
        this.isMonitoring = false;
        this.originalSend = null;
        this.logBuffer = [];
        this.maxLogBuffer = 100;
    }
    
    start() {
        if (this.isMonitoring) {
            console.warn('Monitor already running');
            return;
        }
        
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module?.api?.getWebSocketManager();
        
        if (!wsManager) {
            console.error('WebSocket manager not found');
            return;
        }
        
        console.log('%c🚀 Starting performance monitoring...', 'color: #4caf50; font-weight: bold');
        this.isMonitoring = true;
        this.metrics.startTime = Date.now();
        
        // Hook into WebSocket send method
        this.originalSend = wsManager.send.bind(wsManager);
        wsManager.send = (data) => {
            const timestamp = Date.now();
            const result = this.originalSend(data);
            
            if (result) {
                this.metrics.messagesSent++;
                this.metrics.messageTypes[data.type] = (this.metrics.messageTypes[data.type] || 0) + 1;
                
                // Track latency if we have a requestId
                if (data.requestId) {
                    this.trackLatency(data.requestId, timestamp);
                }
            } else {
                this.metrics.errors++;
            }
            
            return result;
        };
        
        // Hook into console methods to capture logs
        this.hookConsole();
        
        // Start display update
        this.displayInterval = setInterval(() => this.displayMetrics(), 1000);
    }
    
    stop() {
        if (!this.isMonitoring) {
            console.warn('Monitor not running');
            return;
        }
        
        console.log('%c🛑 Stopping performance monitoring...', 'color: #f44336; font-weight: bold');
        this.isMonitoring = false;
        
        // Restore original send method
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module?.api?.getWebSocketManager();
        if (wsManager && this.originalSend) {
            wsManager.send = this.originalSend;
        }
        
        // Stop display updates
        if (this.displayInterval) {
            clearInterval(this.displayInterval);
        }
        
        // Unhook console
        this.unhookConsole();
        
        // Display final metrics
        this.displayFinalReport();
    }
    
    hookConsole() {
        const monitor = this;
        const originalLog = console.log;
        const originalDebug = console.debug;
        const originalInfo = console.info;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        // Helper to capture logs
        const captureLog = (level, args) => {
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            
            // Only capture REST API logs
            if (message.includes('foundry-rest-api')) {
                monitor.logBuffer.push({
                    timestamp: Date.now(),
                    level,
                    message
                });
                
                // Keep buffer size limited
                if (monitor.logBuffer.length > monitor.maxLogBuffer) {
                    monitor.logBuffer.shift();
                }
            }
        };
        
        // Override console methods
        console.log = function(...args) {
            captureLog('log', args);
            originalLog.apply(console, args);
        };
        
        console.debug = function(...args) {
            captureLog('debug', args);
            originalDebug.apply(console, args);
        };
        
        console.info = function(...args) {
            captureLog('info', args);
            originalInfo.apply(console, args);
        };
        
        console.warn = function(...args) {
            captureLog('warn', args);
            originalWarn.apply(console, args);
        };
        
        console.error = function(...args) {
            captureLog('error', args);
            monitor.metrics.errors++;
            originalError.apply(console, args);
        };
        
        // Store originals for restoration
        this.originalConsole = {
            log: originalLog,
            debug: originalDebug,
            info: originalInfo,
            warn: originalWarn,
            error: originalError
        };
    }
    
    unhookConsole() {
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.debug = this.originalConsole.debug;
            console.info = this.originalConsole.info;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
        }
    }
    
    trackLatency(requestId, sentTime) {
        // Store sent time for latency calculation
        this.pendingRequests = this.pendingRequests || {};
        this.pendingRequests[requestId] = sentTime;
        
        // Clean up old pending requests after 30 seconds
        setTimeout(() => {
            delete this.pendingRequests[requestId];
        }, 30000);
    }
    
    displayMetrics() {
        const elapsed = (Date.now() - this.metrics.startTime) / 1000;
        const rate = this.metrics.messagesSent / elapsed;
        
        // Clear console and display metrics
        console.clear();
        console.log('%c=== REST API Performance Monitor ===', 'color: #9c27b0; font-size: 16px; font-weight: bold');
        console.log(`%c⏱️  Uptime: ${elapsed.toFixed(0)}s`, 'color: #2196f3');
        console.log(`%c📤 Messages Sent: ${this.metrics.messagesSent} (${rate.toFixed(1)}/sec)`, 'color: #4caf50');
        console.log(`%c📥 Messages Received: ${this.metrics.messagesReceived}`, 'color: #4caf50');
        console.log(`%c❌ Errors: ${this.metrics.errors}`, 'color: #f44336');
        
        if (this.metrics.latencies.length > 0) {
            const avgLatency = this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length;
            console.log(`%c⚡ Average Latency: ${avgLatency.toFixed(1)}ms`, 'color: #ff9800');
        }
        
        // Message type breakdown
        console.log('\n%c📊 Message Types:', 'color: #673ab7; font-weight: bold');
        const sortedTypes = Object.entries(this.metrics.messageTypes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        sortedTypes.forEach(([type, count]) => {
            const percentage = ((count / this.metrics.messagesSent) * 100).toFixed(1);
            console.log(`  ${type}: ${count} (${percentage}%)`);
        });
        
        // Recent logs
        console.log('\n%c📜 Recent Logs:', 'color: #795548; font-weight: bold');
        const recentLogs = this.logBuffer.slice(-10);
        recentLogs.forEach(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const levelColor = {
                'debug': '#888',
                'log': '#333',
                'info': '#4a90e2',
                'warn': '#ff9800',
                'error': '#f44336'
            }[log.level] || '#333';
            
            console.log(`%c[${time}] ${log.message.substring(0, 100)}...`, `color: ${levelColor}; font-size: 11px`);
        });
        
        // Connection status
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module?.api?.getWebSocketManager();
        const isConnected = wsManager?.isConnected() || false;
        console.log(`\n%c🔌 WebSocket Status: ${isConnected ? 'Connected' : 'Disconnected'}`, 
            `color: ${isConnected ? '#4caf50' : '#f44336'}; font-weight: bold`);
    }
    
    displayFinalReport() {
        const elapsed = (Date.now() - this.metrics.startTime) / 1000;
        
        console.log('\n%c📈 Final Performance Report', 'color: #2196f3; font-size: 14px; font-weight: bold');
        console.log(`Total Duration: ${elapsed.toFixed(1)}s`);
        console.log(`Total Messages: ${this.metrics.messagesSent}`);
        console.log(`Average Rate: ${(this.metrics.messagesSent / elapsed).toFixed(2)} msg/sec`);
        console.log(`Error Rate: ${((this.metrics.errors / this.metrics.messagesSent) * 100).toFixed(1)}%`);
        
        // Save metrics for analysis
        window.foundrRestApiMetrics = this.metrics;
        console.log('\n%cMetrics saved to: window.foundrRestApiMetrics', 'color: #666; font-style: italic');
    }
    
    // Utility methods
    reset() {
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            errors: 0,
            averageLatency: 0,
            latencies: [],
            messageTypes: {},
            startTime: Date.now()
        };
        this.logBuffer = [];
        console.log('%c✨ Metrics reset', 'color: #4caf50');
    }
    
    exportLogs() {
        const data = {
            metrics: this.metrics,
            logs: this.logBuffer,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rest-api-monitor-${Date.now()}.json`;
        a.click();
        
        console.log('%c💾 Logs exported', 'color: #4caf50');
    }
}

// Create global monitor instance
window.restApiMonitor = new PerformanceMonitor();

// Auto-start monitoring if WebSocket is connected
const module = game.modules.get('foundry-rest-api');
if (module?.api?.getWebSocketManager()?.isConnected()) {
    console.log('\n%c🔄 Auto-starting performance monitor...', 'color: #2196f3');
    window.restApiMonitor.start();
} else {
    console.log('\n%c📚 Performance Monitor Commands:', 'color: #9c27b0; font-weight: bold');
    console.log('window.restApiMonitor.start() - Start monitoring');
    console.log('window.restApiMonitor.stop() - Stop monitoring');
    console.log('window.restApiMonitor.reset() - Reset metrics');
    console.log('window.restApiMonitor.exportLogs() - Export logs to file');
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+M to toggle monitor
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        if (window.restApiMonitor.isMonitoring) {
            window.restApiMonitor.stop();
        } else {
            window.restApiMonitor.start();
        }
    }
    
    // Ctrl+Shift+R to reset metrics
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        window.restApiMonitor.reset();
    }
});

console.log('\n%c⌨️  Keyboard Shortcuts:', 'color: #ff5722');
console.log('Ctrl+Shift+M - Toggle monitor');
console.log('Ctrl+Shift+R - Reset metrics');