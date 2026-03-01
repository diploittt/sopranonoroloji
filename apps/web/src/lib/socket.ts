import { io } from 'socket.io-client';
import { SOCKET_URL_BASE } from './api';

export const socket = io(SOCKET_URL_BASE, {
    autoConnect: false,
    transports: ['websocket'],
});
