import Peer from 'peerjs';

export const getPeer = (userId?: string) => {
    const peer = userId ? new Peer(userId, {
        host: 'localhost',
        port: 9000,
        path: '/peerjs',
        secure: false,
    }) : new Peer({
        host: 'localhost',
        port: 9000,
        path: '/peerjs',
        secure: false,
    });

    peer.on('disconnected', () => {
        console.log('Peer reconnecting...');
        peer.reconnect();
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
    });

    return peer;
};
