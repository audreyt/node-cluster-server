# cluster-server

Simple multi-CPU cluster server manager for Node 0.6+

## Install

`npm i cluster-server`

## Usage

```js
    // require('cluster-server')(port, host, cb);
    // port defaults to 8888, host defaults to "0.0.0.0"
    require('cluster-server')(function() {
      var express = require('express');
      var app = express.createServer();
      app.get('/', function(req, res) {
        return res.send("Hello, World");
      });
      return app; // calls app.listen(port, host) automatically
    });
```

## Description

This module pre-forks several workers, calls the supplied
function in each of the workers, and pings each worker
every second to restart any workers that were stuck or
terminated.

The number of workers is require('os').cpus().length, with
a minimum of 3 and a maximum of 6.

It also handles INT, TERM, KILL and QUIT signals and
terminates the workers accordingly.  However, setsid(1)
is still recommended so workers can terminate when the
master is killed by an non-catchable signal.

## See Also

* https://github.com/oleics/cluster-manager

(Same idea, but without polling for "stuck" workers)

## CC0 UNIVERSAL

To the extent possible under law, 唐鳳 has waived all copyright
and related or neighboring rights to node-cluster-server.

This work is published from Taiwan.

http://creativecommons.org/publicdomain/zero/1.0
