require('./cluster-server')(function() {
  var express = require('express');
  var app = express.createServer();
  app.get('/', function(req, res) {
    return res.send("Hello, World");
  });
  return app; // calls app.listen(port, host) automatically
});

