const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    console.log('Connected!');
    conn.exec('grep -n "duration != null" /root/soprano-api/src/chat/chat.gateway.ts | head -10 && echo "---" && grep -n "origin: true" /root/soprano-api/src/main.ts && echo "---" && pm2 list', (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('close', () => conn.end());
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
    });
}).connect({
    host: 'api.sopranochat.com',
    port: 22,
    username: 'root',
    password: 'ifr3N3dHPXfU'
});
