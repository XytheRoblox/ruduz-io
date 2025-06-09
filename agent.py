from flask import Flask, request, jsonify
import random
import pymongo
import time
import subprocess
import logging

PORT = 8000
app = Flask(__name__)

logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.basicConfig(level=logging.DEBUG)

MONGO_URI = "mongodb+srv://ruduz_admin:totheus12@ruduzdb.ekndj.mongodb.net/?retryWrites=true&w=majority&appName=RuduzDB"
client = pymongo.MongoClient(MONGO_URI)

db = client['RuduzDB']

containers = db['containers']
servers = db['servers']


SERVER_IP = "3.140.92.245"

def find_available_port(min_port=1024, max_port=65535):
    while True:
        port = random.randint(min_port, max_port)
        if not containers.find_one({"port": port}):
            return port
def convert_to_list(output):
    return [line.strip() for line in output.split("\n") if line.strip()]
@app.route('/api/upload/<string:cID>/', methods=['POST'])
def upload(cID):
    data = request.json
    exist = True
    path = data.get('path','')
    if path == 'base':
        exist = False
    app.logger.debug(exist)
    url = data.get('url','')
    
    pathx = path.replace(':','/')
    pathx = pathx.replace('"','')
    name = data.get('name','')
    app.logger.debug(pathx)
    cmd = ['sudo', 'docker', 'exec', cID, 'wget','-O']

    if exist:
        cmd += [pathx+'/'+name, url]
    else:
        cmd += [name,url]
    

    app.logger.debug(cmd)

    result = subprocess.run(cmd, capture_output=True, text=True)
    app.logger.debug(result.stderr)
    app.logger.debug('-P'*exist)
    
    
    return jsonify({"message": "uploaded!"})
@app.route('/api/run_c/<string:cID>/', methods=['POST'])
def run_c(cID):
    try:
        container = containers.find_one({"containerID": cID})
        if(container['on'] == False):
            cmd = ['sudo','docker','exec', cID,'screen', '-dmS','minecraft','java','-Xms'+str(container['ram'])+"G",'-Xmx'+str(container['ram'])+"G",'-jar','server.jar','nogui','START']
            app.logger.debug(cmd)
            result = subprocess.run(cmd)
            containers.update_one({"containerID": cID}, {"$set": {"on": True}})
            if result.returncode != 0:
                return jsonify({"message": result.stderr}), 500

        return jsonify({"message": "Server Started!"})
    except Exception as e:
        print(e)
@app.route('/api/stop_c/<string:cID>/', methods=['POST'])
def stop_c(cID):
    try:
        container = containers.find_one({"containerID": cID})
        if(container['on'] == True):
            result = subprocess.run(['sudo','docker','exec', cID, 'screen','-S','minecraft','-X','stuff','stop\n'])
            containers.update_one({"containerID": cID}, {"$set": {"on": False}})
            if result.returncode != 0:
                return jsonify({"message": result.stderr}), 500

        return jsonify({"message": "Server Stopped!"})
    except Exception as e:
        print(e)

