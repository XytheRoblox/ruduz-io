let clicked = false;
document.getElementById("upd").addEventListener("click", () => {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("server-modal").style.display = "block";
});

function closeModal() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("server-modal").style.display = "none";
}
async function fetchPlan() {
    const nameRes = await fetch('/api/dashboard');
    const nameData = await nameRes.json();

                
    // Replace '/api/get-user-plan' with your actual endpoint
    const response = await fetch('/api/plan/' + nameData.account_name)
    const data = await response.json()

    document.getElementById("plan-name").innerText = data.plan;
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    // Any other initialization code...
    fetchPlan();
  });
  

// Handle option clicks
document.querySelectorAll(".option").forEach(opt => {
    opt.addEventListener("click", async () => {
        const type = opt.getAttribute("data-type");

        // Trigger server creation logic here
        alert("You selected: " + type);

        // TODO: Replace with real fetch to create server
        // await fetch(`/api/newServer?type=${type}`)
        if (clicked) return;
            clicked = true;

            try {
                alert("Creating new Server...");

                const nameRes = await fetch('/api/dashboard');
                const nameData = await nameRes.json();

                const response = await fetch('/api/newServer/' + nameData.account_name + '/' + type);
                const data = await response.json();

                if (!data.error) {
                    window.location.href = `https://3.14.101.196/servers/${data.id}/panel.html`;
                } else {
                    alert("ERROR: " + data.error);
                }
            } catch (e) {
                console.error("Error creating server:", e);
                alert("An error occurred while creating the server.");
            } finally {
                clicked = false;
            }
        closeModal();
    });
});

        
        async function checkLogin() {
            try {
                const response = await fetch('/api/dashboard/');
                const data = await response.json();

                

                if (data.message === "nolog") {
                    window.location.href = "https://3.14.101.196/login.html";
                } else {
                    document.getElementById("account-name").textContent = data.account_name;
                    const jsona = await fetch('/api/auth/currentPlan/' + data.account_name);
                    const planData = jsona.json();

                    if(planData.plan = "none") {
                        await fetch('/api/auth/choose-plan', {
                            method: "POST",
                            headers: {"Content-Type":"application/json"},
                            body: JSON.stringify({plan: "free"})
                        })
                    }
                }
                
            } catch (e) {
                console.error("Error fetching account info:", e);
                alert("Could not verify login.");
            }
        }

        async function fetchOwnedServers() {
            try {
                const nameRes = await fetch('/api/dashboard');
                const nameData = await nameRes.json();

                const response = await fetch('/api/ownedServers/' + nameData.account_name);
                const data = await response.json();

                const serverListDiv = document.getElementById("server-list");
                serverListDiv.innerHTML = "";

                if (data.servers.length > 0) {
                    data.servers.forEach(server => {
                        const statusIcon = server.on ? "🟢" : "🔴";
                        const serverItem = document.createElement("p");
                        serverItem.classList.add("server-item");
                        serverItem.textContent = `${server.ip}:${server.port} ${statusIcon}`;
                        serverItem.onclick = () => window.location.href = `/servers/${server.containerID}/panel.html`;
                        serverListDiv.appendChild(serverItem);
                    });
                } else {
                    serverListDiv.textContent = "No servers owned.";
                }
            } catch (e) {
                console.error("Error fetching servers:", e);
                document.getElementById("server-list").textContent = "Failed to load servers.";
            }
        }
        

        checkLogin();
        fetchOwnedServers();
        setInterval(fetchOwnedServers, 5000);
