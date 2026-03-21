const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('Connected! Fixing peer.ts and rebuilding...');
    
    // Fix peer.ts import and rebuild
    const cmd = `cd /root/soprano-api && sed -i "s/import { PeerServer } from 'peer'/const PeerServer = require('peer').PeerServer/" src/peer.ts && npm run build && pm2 restart all && echo "=== DEPLOY SUCCESS ==="`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('close', (code) => {
            console.log(`\nExit code: ${code}`);
            conn.end();
        });
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).connect({
    host: 'api.sopranochat.com',
    port: 22,
    username: 'root',
    password: 'ifr3N3dHPXfU'
});
