/**
 * Event Listener Manager
 * Efficiently manages blockchain event subscriptions with automatic cleanup
 */

type EventHandler = (...args: any[]) => void;
type UnsubscribeFunction = () => void;

interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  contract: any;
  filter?: any;
}

class EventListenerManager {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private subscriptionCounter: number = 0;

  /**
   * Subscribe to blockchain event with automatic cleanup
   */
  subscribe(
    contract: any,
    eventName: string,
    handler: EventHandler,
    filter?: any
  ): UnsubscribeFunction {
    const id = `sub_${++this.subscriptionCounter}`;
    
    // Set up event listener
    if (filter) {
      contract.on(filter, handler);
    } else {
      contract.on(eventName, handler);
    }

    // Store subscription
    this.subscriptions.set(id, {
      id,
      event: eventName,
      handler,
      contract,
      filter,
    });

    console.log(`[Events] Subscribed to ${eventName} (${id})`);

    // Return unsubscribe function
    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe from event
   */
  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    // Remove listener
    if (subscription.filter) {
      subscription.contract.off(subscription.filter, subscription.handler);
    } else {
      subscription.contract.off(subscription.event, subscription.handler);
    }

    this.subscriptions.delete(id);
    console.log(`[Events] Unsubscribed from ${subscription.event} (${id})`);
  }

  /**
   * Unsubscribe from all events
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((_, id) => this.unsubscribe(id));
  }

  /**
   * Get active subscriptions count
   */
  getActiveCount(): number {
    return this.subscriptions.size;
  }
}

// Export singleton
export const eventManager = new EventListenerManager();

/**
 * React hook for automatic event cleanup
 */
export function useBlockchainEvent(
  contract: any | null,
  eventName: string,
  handler: EventHandler,
  deps: any[] = []
): void {
  const { useEffect } = require('react');

  useEffect(() => {
    if (!contract) return;

    const unsubscribe = eventManager.subscribe(contract, eventName, handler);
    
    return () => {
      unsubscribe();
    };
  }, [contract, eventName, ...deps]);
}
