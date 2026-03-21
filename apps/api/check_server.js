const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('Connected!');
    const commands = [
        'pm2 list',
        'head -50 /root/soprano-api/src/main.ts',
        'grep -n "enableCors\\|sopranoOrigins\\|origin" /root/soprano-api/src/main.ts',
    ];
    let i = 0;
    function next() {
        if (i >= commands.length) { conn.end(); return; }
        const cmd = commands[i++];
        console.log(`\n=== ${cmd} ===`);
        conn.exec(cmd, (err, stream) => {
            if (err) { console.error(err); next(); return; }
            stream.on('close', () => next());
            stream.on('data', d => process.stdout.write(d.toString()));
            stream.stderr.on('data', d => process.stderr.write(d.toString()));
        });
    }
    next();
}).connect({
    host: 'api.sopranochat.com',
    port: 22,
    username: 'root',
    password: 'ifr3N3dHPXfU'
});
