FROM ubuntu:latest

RUN apt-get update && apt-get install -y openjdk-21-jre wget curl unzip python3 rcon tmux screen

WORKDIR /minecraft

RUN wget -O server.jar https://3.14.101.196/jars/spigot-1.21.4.jar --no-check-certificate


COPY eula.txt .
COPY edit.py .

EXPOSE 25565

CMD ["tail", "-f", "/dev/null"]