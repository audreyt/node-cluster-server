(function(){
  var __slice = [].slice;
  module.exports = function(){
    var args, cb, port, host, cluster, app, SECONDS, RespawnDelay, HeartbeatInterval, HeartbeatTimeout, MaxCPUs, MinCPUs, numCPUs, log, Workers, IsAlive, IsExiting, spawn, i, sendHeartbeat, signal, __i, __ref, __len;
    args = __slice.call(arguments);
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
    if (numCPUs < MinCPUs) {
      numCPUs = MinCPUs;
    }
    if (numCPUs > MaxCPUs) {
      numCPUs = MaxCPUs;
    }
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
    for (i = 1; i <= numCPUs; ++i) {
      spawn();
    }
    cluster.on('death', function(__arg){
      var pid, exitCode;
      pid = __arg.pid, exitCode = __arg.exitCode;
      delete Workers[pid];
      if (IsExiting) {
        return;
      }
      log("Worker died (pid " + pid + ", exitCode " + exitCode + "). Restarting in " + RespawnDelay / SECONDS + " sec...");
      setTimeout(spawn, RespawnDelay);
    });
    sendHeartbeat = function(){
      var currentTime, pid, child, lastHeartbeat, __ref, __ref1;
      currentTime = Date.now();
      for (pid in __ref = Workers) {
        child = __ref[pid];
        lastHeartbeat = (__ref1 = IsAlive[pid]) != null ? __ref1 : Infinity;
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
    for (__i = 0, __len = (__ref = ['INT', 'TERM', 'KILL', 'QUIT']).length; __i < __len; ++__i) {
      signal = __ref[__i];
      process.on("SIG" + signal, __fn);
    }
    function __fn(){
      var IsExiting, pid, child, __ref;
      log("Cluster server stopped");
      IsExiting = true;
      for (pid in __ref = Workers) {
        child = __ref[pid];
        child.kill('SIGTERM');
        child.kill('SIGKILL');
      }
      return process.exit();
    }
  };
}).call(this);
