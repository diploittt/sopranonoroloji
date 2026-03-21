// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PeerServer } = require('peer');

const peerServer = PeerServer({
    port: 9000,
    path: '/myapp',
    proxied: true,
});

peerServer.on('connection', (client) => {
    console.log(`[PeerServer] Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
    console.log(`[PeerServer] Client disconnected: ${client.getId()}`);
});

console.log('[PeerServer] Running on port 9000');
