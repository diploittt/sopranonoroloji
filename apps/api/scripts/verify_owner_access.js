
const http = require('http');

function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: headers
        };
        http.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('🔍 Getting test token for "ownertest"...');
    const tokenRes = await get('http://localhost:3002/auth/test-token/ownertest');

    if (tokenRes.statusCode !== 201 && tokenRes.statusCode !== 200) {
        console.error('❌ Failed to get token:', tokenRes.statusCode, tokenRes.body);
        return;
    }

    const token = tokenRes.body.access_token;
    if (!token) {
        console.error('❌ No access_token in response:', tokenRes.body);
        return;
    }
    console.log('✅ Token received.');

    console.log('🔍 Fetching user list as Owner...');
    const usersRes = await get('http://localhost:3002/admin/users?limit=5', {
        'Authorization': `Bearer ${token}`
    });

    if (usersRes.statusCode !== 200) {
        console.error('❌ Failed to get users:', usersRes.statusCode, usersRes.body);
        return;
    }

    console.log('✅ User List Fetched Successfully!');
    const users = usersRes.body.users || usersRes.body; // Adjust based on actual response structure

    if (Array.isArray(users)) {
        console.log(`Found ${users.length} users in response (limit 5).`);
        users.forEach(u => console.log(` - [${u.role}] ${u.displayName} (${u.email})`));
    } else if (users.data && Array.isArray(users.data)) {
        console.log(`Found ${users.data.length} users in response (limit 5).`);
        users.data.forEach(u => console.log(` - [${u.role}] ${u.displayName} (${u.email})`));
    } else {
        console.log('Response:', users);
    }
}

main();
