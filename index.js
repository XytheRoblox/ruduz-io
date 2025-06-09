const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb')
const app = express();
const cors = require('cors')
const crypto = require('crypto')
const { exec, ChildProcess, execFile, spawn } = require('child_process')
const shell = require("shelljs");
const os = require('os')


const PORT = 8000
const SERVER_IP = "3.140.92.245";


const uri = "mongodb+srv://ruduz_admin:totheus12@ruduzdb.ekndj.mongodb.net/?retryWrites=true&w=majority&appName=RuduzDB"



const client = new MongoClient(uri, {
	serverApi: {
	  version: ServerApiVersion.v1,
	  strict: true,
	  deprecationErrors: true,
	}
  });
  async function run() {
	
	  // Connect the client to the server	(optional starting in v4.7)
	  await client.connect();
	  // Send a ping to confirm a successful connection
	  await client.db("admin").command({ ping: 1 });
	  console.log("initialized mongoDB");


  }
const db = client.db("RuduzDB")
const collection = db.collection('containers')
const auth = db.collection('accounts');
const servers = db.collection('servers');
run().catch(console.dir);

async function findPort(minPort, maxPort) {
		let aport;
        let isDuplicate = true;

        while (isDuplicate) {
            // Generate a random port number
            aport = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

            // Check if the port exists in the collection
            const existingPort = await collection.findOne({ port: aport });

            if (!existingPort) {
                isDuplicate = false; // Exit loop when a unique port is found
            }
        }

    return aport = Number(aport);
}



app.use(cors());


app.get('/api/logs_c/:cID/', (req,res)=> {
	console.log('/api/logs_c/' + req.params.cID);
	try {
		exec(`sudo docker exec ${req.params.cID} /bin/sh -c "cat /data/logs/latest.log"`, (error, stdout, stderr) => {
			if (error) {
			  console.error(`Error: ${error.message}`);
			  return;
			}
			if (stderr) {
			  console.error(`stderr: ${stderr}`);
			  return;
			}
			
			return res.json({
				content: stdout,
			}) 
		  });
	} catch(e) {
		console.error(e);
	}
} );
app.get('/api/run_c/:cID/', (req, res) => {
	console.log('/api/run_c/' + req.params.cID);
	try {
		exec(`sudo docker exec ${req.params.cID} java -Xmx1024M -Xms1024M -jar server.jar nogui START`, (error, stdout, stderr) => {
			if (error) {
			  console.error(`Error: ${error.message}`);
			  return;
			}
			if (stderr) {
			  console.error(`stderr: ${stderr}`);
			  return;
			}
			const query = { containerID: req.params.cID }

			const update = {
				$set: {
					on: true,
				}
			}
			collection.updateOne(query, update);
			return res.json({
				message: "Successfully Started Server",
			}) 
		  });
		  
	} catch(e) {
		console.error(e);
	}
})

app.get('/api/stop_c/:cID/', (req, res) => {
	console.log('/api/run_c/' + req.params.cID);
	try {
		exec("sudo docker stop " + req.params.cID, (error, stdout, stderr) => {
			if (error) {
			  console.error(`Error: ${error.message}`);
			  return;
			}
			if (stderr) {
			  console.error(`stderr: ${stderr}`);
			  return;
			}
			const query = { containerID: req.params.cID }

			const update = {
				$set: {
					on: false,
				}
			}
			collection.updateOne(query, update);
			return res.json({
				message: "Successfully Stopped Server",
			}) 
		  });
	} catch(e) {
		console.error(e);
	}
})
app.get('/api/get_ip/:cID', async (req,res) => {
	console.log('/api/get_ip');
	const item = await collection.findOne({containerID: req.params.cID})

	return res.json({
		IP: `${item.ip}:${item.port}`,
	})
})
app.get('/api/new_c/:username', async (req,res) => {
	console.log('/api/new_c')
	try{
		let aid = "";
		const server = await servers.findOne({ip: SERVER_IP})
		if(server.type == "large") {
			if(server.containers <= 8) {
				let xport = await findPort(1024,65535);
		exec("sudo docker create -p " + xport + ":25565 ruduz", (error, stdout, stderr) => {
			if (error) {
			  console.error(`Error: ${error.message}`);
			  return;
			}
			if (stderr) {
			  console.error(`stderr: ${stderr}`);
			  return;
			}
			console.log(stdout)
			aid=stdout;
			const doc = {
				containerID: stdout.trim(),
				owner: req.params.username,
				server: SERVER_IP,
				on: false,
				ip: SERVER_IP,
				port: xport,
				type: "vanilla",
			}
			
			const data = {
				$set: {
					containers: server.containers++,
				}
			}
			collection.insertOne(doc);
			return res.json({
				id: stdout,
			}) 
		  });
		  spawn("sudo", ["docker", "start", "-it", aid], {
			stdio: "inherit", // Attach input and output to the main terminal
			shell: true, // Needed for interactive mode
		});
		  await new Promise(resolve => setTimeout(resolve, 10000)); 
		  const process = spawn("sudo", ["docker", "exec", "-it", aid, "java", "-jar", "server.jar", "nogui"], {
			stdio: "inherit", // Attach input and output to the main terminal
			shell: true, // Needed for interactive mode
		});
		  await new Promise(resolve => setTimeout(resolve, 5000));
		  exec(`sudo docker exec ${aid} -c 'echo "eula=true" > /eula.txt'`, (error, stdout, stderr) => {
			if (error) {
			  console.error(`Error: ${error.message}`);
			  return;
			}
			if (stderr) {
			  console.error(`stderr: ${stderr}`);
			  return;
			}
			console.log(stdout)})
		  
		} 
	} 
	} catch(e) {
	console.error(e);
	} 

})

	
		
	


app.listen(PORT,() =>{
	console.log('agent running on ' + PORT);
}
)
