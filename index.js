(function() {
  var __slice = Array.prototype.slice;

  module.exports = function() {
    var HeartbeatInterval, HeartbeatTimeout, IsAlive, IsExiting, MaxCPUs, MaxRequestsPerProcess, MinCPUs, RespawnDelay, SECONDS, Workers, app, args, cb, cluster, host, log, numCPUs, onExit, port, sendHeartbeat, signal, spawn, _i, _j, _len, _ref, _ref2, _ref3, _results;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    cb = args.pop() || (function() {
      throw "Must specify a callback";
    })();
    port = (_ref = args.shift()) != null ? _ref : "8888";
    host = (_ref2 = args.shift()) != null ? _ref2 : "0.0.0.0";
    cluster = require('cluster');
    SECONDS = 1000;
    MaxCPUs = 6;
    MinCPUs = 3;
    HeartbeatTimeout = 20 * SECONDS;
    HeartbeatInterval = 5 * SECONDS;
    RespawnDelay = 5 * SECONDS;
    MaxRequestsPerProcess = 100;
    numCPUs = require('os').cpus().length;
    if (numCPUs < MinCPUs) numCPUs = MinCPUs;
    if (numCPUs > MaxCPUs) numCPUs = MaxCPUs;
    log = function(str) {
      return console.log("[" + (new Date()) + "] " + str);
    };
    if (!cluster.isMaster) {
      process.on('message', function(m) {
        return process.send(true);
      });
      app = cb(port, host);
      if (app != null) {
        if (typeof app.listen === "function") app.listen(port, host);
      }
      return;
    }
    Workers = {};
    IsAlive = {};
    IsExiting = false;
    spawn = function() {
      var child;
      child = cluster.fork();
      child.on('message', function() {
        return IsAlive[this.pid] = Date.now();
      });
      Workers[child.pid] = child;
      return log("Worker spawned (pid " + child.pid + ").");
    };
    for (_i = 1; 1 <= numCPUs ? _i <= numCPUs : _i >= numCPUs; 1 <= numCPUs ? _i++ : _i--) {
      spawn();
    }
    cluster.on('death', function(_arg) {
      var exitCode, pid;
      pid = _arg.pid, exitCode = _arg.exitCode;
      delete Workers[pid];
      if (IsExiting) return;
      log("Worker died (pid " + pid + ", exitCode " + exitCode + "). Restarting in " + (RespawnDelay / SECONDS) + " sec...");
      return setTimeout(spawn, RespawnDelay);
    });
    sendHeartbeat = function() {
      var child, currentTime, lastHeartbeat, pid, _ref3, _results;
      currentTime = Date.now();
      _results = [];
      for (pid in Workers) {
        child = Workers[pid];
        lastHeartbeat = (_ref3 = IsAlive[pid]) != null ? _ref3 : Infinity;
        if (lastHeartbeat < (currentTime - HeartbeatTimeout)) {
          log("Worker not responding to ping in " + (HeartbeatTimeout / SECONDS) + " sec (pid " + pid + "). Killing it...");
          child.kill('SIGTERM');
          child.kill('SIGKILL');
          continue;
        }
        _results.push(child.send(true));
      }
      return _results;
    };
    setInterval(sendHeartbeat, HeartbeatInterval);
    log("Cluster server started, listening on " + host + ":" + port);
    onExit = function() {
      var child, pid;
      log("Cluster server stopped");
      IsExiting = true;
      for (pid in Workers) {
        child = Workers[pid];
        child.kill('SIGTERM');
        child.kill('SIGKILL');
      }
      return process.exit();
    };
    _ref3 = ['INT', 'TERM', 'KILL', 'QUIT'];
    _results = [];
    for (_j = 0, _len = _ref3.length; _j < _len; _j++) {
      signal = _ref3[_j];
      _results.push(process.on("SIG" + signal, onExit));
    }
    return _results;
  };

}).call(this);
