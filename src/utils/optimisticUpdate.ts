/**
 * Optimistic Update Manager
 * Implements optimistic UI updates with rollback on failure
 */

type RollbackFunction = () => void;

interface OptimisticUpdate<T> {
  id: string;
  data: T;
  rollback: RollbackFunction;
  timestamp: number;
  committed: boolean;
}

class OptimisticUpdateManager {
  private updates: Map<string, OptimisticUpdate<any>> = new Map();
  private updateCounter: number = 0;

  /**
   * Apply optimistic update
   */
  apply<T>(
    data: T,
    rollback: RollbackFunction
  ): string {
    const id = `update_${++this.updateCounter}`;
    
    this.updates.set(id, {
      id,
      data,
      rollback,
      timestamp: Date.now(),
      committed: false,
    });

    console.log(`[Optimistic] Applied update ${id}`);
    return id;
  }

  /**
   * Commit optimistic update
   */
  commit(id: string): void {
    const update = this.updates.get(id);
    if (!update) return;

    update.committed = true;
    console.log(`[Optimistic] Committed update ${id}`);
    
    // Clean up after delay
    setTimeout(() => this.updates.delete(id), 5000);
  }

  /**
   * Rollback optimistic update
   */
  rollback(id: string): void {
    const update = this.updates.get(id);
    if (!update) return;

    console.log(`[Optimistic] Rolling back update ${id}`);
    update.rollback();
    this.updates.delete(id);
  }

  /**
   * Rollback all uncommitted updates
   */
  rollbackAll(): void {
    this.updates.forEach((update, id) => {
      if (!update.committed) {
        this.rollback(id);
      }
    });
  }

  /**
   * Clear all updates
   */
  clear(): void {
    this.updates.clear();
  }
}

// Export singleton
export const optimisticManager = new OptimisticUpdateManager();

/**
 * Helper for optimistic state updates
 */
export async function withOptimisticUpdate<T, R>(
  optimisticUpdate: () => void,
  rollback: () => void,
  asyncOperation: () => Promise<R>
): Promise<R> {
  // Apply optimistic update
  optimisticUpdate();
  const updateId = optimisticManager.apply(null, rollback);

  try {
    // Perform async operation
    const result = await asyncOperation();
    
    // Commit on success
    optimisticManager.commit(updateId);
    
    return result;
  } catch (error) {
    // Rollback on failure
    optimisticManager.rollback(updateId);
    throw error;
  }
}
