const submit = document.getElementById("submit");
const user = document.getElementById('user');
const pass = document.getElementById('pass');

submit.addEventListener('click', async () => {
    const data = {
        username: user.value,
        password: pass.value
    }
    try {
        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log(result);
        window.location.href = "https://3.14.101.196/new.html"
    } catch (error) {
        console.error("Error during login:", error);
    }
});

async function checkLogin() {
    try {
        const response = await fetch('/api/dashboard/');
        const data = await response.json();
        console.log(data.message);
        if (data.message == "log") {
            window.location.href = "https://3.14.101.196/new.html";
        }
    } catch (e) {
        console.error("Error fetching account info", e);
    }
}

checkLogin();
