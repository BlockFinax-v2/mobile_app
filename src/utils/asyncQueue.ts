/**
 * Async Queue for Background Processing
 * Implements task queuing with priority, concurrency control, and retry logic
 */

export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

interface QueueTask<T> {
  id: string;
  fn: () => Promise<T>;
  priority: TaskPriority;
  retries: number;
  maxRetries: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class AsyncQueue {
  private queue: QueueTask<any>[] = [];
  private running: number = 0;
  private maxConcurrency: number;
  private taskCounter: number = 0;

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Add task to queue
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    priority: TaskPriority = TaskPriority.NORMAL,
    maxRetries: number = 2
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueueTask<T> = {
        id: `task_${++this.taskCounter}`,
        fn,
        priority,
        retries: 0,
        maxRetries,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(t => t.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(insertIndex, 0, task);
      }

      this.processQueue();
    });
  }

  /**
   * Process queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      // Retry logic
      if (task.retries < task.maxRetries) {
        task.retries++;
        console.log(`[Queue] Retrying task ${task.id} (${task.retries}/${task.maxRetries})`);
        
        // Re-add to queue with same priority
        this.queue.unshift(task);
      } else {
        console.error(`[Queue] Task ${task.id} failed after ${task.maxRetries} retries`);
        task.reject(error);
      }
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      pending: this.queue.length,
      running: this.running,
      capacity: this.maxConcurrency - this.running,
    };
  }
}

// Export singleton instance
export const asyncQueue = new AsyncQueue(3);

/**
 * Debounce utility for reducing function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
