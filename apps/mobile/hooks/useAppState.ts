// ═══════════════════════════════════════════════════════════
// useAppState Hook — React Native AppState listener
// Background/foreground geçişlerinde socket davranışı yönetimi
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStateOptions {
  /**
   * Uygulama foreground'a döndüğünde çağrılır
   */
  onForeground?: () => void;
  /**
   * Uygulama background'a geçtiğinde çağrılır
   */
  onBackground?: () => void;
}

/**
 * React Native AppState listener hook
 * 
 * Kullanım:
 * ```
 * useAppState({
 *   onForeground: () => { store.connectSocket(...); },
 *   onBackground: () => { // keep alive — timeout sonrası disconnect },
 * });
 * ```
 */
export function useAppState({ onForeground, onBackground }: UseAppStateOptions) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      // Background → Foreground
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        onForeground?.();
      }

      // Foreground → Background
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        onBackground?.();
      }

      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [onForeground, onBackground]);

  return {
    currentState: appState.current,
  };
}
