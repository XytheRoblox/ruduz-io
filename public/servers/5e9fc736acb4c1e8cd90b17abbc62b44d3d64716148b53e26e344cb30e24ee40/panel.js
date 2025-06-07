const startb = document.getElementById('start');
    const stopb = document.getElementById('stop');
    const ipDiv = document.getElementById('ip');
    const eulaPrompt = document.getElementById('eula-prompt');
    const agreeBtn = document.getElementById('agree-btn');
    const logFrame = document.getElementById('log-frame');
    const content = document.getElementById('content');

    const path = window.location.pathname;
    const containerID = path.split('/').filter(part => part !== '' && part !== 'panel.html' && part !== 'servers').join('');
    const rconInput = document.getElementById("rcon-input");
const rconButton = document.getElementById("send-rcon");

rconButton.addEventListener("click", async () => {
  const command = rconInput.value.trim();
  if (!command) return alert("Please enter an RCON command.");

  try {
    const response = await fetch('/api/sendRcon/' + containerID, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "RCON command failed.");

    alert("Command sent.");
    rconInput.value = ""; // Clear input
    getLogs(); // Refresh logs
  } catch (error) {
    console.error("RCON error:", error);
    alert("Failed to send RCON command: " + error.message);
  }
});
document.getElementById("edit-files").addEventListener("click", () => {
  window.location.href = `/${containerID}/edit.html?path="base"`;
});

    async function checkLogin() {
      try {
        const response = await fetch('/api/dashboard/');
        if (!response.ok) throw new Error("Failed to verify login status");

        const data = await response.json();
        if (data.message === "nolog") {
          window.location.href = "https://3.12.193.202/login.html";
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        alert("Error checking login status: " + error.message);
      }
    }

    async function checkEULA() {
      try {
        const response = await fetch('/api/get-file/' + containerID + '/eula.txt' + '/base');
        if (!response.ok) throw new Error('Failed to check EULA: ' + response.statusText);

        const data = await response.json();
        if (data.content.trim() === "eula=false") {
          eulaPrompt.style.display = "block";
          content.classList.add("blurred");
        }
      } catch (error) {
        console.error("Error checking EULA:", error);
        alert("Error checking EULA: " + error.message);
      }
    }

    async function getIP() {
      try {
        const response = await fetch('/api/getIP/' + containerID);
        if (!response.ok) throw new Error('Failed to fetch IP: ' + response.statusText);

        const data = await response.json();
        ipDiv.innerText = data.IP || "IP not available";
      } catch (error) {
        console.error("Error fetching IP:", error);
        ipDiv.innerText = "Error fetching IP";
      }
    }

    async function getLogs() {
      try {
        const response = await fetch('/api/getLogs/' + containerID);
        if (!response.ok) throw new Error('Failed to fetch logs: ' + response.statusText);

        const data = await response.json();
        logFrame.innerText = data.content || "No logs available";
        logFrame.scrollTop = logFrame.scrollHeight;
      } catch (error) {
        console.error("Error fetching logs:", error);
        logFrame.innerText = "Error fetching logs.";
      }
    }

    agreeBtn.addEventListener("click", async () => {
      try {
        const response = await fetch('/api/save-file/' + containerID + '/eula.txt/base', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "eula=true" })
        });

        if (!response.ok) throw new Error("Failed to agree to EULA: " + response.statusText);

        eulaPrompt.style.display = "none";
        content.classList.remove("blurred");
        alert("You have agreed to the EULA.");
        location.reload();
      } catch (error) {
        console.error("Error agreeing to EULA:", error);
        alert("Error agreeing to EULA: " + error.message);
      }
    });

    startb.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/runServer/' + containerID, { method: "POST" });
        if (!response.ok) throw new Error('Failed to start server: ' + response.statusText);

        const data = await response.json();
        alert(data.message);
      } catch (error) {
        console.error("Error starting server:", error);
        alert("Error starting server: " + error.message);
      }
    });

    stopb.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/stopServer/' + containerID, { method: "POST" });
        if (!response.ok) throw new Error('Failed to stop server: ' + response.statusText);

        const data = await response.json();
        alert(data.message);
      } catch (error) {
        console.error("Error stopping server:", error);
        alert("Error stopping server: " + error.message);
      }
    });

    // Initial setup
    checkLogin();
    checkEULA();
    getIP();
    getLogs();
    setInterval(getIP, 3000);
    setInterval(getLogs, 5000);
