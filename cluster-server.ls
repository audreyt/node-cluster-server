module.exports = !(...args) ->
    cb = args.pop! or throw 'Must specify a callback'
    port = args.shift! or \8888
    host = args.shift! or \0.0.0.0

    cluster = require \cluster

    unless cluster.isMaster
        # Children here
        process.on \message -> process.send true
        app = cb port, host
        app?.listen? port, host
        return

    # Master here
    SECONDS = 1000
    RespawnDelay      =  5 * SECONDS
    HeartbeatInterval =  5 * SECONDS
    HeartbeatTimeout  = 20 * SECONDS

    MaxCPUs = 6
    MinCPUs = 3
    numCPUs = require \os .cpus!.length
    numCPUs >?= MinCPUs
    numCPUs <?= MaxCPUs

    log = (str) -> console.log "[#{new Date!}] #str"

    Workers = {}
    IsAlive = {}
    IsExiting = false

    spawn = !->
        child = cluster.fork!
        child.on \message -> IsAlive[@pid] = Date.now!
        Workers[child.pid] = child
        log "Worker spawned (pid #{ child.pid })."

    for i from 1 to numCPUs then do spawn

    cluster.on \death !({pid, exitCode}) ->
        delete Workers[pid]
        return if IsExiting
        log "Worker died (pid #pid, exitCode #exitCode). Restarting in #{
            RespawnDelay / SECONDS
        } sec..."
        setTimeout spawn, RespawnDelay

    sendHeartbeat = !->
        currentTime = Date.now!
        for pid, child of Workers
            lastHeartbeat = IsAlive[pid] ? Infinity
            if lastHeartbeat < (currentTime - HeartbeatTimeout)
                log "Worker not responding to ping in #{
                    HeartbeatTimeout / SECONDS
                } sec (pid #pid). Killing it..."
                child.kill \SIGTERM
                child.kill \SIGKILL
            else child.send true
    setInterval sendHeartbeat, HeartbeatInterval

    log "Cluster server started, listening on #host:#port"

    for signal in <[ INT TERM KILL QUIT ]>
        process.on "SIG#signal" ->
            log 'Cluster server stopped'
            IsExiting = true
            for pid, child of Workers
                child.kill \SIGTERM
                child.kill \SIGKILL
            process.exit!