@app.route('/api/save_f/<string:container_id>/<string:file_name>/<string:path>', methods=['POST'])
def save_file(container_id, file_name, path):
    try:
        data = request.json
        file_content = data.get('content', '')
        print(file_content, flush=True)
        print(file_name, flush=True)
        if path == 'base':
            path = ''
        
        pathx = path.replace(':','/')
        pathx = pathx.replace('"','')
        print(pathx, flush=True)

        # Run the Python script inside the Docker container
        result = subprocess.run(
            ["sudo","docker", "exec", container_id, "python3", "edit.py", pathx+f"{file_name}", f"{file_content}"],
            capture_output=True,
            text=True
        )

        print(result.stdout, flush=True)

        # Check for errors
        if result.returncode != 0:
            return jsonify({"message": result.stderr}), 500

        return jsonify({"message": "File saved successfully!"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/file_c/<string:cID>/<string:fname>/<string:path>', methods=['GET'])
def get_file(cID,fname,path):
    try:
        if path == "base":
            path = ""
        slash = False
        if '/' in path:
            slash=True
        pathx = path.replace(':','/')
        pathx = pathx.replace('"','')
        print(pathx, flush=True)
        if(pathx != ''):
            result = subprocess.run(['sudo','docker','exec',cID,'cat',pathx+('/'*slash)+fname], capture_output=True,text=True)
            print("sus", flush=True)
        else:
            result = subprocess.run(['sudo','docker','exec',cID,'cat',fname], capture_output=True,text=True)
            app.logger.debug(result.stdout)
        return jsonify({"content": result.stdout})
    except Exception as e:
        print(e)
@app.route('/api/files_c/<string:cID>/<string:path>', methods=['GET'])
def get_files(cID, path):
    try:
        result = 0
        print(f"a{path}a", flush=True)
        pathx = path.replace(':','/')
        pathx = pathx.replace('"','')
        print(pathx, flush=True)
        
        if(pathx):
            result = subprocess.run(['sudo','docker','exec', cID, 'ls', pathx], capture_output=True, text=True)
            print("sus", flush=True)
        else:
            result = subprocess.run(['sudo','docker','exec', cID, 'ls'], capture_output=True, text=True)
            print("sus", flush=True)
        
        return jsonify({"files": convert_to_list(result.stdout)})
    except Exception as e:
        print(e)
@app.route('/api/send_command/<string:cID>/', methods=['POST'])
def send_command(cID):
    data = request.json
    command = data.get('command','')
    if(command['command'] == "stop"):
        
        containers.update_one({"containerID": cID}, {"$set": {"on": False}})
    result = subprocess.run(['sudo','docker','exec',cID,'screen','-S','minecraft','-X','stuff',f"{command['command']}\n"])
@app.route('/api/logs_c/<string:cID>', methods=['GET'])
def get_logs(cID):
    try: 
        result = subprocess.run(['sudo','docker','exec',cID,'cat', 'logs/latest.log'], capture_output=True, text=True)
        return jsonify({"content": result.stdout})
    except Exception as e:
        print(e)
@app.route('/api/get_ip/<string:cID>/', methods=['GET'])
def get_ip(cID):
    item = containers.find_one({"containerID": cID})
    print(item)
    
    return jsonify({"IP": f"{item['ip']}:{item['port']}"})
    
@app.route('/api/new_c/<string:username>/<string:atype>/<int:ram>', methods=['GET'])
def create_container(username, atype, ram):
    try:
        server = servers.find_one({"ip": SERVER_IP})
        if server and server['type'] == 'large' and server['containers'] <= 8:
            xport = find_available_port()
            cmd = ['sudo','docker','create','-p',f"{xport}:25565"]
            app.logger.debug(atype)
            if(atype == "vanilla"):
                cmd += ['ruduz']
            elif(atype == "paper"):
                cmd+= ['ruduz-paper']
            elif(atype == "spigot"):
                cmd+=['ruduz-spigot']
            else:
                return jsonify({"msg": "invalid type"}), 400
            
            container = subprocess.run(cmd, capture_output=True, text=True)
            container_id = container.stdout.strip()

            containers.insert_one({
                "containerID": container_id,
                "owner": username,
                "server": SERVER_IP,
                "on": False,
                "ip": SERVER_IP,
                "port": xport,
                "type": atype,
                "ram": ram
            })

            servers.update_one({"ip": SERVER_IP}, {"$inc": {"containers": 1}})

            subprocess.run(['sudo','docker','start',container_id], capture_output=True, text=True)
            time.sleep(3)

            #subprocess.run(['sudo','docker','exec',container_id,'java','-jar','server.jar','nogui'], capture_output=True, text=True)
            
            return jsonify({"id": container_id, "msg": "success"})
        else:
            return jsonify({"error": "Server limit reached or not found"}), 400

    except Exception as e:
            print(e)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=PORT, debug=True)
    print("agent running")
        