(function() {
  var G, Graph, OI, async, exports, graphSchema, mongoose;

  mongoose = require('mongoose');

  async = require('async');

  OI = mongoose.Schema.Types.ObjectId;

  graphSchema = new mongoose.Schema({
    room: String,
    nodes: [
      {
        reflexive: Boolean,
        text: String,
        x: Number,
        y: Number
      }
    ],
    links: [
      {
        left: Boolean,
        right: Boolean,
        source: String,
        target: String
      }
    ]
  });

  G = mongoose.model('Graph', graphSchema);

  Graph = (function() {
    function Graph() {}

    Graph.prototype.createOrGet = function(room, cb) {
      if ((room == null) || room === '') {
        return cb('noRoom');
      }
      console.log("/graph/createOrGet :");
      return G.findOne({
        room: room
      }, function(err, res) {
        var graph;
        if (err != null) {
          return cb(err);
        }
        if (res != null) {
          console.log('found : ', res);
          return cb(void 0, res);
        } else {
          graph = new G();
          graph.room = room;
          return graph.save(function(err, res) {
            console.log('created');
            return cb(err, res);
          });
        }
      });
    };

    Graph.prototype.addNode = function(req, cb) {
      if ((req.room == null) || req.room === '') {
        return cb('noRoom');
      }
      return async.waterfall([
        function(fn) {
          return G.findOne({
            room: req.room
          }, function(err, res) {
            if ((err != null) || (res == null)) {
              return fn(err || 'dafukRoom');
            }
            return fn(void 0, res);
          });
        }, function(graph, fn) {
          graph.nodes.push({
            x: req.x,
            y: req.y
          });
          return graph.save(fn);
        }
      ], function(err, res) {
        if (err != null) {
          return cb(err);
        } else {
          console.log('added', res.nodes[res.nodes.length - 1]);
          return cb(void 0, res.nodes[res.nodes.length - 1]);
        }
      });
    };

    Graph.prototype.editNode = function(req, cb) {
      var i;
      if ((req.room == null) || req.room === '') {
        return cb('noRoom');
      }
      if ((req.id == null) || req.id === '') {
        return cb('noId');
      }
      i = 0;
      return async.waterfall([
        function(fn) {
          return G.findOne({
            room: req.room
          }, function(err, res) {
            if ((err != null) || (res == null)) {
              return fn(err || 'dafukRoom');
            }
            return fn(void 0, res);
          });
        }, function(graph, fn) {
          var len;
          len = graph.nodes.length;
          while (i < len && graph.nodes[i]._id.toString() !== req.id) {
            i++;
          }
          if (i < len) {
            graph.nodes[i].text = req.text;
            graph.nodes[i].reflexive = req.reflexive;
            return graph.save(function(err, res) {
              return fn(err, res);
            });
          } else {
            return fn('oops');
          }
        }
      ], function(err, res) {
        if (err != null) {
          return cb(err);
        } else {
          return cb(void 0, res.nodes[i]);
        }
      });
    };

    Graph.prototype.rmNode = function(req, cb) {
      if ((req.room == null) || req.room === '') {
        return cb('noRoom');
      }
      if ((req.id == null) || req.id === '') {
        return cb('noId');
      }
      return G.findOneAndUpdate({
        room: req.room
      }, {
        $pull: {
          nodes: {
            _id: req.id
          }
        }
      }, function(err, res) {
        if ((err != null) || (res == null)) {
          return fn(err || 'dafukRoom');
        }
        return cb(void 0, req.id);
      });
    };

    Graph.prototype.addLink = function(req, cb) {
      if ((req.room == null) || req.room === '') {
        return cb('noRoom');
      }
      return async.waterfall([
        function(fn) {
          return G.findOne({
            room: req.room
          }, function(err, res) {
            if ((err != null) || (res == null)) {
              return fn(err || 'dafukRoom');
            }
            return fn(void 0, res);
          });
        }, function(graph, fn) {
          graph.links.push({
            left: req.left,
            right: req.right,
            source: req.source.id,
            target: req.target.id
          });
          return graph.save(fn);
        }
      ], function(err, res) {
        if (err != null) {
          return cb(err);
        } else {
          console.log('addLink', res.links[res.links.length - 1]);
          return cb(void 0, res.links[res.links.length - 1]);
        }
      });
    };

    Graph.prototype.editLink = function(req, cb) {
      console.log("editLink", req);
      if ((req.room == null) || req.room === '') {
        return cb('noRoom');
      }
      if ((req._id == null) || req._id === '') {
        return cb('noId');
      }
      return async.waterfall([
        function(fn) {
          return G.findOne({
            room: req.room
          }, function(err, res) {
            if ((err != null) || (res == null)) {
              return fn(err || 'dafukRoom');
            }
            return fn(void 0, res);
          });
        }, function(graph, fn) {
          var i, len;
          len = graph.links.length;
          i = 0;
          while (i < len && graph.links[i]._id.toString() !== req._id) {
            i++;
          }
          if (i < len) {
            graph.links[i].left = req.left;
            graph.links[i].right = req.right;
            return graph.save(fn);
          } else {
            return fn('oops');
          }
        }
      ], function(err, res) {
        if (err != null) {
          return cb(err);
        } else {
          return cb(void 0, res.links[res.links.length - 1]);
        }
      });
    };

    Graph.prototype.rmLink = function(req, cb) {
      console.log(req);
      if ((req.room == null) || req.room === '') {
        return cb('noRoom');
      }
      if ((req._id == null) || req._id === '') {
        return cb('noId');
      }
      return G.findOneAndUpdate({
        room: req.room
      }, {
        $pull: {
          links: {
            _id: req._id
          }
        }
      }, function(err, res) {
        if ((err != null) || (res == null)) {
          return fn(err || 'dafukRoom');
        }
        return cb(void 0, req._id);
      });
    };

    return Graph;

  })();

  module.exports = exports = new Graph();

}).call(this);

/*
//@ sourceMappingURL=graph.js.map
*/