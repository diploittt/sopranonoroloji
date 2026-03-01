
async function main() {
    console.log('--- TEST API LOGIN ---');
    try {
        const response = await fetch('http://localhost:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'ownertest',
                password: 'testpass123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login Success:', data);
        } else {
            console.log('Login Failed. Status:', response.status);
            console.log('Data:', data);
        }
    } catch (error: any) {
        console.log('Request Error:', error.message);
    }
}

main();
