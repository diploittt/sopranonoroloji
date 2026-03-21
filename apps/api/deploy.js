const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('find / -name "worker.manager.ts" 2>/dev/null | head -n 1', (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('close', (code, signal) => {
            let path = '/root/soprano-api';
            console.log(`Using path: ${path}`);
            
            // SFTP ile dosyaları at
            conn.sftp((err, sftp) => {
                if (err) throw err;
                
                const localZipPath = 'c:/Users/yogun/Desktop/sopranochatnorolji/apps/api/api_update.zip';
                const remoteZipPath = `${path}/api_update.zip`;
                
                console.log('Uploading api_update.zip...');
                sftp.fastPut(localZipPath, remoteZipPath, (err) => {
                    if (err) console.error('SFTP error zip:', err);
                        
                    console.log('Upload complete, executing unzip, build & restart...');
                    const cmd = `cd ${path} && apt-get update && apt-get install -y unzip && unzip -o api_update.zip && npm install && npx prisma generate && npm run build && pm2 restart all`;
                    conn.exec(cmd, (err2, stream2) => {
                        if (err2) throw err2;
                        stream2.on('close', (code2, signal2) => {
                            console.log('Deploy complete, closing connection.');
                            conn.end();
                        }).on('data', (data) => {
                            process.stdout.write(data);
                        }).stderr.on('data', (data) => {
                            process.stderr.write(data);
                        });
                    });
                });
            });

        }).on('data', (data) => {
            output += data;
        }).stderr.on('data', (data) => {
            console.error('STDERR: ' + data);
        });
    });
}).connect({
    host: 'api.sopranochat.com',
    port: 22,
    username: 'root',
    password: 'ifr3N3dHPXfU'
});
