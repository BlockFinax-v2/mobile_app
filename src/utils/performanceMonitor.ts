/**
 * Performance monitoring utility to detect slow operations
 * Helps identify bottlenecks especially on low-storage devices
 */

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep only last 100 metrics
  private slowOperationThreshold = 1000; // 1 second

  startOperation(operation: string): string {
    const id = `${operation}_${Date.now()}_${Math.random()}`;
    const metric: PerformanceMetric = {
      operation: `${operation}_${id}`,
      startTime: performance.now(),
      success: false,
    };
    
    this.metrics.push(metric);
    
    // Cleanup old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    return metric.operation;
  }

  endOperation(operationId: string, success: boolean = true, error?: string) {
    const metric = this.metrics.find(m => m.operation === operationId);
    if (!metric) return;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = success;
    metric.error = error;

    // Log slow operations
    if (metric.duration > this.slowOperationThreshold) {
      console.warn(`🐌 Slow operation detected: ${operationId} took ${metric.duration.toFixed(2)}ms`);
    }

    // Log on low storage devices for debugging
    if (this.isLowStorageDevice()) {
      console.log(`📊 ${operationId}: ${metric.duration?.toFixed(2)}ms (${success ? 'success' : 'failed'})`);
    }
  }

  private isLowStorageDevice(): boolean {
    // Heuristic: if we have many slow operations, likely low storage
    const recentSlowOps = this.metrics
      .filter(m => m.duration && m.duration > this.slowOperationThreshold)
      .slice(-10);
    
    return recentSlowOps.length > 3;
  }

  getSlowOperations(limit: number = 10) {
    return this.metrics
      .filter(m => m.duration && m.duration > this.slowOperationThreshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  getAverageOperationTime(operation: string) {
    const ops = this.metrics.filter(m => 
      m.operation.includes(operation) && m.duration !== undefined
    );
    
    if (ops.length === 0) return 0;
    
    const total = ops.reduce((sum, op) => sum + (op.duration || 0), 0);
    return total / ops.length;
  }

  logPerformanceSummary() {
    const slowOps = this.getSlowOperations(5);
    if (slowOps.length > 0) {
      console.log('🐌 Top slow operations:');
      slowOps.forEach(op => {
        console.log(`  - ${op.operation}: ${op.duration?.toFixed(2)}ms`);
      });
    }

    console.log('📊 Average operation times:');
    const operations = ['refresh_balance', 'refresh_transactions', 'switch_network'];
    operations.forEach(op => {
      const avg = this.getAverageOperationTime(op);
      if (avg > 0) {
        console.log(`  - ${op}: ${avg.toFixed(2)}ms`);
      }
    });
  }

  // Performance helper for async operations
  async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const opId = this.startOperation(operation);
    try {
      const result = await fn();
      this.endOperation(opId, true);
      return result;
    } catch (error) {
      this.endOperation(opId, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Export measurement decorator for easy use
export function withPerformanceMonitoring<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    return performanceMonitor.measureAsync(operation, () => fn(...args));
  };
}