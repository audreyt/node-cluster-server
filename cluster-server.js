(function(){
  var slice$ = [].slice;
  module.exports = function(){
    var args, cb, port, host, cluster, app, SECONDS, RespawnDelay, HeartbeatInterval, HeartbeatTimeout, MaxCPUs, MinCPUs, numCPUs, log, Workers, IsAlive, IsExiting, spawn, i$, i, sendHeartbeat, ref$, len$, signal;
    args = slice$.call(arguments);
    cb = args.pop() || (function(){
      throw 'Must specify a callback';
    }());
    port = args.shift() || '8888';
    host = args.shift() || '0.0.0.0';
    cluster = require('cluster');
    if (!cluster.isMaster) {
      process.on('message', function(){
        return process.send(true);
      });
      app = cb(port, host);
      if (app != null) {
        if (typeof app.listen === 'function') {
          app.listen(port, host);
        }
      }
      return;
    }
    SECONDS = 1000;
    RespawnDelay = 5 * SECONDS;
    HeartbeatInterval = 5 * SECONDS;
    HeartbeatTimeout = 20 * SECONDS;
    MaxCPUs = 6;
    MinCPUs = 3;
    numCPUs = require('os').cpus().length;
    numCPUs >= MinCPUs || (numCPUs = MinCPUs);
    numCPUs <= MaxCPUs || (numCPUs = MaxCPUs);
    log = function(str){
      return console.log("[" + new Date() + "] " + str);
    };
    Workers = {};
    IsAlive = {};
    IsExiting = false;
    spawn = function(){
      var child;
      child = cluster.fork();
      child.on('message', function(){
        return IsAlive[this.pid] = Date.now();
      });
      Workers[child.pid] = child;
      log("Worker spawned (pid " + child.pid + ").");
    };
    for (i$ = 1; i$ <= numCPUs; ++i$) {
      i = i$;
      spawn();
    }
    cluster.on('death', function(arg$){
      var pid, exitCode;
      pid = arg$.pid, exitCode = arg$.exitCode;
      delete Workers[pid];
      if (IsExiting) {
        return;
      }
      log("Worker died (pid " + pid + ", exitCode " + exitCode + "). Restarting in " + RespawnDelay / SECONDS + " sec...");
      setTimeout(spawn, RespawnDelay);
    });
    sendHeartbeat = function(){
      var currentTime, pid, ref$, child, lastHeartbeat, ref1$;
      currentTime = Date.now();
      for (pid in ref$ = Workers) {
        child = ref$[pid];
        lastHeartbeat = (ref1$ = IsAlive[pid]) != null ? ref1$ : Infinity;
        if (lastHeartbeat < currentTime - HeartbeatTimeout) {
          log("Worker not responding to ping in " + HeartbeatTimeout / SECONDS + " sec (pid " + pid + "). Killing it...");
          child.kill('SIGTERM');
          child.kill('SIGKILL');
        } else {
          child.send(true);
        }
      }
    };
    setInterval(sendHeartbeat, HeartbeatInterval);
    log("Cluster server started, listening on " + host + ":" + port);
    for (i$ = 0, len$ = (ref$ = ['INT', 'TERM', 'QUIT']).length; i$ < len$; ++i$) {
      signal = ref$[i$];
      process.on("SIG" + signal, fn$);
    }
    function fn$(){
      var pid, ref$, child;
      log('Cluster server stopped');
      IsExiting = true;
      for (pid in ref$ = Workers) {
        child = ref$[pid];
        child.kill('SIGTERM');
        child.kill('SIGKILL');
      }
      return process.exit();
    }
  };
}).call(this);
