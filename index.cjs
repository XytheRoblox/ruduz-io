const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const stripeLib = require("stripe");
const stripe = stripeLib('sk_test_51R6eXgIj7uJvpmhjnARp1Wkzooq7UBsSujQxtH0JvMAEawcD2ok3j9HOavqid7ExuFnjRVqFBFonRz8CCi9Xdf0j00NkrH6Mfu')

const PORT = 443;
const uri = "mongodb+srv://ruduz_admin:totheus12@ruduzdb.ekndj.mongodb.net/?retryWrites=true&w=majority&appName=RuduzDB";

app.use(express.json());
app.use(cookie());

const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
  };

const AWS = require('aws-sdk');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new AWS.S3({
    region: 'us-east-2',
    accessKeyId: "AKIAYLZZKHNGTWUSOMVZ",
    secretAccessKey: "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"
});



app.post('/api/upload-to-s3/:cID', upload.single('file'), async(req, res) => {
    try {
        const { containerID, path } = req.body;
        if (path == 'base') {
            path == ''
        }
        const key = `containers/${containerID}/${(path || '').replace(/"/g, '').replace(/:/g, '/')}/${req.file.originalname}`;

        const params = {
            Bucket: "ruduz-bucket",
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            
        };

        await s3.upload(params).promise();

        
        const aparams = {
            Bucket: 'ruduz-bucket',
            Key: key,
            Expires: 60 * 5 // link valid for 5 minutes
          };
          
          const signedUrl = s3.getSignedUrl('getObject', aparams);

        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/upload/${req.params.cID}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: signedUrl, path: path, name: req.file.originalname })
        });

        res.json({ message: "Upload successful", key });
    } catch (err) {
        console.error("S3 Upload Error:", err);
        res.status(500).json({ error: "Failed to upload file" });
    }
});

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
}
run();

let serverCount;

async function findInstance() {
    serverCount = await servers.estimatedDocumentCount();
    let s = 1;
    let selectedServer;
    let viewServer;
    let found = false;
    while (true) {
        if (s > serverCount) {
            break;
        } else {
            viewServer = await servers.findOne({ id: s });
            if (viewServer.type == "large") {
                if (viewServer.containers <= 8) {
                    selectedServer = await viewServer;
                    found = true;
                    break;
                } else {
                    s++;
                }
            }

        }
    }

    if (found) {
        return selectedServer.ip
    } else {
        return "No Server Availible"
    }
}

const db = client.db("RuduzDB");
const auth = db.collection('accounts');
const collection = db.collection('containers');
const servers = db.collection('servers');

app.use(express.static('public'));

