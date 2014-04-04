(function() {
  var CoC, db, exports, mongoose;

  mongoose = require('mongoose');

  db = mongoose.connect('mongodb://127.0.0.1/graph');

  CoC = (function() {
    function CoC() {
      var con, key, _ref;
      this.controllers = {
        user: require('./user'),
        graph: require('./graph')
      };
      _ref = this.controllers;
      for (key in _ref) {
        con = _ref[key];
        this[key] = con;
      }
    }

    CoC.prototype.send = function(controller, methode, req, cb) {
      var _ref;
      if (((_ref = controllers[controller]) != null ? _ref[methode] : void 0) != null) {
        return controllers[controller][methode](req, cb);
      } else {
        return cb('GTFO');
      }
    };

    return CoC;

  })();

  module.exports = exports = new CoC();

}).call(this);

/*
//@ sourceMappingURL=controller.js.map
*/