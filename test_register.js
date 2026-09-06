async function testRegister() {
    try {
        const res = await fetch('https://expense-tracker-production-1023.up.railway.app/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser123',
                email: 'test12345@example.com',
                password: 'password123'
            })
        });
        
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}
testRegister();