// ✅ **Handle user authentication**
app.get('/api/dashboard/', async(req, res) => {
    try {
        const user = await auth.findOne({ session: req.cookies.session_token });
        if (user) {
            return res.json({ message: "log", account_name: user.username });
        }
        return res.json({ message: "nolog" });
    } catch (error) {
        console.error("Error checking login:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Fetch owned servers**
app.get('/api/ownedServers/:username', async(req, res) => {
    try {
        const cursor = await collection.find({ owner: req.params.username });
        const servers = await cursor.toArray();
        return res.json({ servers });
    } catch (error) {
        console.error("Error fetching owned servers:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/auth/signup/', async(req, res) => {
    const { username, password } = req.body;
    const exists = await auth.findOne({ username });
    if (!exists) {
        const ses = crypto.randomBytes(32).toString('hex');;
        const doc = {
            username: username,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            session: ses,
            servers: 0,
            plan: "null"
        }
        res.cookie('session_token', ses, {
            httpOnly: true, // Prevent access by JavaScript (protects against XSS)
            secure: true, // Ensures cookie is sent only over HTTPS
            sameSite: 'Strict', // Helps prevent CSRF attacks
            maxAge: 24 * 60 * 60 * 1000 // 1-day expiration
        });
        auth.insertOne(doc)


        return res.json({
            message: "Successfully Created Account!"
        })
    } else {
        return res.json({
            message: "Account Already Exists"
        })
    }
})

async function getPlan(uname) {
    try {

        const username = uname;
        const user = await auth.findOne({ username });
        return user.plan;
    } catch(e) {
        console.error(e)
    }
}

app.get('/api/auth/currentPlan/:username', async (req,res) => {
    return res.json({
        plan: getPlan(req.params.username),
    })
})
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('session_token');
    return res.status(200).json({ message: 'Logged out' });
  });
app.post("/api/auth/choose-plan", async (req, res) => {
    try {
        const { plan } = req.body;
        // Identify user by session token
        const token = req.cookies.session_token;
        if (!token) {
            return res.json({ success: false, message: "Not logged in" });
        }

        // Find the user in DB
        const user = await auth.findOne({ session: token });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // If user already has plan, handle accordingly
        if (user.plan && user.plan !== "null") {
            return res.json({ success: false, message: "Plan already selected." });
        }

        if (plan === "free") {
            // Just set plan: "free" in DB
            await auth.updateOne(
                { session: token },
                { $set: { plan: "Free" } }
            );
            return res.json({ success: true, message: "Plan set to Free" });
        } else if (plan === "premium") {
            /*
               Create a Stripe Checkout Session for a subscription.
               For demonstration, let's assume you have a Price ID in Stripe
               that corresponds to your monthly or yearly subscription plan
               (e.g., "price_123abcXYZ").
            */
            const YOUR_DOMAIN = "https://3.14.101.196"; // Adjust for your domain
            const priceId = "price_1R873wIj7uJvpmhjLZlXsAfL"; // Replace with your real Price ID in Stripe

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "subscription",
                line_items: [
                  {
                    price: priceId,
                    quantity: 1,
                  },
                ],
                success_url: `${YOUR_DOMAIN}/new.html`,
                cancel_url: `${YOUR_DOMAIN}/signup.html`,
            });

            // Return the session URL so user can redirect
            await auth.updateOne(
                { session: token },
                { $set: { plan: "Premium" } }
            );
            return res.json({ url: session.url });
        } else {
            return res.json({ success: false, message: "Invalid plan choice" });
        }
    } catch (err) {
        console.error("Error in choose-plan", err);
        return res.json({ success: false, message: "Server error" });
    }
});

app.get('/api/getLogs/:cID', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/logs_c/${req.params.cID}`);
        const data = await response.json();
        console.log(data.content)

        return res.json({ content: data.content });
    } catch (error) {
        console.error("Error fetching logs:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

app.post('/api/auth/login/', async(req, res) => {

    const { username, password } = req.body;


    const ses = crypto.randomBytes(32).toString('hex');;
    const passwordMatch = await crypto.createHash('sha256').update(password).digest('hex')

    const query = { username: username, password: passwordMatch }

    const doc = await auth.findOne(query)

    if (doc) {
        res.cookie('session_token', ses, {
            httpOnly: true, // Prevent access by JavaScript (protects against XSS)
            secure: true, // Ensures cookie is sent only over HTTPS
            sameSite: 'Strict', // Helps prevent CSRF attacks
            maxAge: 24 * 60 * 60 * 1000 // 1-day expiration
        });
        auth.updateOne(query, {
            $set: {
                session: ses
            }
        })
        return res.json({
            message: "Successfully Logged in!"
        })
    } else {
        return res.json({
            message: "Incorrect Username or Password"
        })
    }


})

// ✅ **Fetch file list from a container**
app.get('/api/get-files/:cID/:path', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/files_c/${req.params.cID}/${req.params.path}`);
        const data = await response.json();
        console.log(data.files)
        if (data.files.includes('edit.py')) {
            const index = data.files.indexOf('edit.py')
            data.files.splice(index, 1)
        }
        if (data.files.includes('versions')) {
            const index = data.files.indexOf('versions')
            data.files.splice(index, 1)
        }
        return res.json({ files: data.files });
    } catch (error) {
        console.error("Error fetching files:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Fetch file content**
app.get('/api/get-file/:cID/:fname/:path', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/file_c/${req.params.cID}/${req.params.fname}/${req.params.path}`);
        const data = await response.json();
        console.log(data.content)

        return res.json({ content: data.content });
    } catch (error) {
        console.error("Error fetching file content:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Save file changes**
app.post('/api/save-file/:cID/:fname/:path', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/save_f/${req.params.cID}/${req.params.fname}/${req.params.path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: req.body.content })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to save file");

        return res.json({ message: "File saved successfully!" });
    } catch (error) {
        console.error("Error saving file:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Start a server**
app.post('/api/runServer/:cID', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/run_c/${req.params.cID}/`, {
            method: "POST"
        });
        const data = await response.json();

        return res.json({ message: data.message });
    } catch (error) {
        console.error("Error starting server:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Stop a server**
app.post('/api/stopServer/:cID', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/stop_c/${req.params.cID}/`, {
            method: "POST"
        });
        const data = await response.json();

        return res.json({ message: data.message });
    } catch (error) {
        console.error("Error stopping server:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Get container IP**
app.get('/api/getIP/:cID', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/get_ip/${req.params.cID}/`);
        const data = await response.json();

        return res.json({ IP: data.IP });
    } catch (error) {
        console.error("Error getting IP:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/sendRcon/:cID', async(req, res) => {
    try {
        const container = await collection.findOne({ containerID: req.params.cID });
        if (!container) return res.status(404).json({ error: "Container not found" });

        const response = await fetch(`http://${container.server}:8000/api/send_command/${req.params.cID}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: req.body })
        });

    } catch (error) {
        console.error("Error stopping server:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }

})

app.get('/api/plan/:username', async (req,res) => {
    const user = await auth.findOne({username: req.params.username});
    if(JSON.stringify(user).includes('{')) {
        console.log(user);
        return res.json({
            plan: user.plan,
        })
    } else {
        return res.status(400);
    }
})

// ✅ **Create a new server for a user**
app.get('/api/newServer/:username/:type', async(req, res) => {
    console.log(req.params.type)
    if ((await findInstance()) != "No Server Availible") {
        let ram = 0;
        const user = auth.findOne({username: req.params.username})
        console.log(await getPlan(req.params.username))
        if(await getPlan(req.params.username) == "Premium") {
            ram = 4
        } else if(await getPlan(req.params.username) == "Free") {
            ram = 2
            if(user.servers >= 3) {
                return res.json({
                    error: "Out of Servers! Upgrade or Delete a Server",
                })
            }
        }
        let response = await fetch(`http://${await findInstance()}:8000/api/new_c/` + req.params.username + '/' + req.params.type + '/' + ram)
        const directory = path.join(__dirname + `/public/`)
        let data = await response.json();
        const folderName = path.join(__dirname + `/public/servers/`, data.id);
        const filePath = path.join(folderName.trim(), 'panel.html');
        const filePath2 = path.join(folderName.trim(), 'edit.html')
        const filePath3 = path.join(folderName.trim(), 'panel.js');
        const filePath4 = path.join(folderName.trim(), 'edit.js')

        const textPath1 = path.join(__dirname, 'panel.txt')
        const textPath2 = path.join(__dirname, 'edit.txt')

        const jsPath1 = path.join(__dirname, 'editjs.txt')
        const jsPath2 = path.join(__dirname, 'paneljs.txt')

        
        
        
        if(!(data.msg == "invalid type")) {
        


            let htmlContent = fs.readFileSync(textPath1, 'utf8')
            let editContent = fs.readFileSync(textPath2, 'utf8')
            let htmlJS = fs.readFileSync(jsPath1, 'utf8')
            let editJS = fs.readFileSync(jsPath2, 'utf8')



        // Create the folder if it doesn't exist

            fs.mkdirSync(folderName.trim(), { recursive: true });


        // Write the HTML file
            fs.writeFileSync(filePath.trim(), htmlContent, 'utf8');
            fs.writeFileSync(filePath2.trim(), editContent, 'utf8')
            fs.writeFileSync(filePath3.trim(), editJS, 'utf8')
            fs.writeFileSync(filePath4.trim(), htmlJS, 'utf8')
        }

        

        return res.json({
            id: data.id,
        })
    } else {
        return res.json({
            error: "NO SERVER AVAILIABLE",
        })
    }
})

// Start Express Server
https.createServer(options, app).listen(443, () => {
    console.log('HTTPS server running on https://localhost');
});
