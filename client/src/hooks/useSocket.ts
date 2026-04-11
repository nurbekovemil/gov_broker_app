import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Bond } from '../types';

type Handler = (bond: Bond) => void;

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function usePricesUpdated(handler: Handler) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const s = getSocket();
    const fn = (bond: Bond) => ref.current(bond);
    s.on('prices_updated', fn);
    return () => { s.off('prices_updated', fn); };
  }, []);
}
