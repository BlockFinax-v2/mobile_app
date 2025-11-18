import { useState, useCallback } from 'react';

/**
 * Modal management hook
 * Handles common modal state and actions
 */
export function useModal(initialState = false) {
  const [isVisible, setIsVisible] = useState(initialState);
  const [data, setData] = useState<any>(null);

  const show = useCallback((modalData?: any) => {
    setData(modalData);
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  return {
    isVisible,
    data,
    show,
    hide,
    toggle,
  };
}

/**
 * Multiple modals management hook
 * For screens that need multiple modals
 */
export function useModals<T extends Record<string, boolean>>(initialModals: T) {
  const [modals, setModals] = useState(initialModals);
  const [modalData, setModalData] = useState<Record<string, any>>({});

  const showModal = useCallback((modalName: keyof T, data?: any) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
    if (data) {
      setModalData(prev => ({ ...prev, [modalName]: data }));
    }
  }, []);

  const hideModal = useCallback((modalName: keyof T) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setModalData(prev => ({ ...prev, [modalName]: null }));
  }, []);

  const hideAllModals = useCallback(() => {
    setModals(initialModals);
    setModalData({});
  }, [initialModals]);

  const getModalData = useCallback((modalName: keyof T) => {
    return modalData[modalName as string];
  }, [modalData]);

  return {
    modals,
    showModal,
    hideModal,
    hideAllModals,
    getModalData,
  };
}