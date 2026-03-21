const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('Connected!');
    
    // Step 1: Find the line numbers with the buggy pattern
    // Step 2: Use python to do the replacement (more reliable than sed for multiline)
    const cmd = `cd /root/soprano-api && \
python3 -c "
import re
with open('src/chat/chat.gateway.ts', 'r') as f:
    content = f.read()

# Pattern: const timer = setTimeout(() => {\\n      this.releaseSpeaker(roomId, 'timer_expired');\\n    }, duration);
# But NOT the ones that already have duration != null
old = '''    const timer = setTimeout(() => {
      this.releaseSpeaker(roomId, 'timer_expired');
    }, duration);'''

new = '''    // FIX: duration null ise timer olusturma
    const timer = duration != null ? setTimeout(() => {
      this.releaseSpeaker(roomId, 'timer_expired');
    }, duration) : null;'''

count = content.count(old)
print(f'Found {count} occurrences to fix')
if count > 0:
    content = content.replace(old, new)
    with open('src/chat/chat.gateway.ts', 'w') as f:
        f.write(content)
    print('Fixed!')
else:
    # Try with 4-space indent version
    old2 = '      const timer = setTimeout(() => {\\n        this.releaseSpeaker(roomId, \\'timer_expired\\');\\n      }, duration);'
    count2 = content.count(old2)
    print(f'Trying 6-space indent: found {count2}')
" && \
grep -c "duration != null" src/chat/chat.gateway.ts && \
npm run build 2>&1 | tail -3 && \
pm2 restart all && \
echo "=== DONE ==="`;
    
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
