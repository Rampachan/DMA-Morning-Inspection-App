import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
}

/**
 * Subscribes to device network state and returns a live snapshot.
 * `isConnected` is true only when both connected AND internet-reachable.
 */
export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    // Fetch initial state
    NetInfo.fetch().then((s: NetInfoState) => {
      setState({
        isConnected: !!(s.isConnected && s.isInternetReachable),
        isInternetReachable: !!s.isInternetReachable,
      });
    });

    const unsubscribe = NetInfo.addEventListener((s: NetInfoState) => {
      setState({
        isConnected: !!(s.isConnected && s.isInternetReachable),
        isInternetReachable: !!s.isInternetReachable,
      });
    });

    return unsubscribe;
  }, []);

  return state;
}
