/**
 * Performance monitoring utilities for debugging slow operations
 */

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private timers: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  public startTimer(operationName: string): void {
    this.timers.set(operationName, Date.now());
  }

  /**
   * End timing an operation and log if it's slow
   */
  public endTimer(operationName: string, warnThreshold: number = 1000): number {
    const startTime = this.timers.get(operationName);
    if (!startTime) {
      console.warn(`No timer found for operation: ${operationName}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationName);

    // Store measurement
    if (!this.measurements.has(operationName)) {
      this.measurements.set(operationName, []);
    }
    this.measurements.get(operationName)!.push(duration);

    // Warn if operation is slow
    if (duration > warnThreshold) {
      console.warn(`⚠️ Slow operation detected: ${operationName} took ${duration}ms`);
    } else {
      console.log(`✅ ${operationName} completed in ${duration}ms`);
    }

    return duration;
  }

  /**
   * Get performance statistics for an operation
   */
  public getStats(operationName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const measurements = this.measurements.get(operationName);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    return {
      count: measurements.length,
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
    };
  }

  /**
   * Clear all measurements for debugging
   */
  public clearStats(): void {
    this.measurements.clear();
    this.timers.clear();
  }

  /**
   * Log all performance statistics
   */
  public logAllStats(): void {
    console.log("📊 Performance Statistics:");
    for (const [operation, measurements] of this.measurements.entries()) {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`  ${operation}: avg=${stats.average.toFixed(0)}ms, count=${stats.count}, min=${stats.min}ms, max=${stats.max}ms`);
      }
    }
  }
}

// Helper functions for easy use
const perfMonitor = PerformanceMonitor.getInstance();

export const startPerformanceTimer = (operationName: string) => {
  perfMonitor.startTimer(operationName);
};

export const endPerformanceTimer = (operationName: string, warnThreshold?: number) => {
  return perfMonitor.endTimer(operationName, warnThreshold);
};

export const getPerformanceStats = (operationName: string) => {
  return perfMonitor.getStats(operationName);
};

export const logAllPerformanceStats = () => {
  perfMonitor.logAllStats();
};

export const clearPerformanceStats = () => {
  perfMonitor.clearStats();
};

/**
 * Wrapper function to time async operations
 */
export const timeAsyncOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  warnThreshold?: number
): Promise<T> => {
  startPerformanceTimer(operationName);
  try {
    const result = await operation();
    endPerformanceTimer(operationName, warnThreshold);
    return result;
  } catch (error) {
    endPerformanceTimer(operationName, warnThreshold);
    throw error;
  }
};

/**
 * Check device storage status and warn if low
 */
export const checkDevicePerformance = () => {
  // This is a placeholder - in a real app you'd use react-native-device-info
  console.log("📱 Device Performance Check:");
  console.log("  Note: High storage usage (95%+) can severely impact app performance");
  console.log("  Consider clearing cache, temporary files, or unused apps");
  console.log("  Android devices perform best with <80% storage usage");
};