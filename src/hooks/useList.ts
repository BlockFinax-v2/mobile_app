import { useState, useCallback, useMemo } from 'react';

/**
 * List management hook with filtering, searching, and pagination
 */
export function useList<T>(initialItems: T[] = []) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Add item
  const addItem = useCallback((item: T) => {
    setItems(prev => [item, ...prev]);
  }, []);

  // Update item
  const updateItem = useCallback((predicate: (item: T) => boolean, updater: (item: T) => T) => {
    setItems(prev => prev.map(item => predicate(item) ? updater(item) : item));
  }, []);

  // Remove item
  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems(prev => prev.filter(item => !predicate(item)));
  }, []);

  // Clear all items
  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  // Reset to initial items
  const resetItems = useCallback(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Filtered and sorted items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply search
    if (searchQuery) {
      result = result.filter(item => {
        const searchableFields = Object.values(item as any)
          .filter(value => typeof value === 'string')
          .join(' ')
          .toLowerCase();
        return searchableFields.includes(searchQuery.toLowerCase());
      });
    }

    // Apply filter
    if (filter) {
      // This is a generic filter - implement specific logic based on your needs
      result = result.filter(item => {
        // Example: if item has a 'status' field, filter by it
        const itemAny = item as any;
        if ('status' in itemAny) {
          return itemAny.status === filter || filter === 'All';
        }
        return true;
      });
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [items, searchQuery, filter, sortField, sortDirection]);

  // Sort by field
  const sortBy = useCallback((field: keyof T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  return {
    // Data
    items: processedItems,
    allItems: items,
    
    // State
    searchQuery,
    filter,
    sortField,
    sortDirection,
    
    // Actions
    addItem,
    updateItem,
    removeItem,
    clearItems,
    resetItems,
    setItems,
    
    // Filtering/Sorting
    setSearchQuery,
    setFilter,
    sortBy,
    
    // Computed
    isEmpty: processedItems.length === 0,
    count: processedItems.length,
    totalCount: items.length,
  };
}

/**
 * Pagination hook
 */
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentItems,
    currentPage,
    totalPages,
    itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
    goToPage,
    nextPage,
    previousPage,
    reset,
  };
}

/**
 * Selection hook for lists with checkboxes
 */
export function useSelection<T>(
  items: T[],
  getId: (item: T) => string | number = (item: any) => item.id
) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const toggleSelection = useCallback((item: T) => {
    const id = getId(item);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [getId]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(getId(item));
  }, [selectedIds, getId]);

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(getId(item)));
  }, [items, selectedIds, getId]);

  return {
    selectedIds: Array.from(selectedIds),
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    hasSelection: selectedIds.size > 0,
    isAllSelected: selectedIds.size === items.length && items.length > 0,
  };
}