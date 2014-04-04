(function() {
  var CoC, app, assets, d3, express, io, requireLongin, server, store, stylus;

  express = require('express');

  stylus = require('stylus');

  assets = require('connect-assets');

  d3 = require('d3');

  CoC = require('./controllers/controller');

  app = express();

  server = require('http').createServer(app);

  io = require('socket.io').listen(server);

  server.port = process.env.PORT || process.env.VMC_APP_PORT || 3000;

  app.use(assets());

  app.use(express["static"](process.cwd() + '/public'));

  store = new express.session.MemoryStore;

  app.use(express.cookieParser());

  app.use(express.session({
    secret: 'shhh',
    store: store
  }));

  app.set('view engine', 'jade');

  app.use(express.bodyParser());

  app.use(express.cookieParser("shhh"));

  requireLongin = function(req, res, next) {
    if (req.session.username != null) {
      return next();
    } else {
      return res.redirect('/login');
    }
  };

  app.get('/*', function(req, res) {
    return res.sendfile('views/index.html');
  });

  app.get('/login', function(req, res) {
    return res.sendfile('views/login.html');
  });

  io.configure(function() {
    return io.set('authorization', function(handshakeData, cb) {
      if (handshakeData.address.address === '79.89.104.82') {
        return cb(null, true);
      } else {
        return cb(null, true);
      }
    });
  });

  io.sockets.on('connection', function(socket) {
    var room;
    room = '';
    socket.on('graphInit', function(data, cb) {
      room = data;
      socket.join(data);
      return CoC.graph.createOrGet(data, function(err, graph) {
        return socket.emit('graphInit', graph || err);
      });
    });
    socket.on('addNode', function(data, cb) {
      data.room = room;
      return CoC.graph.addNode(data, function(err, res) {
        if (err) {
          return cb();
        } else {
          cb(res._id);
          return socket.broadcast.to(room).emit('addNode', res);
        }
      });
    });
    socket.on('addLink', function(data, cb) {
      data.room = room;
      return CoC.graph.addLink(data, function(err, res) {
        console.log('addLink : ', err, res);
        if (err) {
          return cb();
        } else {
          cb(res._id);
          return socket.broadcast.to(room).emit('addLink', res);
        }
      });
    });
    socket.on('editNode', function(data, cb) {
      data.room = room;
      return CoC.graph.editNode(data, function(err, res) {
        console.log(err, res);
        return socket.broadcast.to(room).emit('editNode', res);
      });
    });
    socket.on('editLink', function(data, cb) {
      data.room = room;
      return CoC.graph.editLink(data, function(err, res) {
        console.log(err, res);
        return socket.broadcast.to(room).emit('editLink', res);
      });
    });
    socket.on('rmNode', function(data, cb) {
      data = {
        id: data,
        room: room
      };
      return CoC.graph.rmNode(data, function(err, res) {
        console.log('rmNode', err, res);
        return socket.broadcast.to(room).emit('rmNode', res);
      });
    });
    return socket.on('rmLink', function(data, cb) {
      console.log("rmLink", data);
      data = {
        _id: data,
        room: room
      };
      return CoC.graph.rmLink(data, function(err, res) {
        console.log('rmLink', err, res);
        return socket.broadcast.to(room).emit('rmLink', res);
      });
    });
  });

  module.exports = server;

}).call(this);

/*
//@ sourceMappingURL=index.js.map
*/