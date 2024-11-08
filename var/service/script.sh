#!/sbin/openrc-run
description="Chatter backend"
extra_commands="prepare"

my_pidfile="/var/run/chatter.pid"

depends() {
    after net
}

prepare() {
    cd /home/alpine/chatter
    cd ./front
    /usr/bin/npm install
    /usr/bin/npm run build-prod
    cd ../back-lib
    /usr/bin/npm --prefix better-express install
    /usr/bin/npm --prefix better-obj install
    /usr/bin/npm --prefix logging install
    cd ../back
    /usr/bin/npm install
}

start() {
    now=$(/bin/date +"%Y-%m-%d-%H-%M")
    mkdir -p /var/log/chatter/back
    cd /home/alpine/chatter/back
    /usr/bin/node src/index.js >> /var/log/chatter/back/${now}.log &
    pid=$!
    /bin/echo "Spawned node process with pid=${pid}"
    /bin/echo $pid > $my_pidfile
}

stop() {
    kill $(cat $my_pidfile)
    echo > /dev/null
}

