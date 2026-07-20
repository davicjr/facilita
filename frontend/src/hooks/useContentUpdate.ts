import { useEffect, useRef } from 'react';

// Event emitter simples para notificar atualizações de conteúdo
class ContentUpdateEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener());
  }
}

const contentUpdateEmitter = new ContentUpdateEmitter();

export function useContentUpdate(onUpdate: () => void) {
  const callbackRef = useRef(onUpdate);

  // Mantém a ref atualizada
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  // Inscreve apenas uma vez
  useEffect(() => {
    const listener = () => {
      callbackRef.current();
    };
    const unsubscribe = contentUpdateEmitter.subscribe(listener);
    return unsubscribe;
  }, []);
}

export function notifyContentUpdate() {
  contentUpdateEmitter.notify();
}
