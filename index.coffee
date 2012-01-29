module.exports = (args...) ->
  cb = args.pop() or throw "Must specify a callback"
  port = args.shift() ? "8888"
  host = args.shift() ? "0.0.0.0"

  cluster = require('cluster')

  SECONDS = 1000

  MaxCPUs = 6
  MinCPUs = 3
  HeartbeatTimeout = 20 * SECONDS
  HeartbeatInterval = 5 * SECONDS
  RespawnDelay = 5 * SECONDS
  MaxRequestsPerProcess = 100

  numCPUs = require('os').cpus().length
  numCPUs = MinCPUs if numCPUs < MinCPUs
  numCPUs = MaxCPUs if numCPUs > MaxCPUs

  log = (str) -> console.log "[#{new Date()}] #{str}"

  unless cluster.isMaster
    process.on 'message', (m) -> process.send true
    app = cb(port, host)
    app?.listen?(port, host)
    return

  # Master here
  Workers = {}
  IsAlive = {}
  IsExiting = false

  spawn = ->
    child = cluster.fork()
    child.on 'message', ->
      IsAlive[@pid] = Date.now()
    Workers[child.pid] = child
    log "Worker spawned (pid #{ child.pid })."
  do spawn for [1..numCPUs]
  cluster.on 'death', ({pid, exitCode}) ->
    delete Workers[pid]
    return if IsExiting
    log "Worker died (pid #{ pid }, exitCode #{ exitCode }). Restarting in #{ RespawnDelay / SECONDS } sec..."
    setTimeout spawn, RespawnDelay

  sendHeartbeat = ->
    currentTime = Date.now()
    for pid, child of Workers
      lastHeartbeat = IsAlive[pid] ? Infinity
      if lastHeartbeat < (currentTime - HeartbeatTimeout)
        log "Worker not responding to ping in #{ HeartbeatTimeout / SECONDS } sec (pid #{ pid }). Killing it..."
        child.kill('SIGTERM')
        child.kill('SIGKILL')
        continue
      child.send true
  setInterval sendHeartbeat, HeartbeatInterval

  log "Cluster server started, listening on #{host}:#{port}"

  onExit = ->
    log "Cluster server stopped"
    IsExiting = true
    for pid, child of Workers
      child.kill('SIGTERM')
      child.kill('SIGKILL')
    process.exit()

  for signal in ['INT', 'TERM', 'KILL', 'QUIT']
    process.on "SIG#{ signal }", onExit
