


const params = new URLSearchParams(window.location.search)
        const rawFolder = params.get('path');
        const folder = rawFolder.replace(/^"+|"+$/g, '');
        let currentPath = ""
        // Extract container ID from URL path
        const path = window.location.pathname;
        const containerID = path.split('/').filter(part => part !== '' && part !== 'edit.html' && part !=='servers').join('');

        
        function renderBreadcrumb(pathParam) {
    const navDiv = document.getElementById("nav");
    navDiv.innerHTML = '';

    const label = document.createElement("span");
    label.textContent = "Path: ";
    navDiv.appendChild(label);
    const uploadBtn = document.getElementById('upload-btn');
const uploadFileInput = document.getElementById('upload-file');

uploadBtn.addEventListener('click', async () => {
    const file = uploadFileInput.files[0];
    if (!file) return alert("Please choose a file to upload.");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('containerID', containerID);
    formData.append('path', folder);

    try {
        const response = await fetch('/api/upload-to-s3/'+ containerID, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload failed");

        alert("File uploaded successfully!");
        fetchFileList(); // Refresh file list after upload
    } catch (error) {
        console.error("Upload error:", error);
        alert("Error uploading file: " + error.message);
    }
});

    // Normalize path
    const cleaned = pathParam === 'base'
        ? ''
        : pathParam.replace(/base/g, '').replace(/^\/+|\/+$/g, '');

    const segments = cleaned.split(':').filter(Boolean);

    // Always start with a link to base
    const baseLink = document.createElement("a");
    baseLink.href = `?path="base"`;
    baseLink.textContent = "/";
    navDiv.appendChild(baseLink);

    if (segments.length > 0) {
        const divider = document.createElement("span");
        divider.classList.add("divider");
        navDiv.appendChild(divider);
    }

    let cumulativePath = "";
    segments.forEach((segment, index) => {
        cumulativePath += (cumulativePath ? ":" : "") + segment;

        const link = document.createElement("a");
        link.href = `?path="${cumulativePath}"`; // Add quotes here
        link.textContent = segment;
        link.style.textDecoration = "none";

        navDiv.appendChild(link);

        if (index < segments.length - 1) {
            const divider = document.createElement("span");
            divider.classList.add("divider");
            navDiv.appendChild(divider);
        }
    });
}
    renderBreadcrumb(folder);

        // Fetch the file list from the backend
        async function fetchFileList() {
    try {
        // Remove 'base', clean up slashes, and convert to colon-based path
        const folderSanitized = folder === 'base'
            ? '""'
            : folder.replace(/base/g, '').replace(/^\/+|\/+$/g, '').replace(/\//g, ':');

        const encodedPath = encodeURIComponent(folderSanitized);

        

        const response = await fetch(`/api/get-files/${containerID}/${folderSanitized}`);
        if (!response.ok) {
            throw new Error('Failed to fetch file list: ' + response.statusText);
        }

        const files = await response.json();
        const fileListDiv = document.getElementById('file-list');
        fileListDiv.innerHTML = ""; // Clear loading text

        if (!files.files || files.files.length === 0) {
            fileListDiv.innerHTML = "<p>No files available.</p>";
            return;
        }

        files.files.forEach(file => {
            const button = document.createElement("button");
            button.textContent = file;
            button.addEventListener("click", () => openFile(file));
            fileListDiv.appendChild(button);
        });

    } catch (error) {
        console.error("Error fetching files:", error);
        alert("Error fetching file list: " + error.message);
        document.getElementById('file-list').innerHTML = "<p>Failed to load files.</p>";
    }
}


        // Fetch file contents and display them in the text area
        async function openFile(fileName) {
            if(!(fileName == "server.jar") && (fileName.includes('.'))) {
                try {
                const response = await fetch('/api/get-file/' + containerID + '/' + fileName + '/' + folder);

                if (!response.ok) {
                    throw new Error('Failed to load file: ' + response.statusText);
                }

                const data = await response.json();

                if (!data.content) {
                    throw new Error("Empty file or content unavailable.");
                }

                document.getElementById("file-name").textContent = fileName;
                document.getElementById("file-content").value = data.content;
                document.getElementById("file-editor").style.display = "flex";

                // Attach save functionality
                document.getElementById("save-btn").onclick = () => saveFile(fileName);
            } catch (error) {
                console.error("Error loading file:", error);
                alert("Error loading file: " + error.message);
            }
            } else if(!(fileName == "server.jar") && !(fileName.includes('.'))){
              const newPath = folder === 'base' ? `"${fileName}"` : `"${folder.replace(/"/g, '')}:${fileName}"`;
              console.log(newPath)
              window.location.href = `https://3.14.101.196/${containerID}/edit.html?path=${newPath}`;
            }
        }

        // Save edited file contents
        async function saveFile(fileName) {
            const newContent = document.getElementById("file-content").value;

            try {
                const response = await fetch('/api/save-file/' + containerID + '/' + fileName + '/' + folder, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ content: newContent })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to save file");
                }

                alert("File saved successfully!");
            } catch (error) {
                console.error("Error saving file:", error);
                alert("Error saving file: " + error.message);
            }
        }

        // Fetch the file list when the page loads
        fetchFileList();
