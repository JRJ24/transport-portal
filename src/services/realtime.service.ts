import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { tokenManager } from '@/lib/axios';
import type { LiveLocation } from '@/services/tms.service';

const socketBase = window.location.hostname.includes('localhost')
  ? import.meta.env.VITE_SOCKET_URL_DEV || window.location.origin
  : import.meta.env.VITE_SOCKET_URL_PROD || window.location.origin;

export function createTrackingSocket(): Socket | null {
  const token = tokenManager.get();

  if (!token) {
    return null;
  }

  return io(socketBase, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}

export function useLiveLocations(orderIds: string[] = []) {
  const [locations, setLocations] = useState<Record<string, LiveLocation>>({});
  const orderIdsKey = orderIds.join('|');

  useEffect(() => {
    const socket = createTrackingSocket();

    if (!socket) {
      return undefined;
    }

    const ids = orderIdsKey ? orderIdsKey.split('|').filter(Boolean) : [];
    ids.forEach((orderId) => socket.emit('tracking:join-order', { orderId }));

    const updateLocation = (location: LiveLocation) => {
      setLocations((current) => ({ ...current, [location.orderId]: location }));
    };

    socket.on('tracking:location', updateLocation);
    socket.on('tracking:location.updated', updateLocation);

    return () => {
      ids.forEach((orderId) => socket.emit('tracking:leave-order', { orderId }));
      socket.disconnect();
    };
  }, [orderIdsKey]);

  return Object.values(locations);
}
