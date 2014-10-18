(function() {
  var App, Graph, Node, Viewer, app, colors, connected, getClass, height, sio, width,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  width = $(window).width();

  height = $(window).height();

  getClass = function(obj) {
    if (typeof obj === "undefined") {
      return "undefined";
    }
    if (obj === null) {
      return "null";
    }
    return Object.prototype.toString.call(obj).match(/^\[object\s(.*)\]$/)[1];
  };

  sio = io.connect();

  sio.socket.on('error', function(reason) {
    return console.error('Unable to connect Socket.IO', reason);
  });

  Viewer = (function() {
    function Viewer(app) {
      this.app = app;
      this.modRm = __bind(this.modRm, this);
      this.modOk = __bind(this.modOk, this);
      this.modal = __bind(this.modal, this);
      this.load = __bind(this.load, this);
      this.Attr = __bind(this.Attr, this);
      this.keyDown = __bind(this.keyDown, this);
      this.isVis = ko.observable(true);
      this.titre = ko.observable('');
      this.attr = ko.observableArray([]);
      this.newAttr = ko.observable('');
    }

    Viewer.prototype.keyDown = function(x, y) {
      if (y.which === 13) {
        this.modOk();
      }
      return true;
    };

    Viewer.prototype.Attr = function(name, val, del) {
      var at, exist, i, x, y, _i, _j, _k, _len, _len1, _ref, _ref1, _results;
      if (del == null) {
        del = false;
      }
      if (typeof name === "string") {
        if (val != null) {
          this.attr.push({
            name: name,
            val: ko.observable(val)
          });
          if (name[0] === "/") {
            return this[name.slice(1)] = val;
          }
        } else {
          at = ko.toJS(this.attr);
          for (i = _i = 0, _ref = at.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            x = at[i];
            if (x.name === name) {
              if (del) {
                this.attr.splice(i, 1);
                return true;
              }
              return x.val;
            }
          }
          return false;
        }
      } else {
        _results = [];
        for (_j = 0, _len = name.length; _j < _len; _j++) {
          x = name[_j];
          exist = false;
          _ref1 = this.attr();
          for (_k = 0, _len1 = _ref1.length; _k < _len1; _k++) {
            y = _ref1[_k];
            if (y.name === x.name) {
              exist = true;
              y.val(x.val || '');
            }
          }
          if (!exist) {
            this.attr.push({
              name: x.name,
              val: ko.observable(x.val || '')
            });
            if (name[0] === "/") {
              _results.push(this[name.slice(1)] = val);
            } else {
              _results.push(void 0);
            }
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    Viewer.prototype.load = function() {
      var sel;
      sel = this.app.selected_node || this.app.selected_link;
      if (sel != null) {
        this.titre(sel.text || '');
        this.attr([]);
        if (sel.attr != null) {
          this.Attr(sel.attr);
        }
        return $('.viewer .form-control').eq(0).focus();
      }
    };

    Viewer.prototype.modal = function() {
      return this.isVis(!this.isVis());
    };

    Viewer.prototype.modOk = function() {
      var sel;
      sel = this.app.selected_node || this.app.selected_link;
      if (!sel) {
        return;
      }
      sel.text = this.titre();
      if (this.newAttr() !== '') {
        this.Attr(this.newAttr(), '');
        this.newAttr('');
      }
      sel.attr = ko.toJS(this.attr());
      if (this.app.selected_node != null) {
        sio.emit('editNode', sel);
        sel.refreshAttr();
      }
      if (this.app.selected_link != null) {
        sio.emit('editLink', sel);
      }
      return this.app.restart();
    };

    Viewer.prototype.modRm = function(th) {
      this.Attr(th.name, void 0, true);
      this.app.selected_node.attr = ko.toJS(this.attr().slice(1));
      return sio.emit('editNode', this.app.selected_node);
    };

    return Viewer;

  })();

  colors = d3.scale.category10();

  Node = (function() {
    function Node(n) {
      this.refreshAttr = __bind(this.refreshAttr, this);
      var x, _i, _len, _ref;
      this._id = n._id;
      this.x = n.x || 0;
      this.y = n.y || 0;
      this.reflexive = false;
      this.attr = [];
      this.fixed = n.fixed;
      if (n.attr != null) {
        _ref = n.attr;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          x = _ref[_i];
          this.attr.push({
            name: x.name,
            val: x.val
          });
          if (x.name[0] === "/") {
            this[x.name.slice(1)] = x.val;
          }
        }
      }
      this.text = n.text;
    }

    Node.prototype.refreshAttr = function() {
      var x, _i, _len, _ref, _results;
      _ref = this.attr;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        if (x.name[0] === "/") {
          _results.push(this[x.name.slice(1)] = x.val);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    return Node;

  })();

  Graph = (function() {
    function Graph(visu) {
      this.visu = visu;
      this.spliceLinksForNode = __bind(this.spliceLinksForNode, this);
      this.delLink = __bind(this.delLink, this);
      this.addLink = __bind(this.addLink, this);
      this.delNode = __bind(this.delNode, this);
      this.addNode = __bind(this.addNode, this);
      this.nodes = [];
      this.links = [];
    }

    Graph.prototype.addNode = function(n) {
      var x,
        _this = this;
      if (n == null) {
        n = {
          x: 10,
          y: 10
        };
      }
      if (getClass(n) === "KeyboardEvent") {
        n = {
          x: 10,
          y: 10
        };
      }
      x = {};
      return sio.emit('addNode', n, function(res) {
        if (res == null) {
          return;
        }
        n._id = res;
        n = new Node(n);
        _this.nodes.push(n);
        _this.visu.selected_link = void 0;
        _this.visu.selected_node = n;
        _this.visu.viewer.load();
        return _this.visu.restart();
      });
    };

    Graph.prototype.delNode = function(n) {
      this.nodes.splice(this.nodes.indexOf(n), 1);
      this.spliceLinksForNode(n);
      return sio.emit('rmNode', n._id);
    };

    Graph.prototype.addLink = function(source, target, direction) {
      var link,
        _this = this;
      link = this.links.filter(function(l) {
        return l.source === source && l.target === target;
      })[0];
      if (link) {
        link.left = link.right = -1;
        link[direction] = true;
        return sio.emit('editLink', link);
      } else {
        link = {
          source: source,
          target: target,
          left: false,
          right: false,
          attr: []
        };
        link[direction] = true;
        return sio.emit('addLink', link, function(res) {
          link._id = res;
          _this.links.push(link);
          _this.visu.selected_link = link;
          _this.visu.selected_node = null;
          _this.visu.viewer.load();
          return _this.visu.restart();
        });
      }
    };

    Graph.prototype.delLink = function(l) {
      this.links.splice(this.links.indexOf(l), 1);
      return sio.emit('rmLink', l._id);
    };

    Graph.prototype.spliceLinksForNode = function(node) {
      var toSplice,
        _this = this;
      toSplice = this.links.filter(function(l) {
        return l.source === node || l.target === node;
      });
      return toSplice.map(function(l) {
        sio.emit('rmLink', l._id);
        return _this.links.splice(_this.links.indexOf(l), 1);
      });
    };

    return Graph;

  })();

  App = (function() {
    App.prototype.svgDblclick = function() {
      this.svg.classed('active', true);
      if (d3.event.ctrlKey || this.mousedown_node || this.mousedown_link) {
        return;
      }
      this.graph.addNode({
        x: d3.event.offsetX,
        y: d3.event.offsetY
      });
      return this.restart();
    };

    App.prototype.svgMouseMove = function() {
      if (this.mousedown_node) {
        this.drag_line.attr('d', 'M' + this.mousedown_node.dx + ',' + this.mousedown_node.dy + 'L' + d3.event.offsetX + ',' + d3.event.offsetY);
        return this.restart();
      } else if (this.mousedown_svg.x != null) {
        this.delta.x += d3.event.offsetX - this.mousedown_svg.x;
        this.delta.y += d3.event.offsetY - this.mousedown_svg.y;
        this.mousedown_svg.x = d3.event.offsetX;
        this.mousedown_svg.y = d3.event.offsetY;
        return this.restart();
      }
    };

    App.prototype.svgMouseDown = function() {
      return this.mousedown_svg = {
        x: d3.event.offsetX,
        y: d3.event.offsetY
      };
    };

    App.prototype.svgMouseUp = function() {
      if (this.mousedown_node) {
        this.drag_line.classed('hidden', true).style('marker-end', '');
      }
      this.svg.classed('active', false);
      this.mousedown_svg = {};
      return this.resetMouseVars();
    };

    App.prototype.svgMouseWheel = function() {
      var heightMid, scaleVal, widthMid,
        _this = this;
      scaleVal = 0.04;
      widthMid = window.innerWidth * scaleVal / 2;
      heightMid = window.innerHeight * scaleVal / 2;
      if (d3.event.wheelDelta > 0) {
        this.scale += scaleVal;
        this.delta.x -= widthMid;
        this.delta.y -= heightMid;
      } else if (d3.event.wheelDelta < 0) {
        this.scale -= scaleVal;
        this.delta.x += widthMid;
        this.delta.y += heightMid;
      }
      d3.select('svg').selectAll('g').attr('transform', function() {
        return "scale(" + _this.scale + ")";
      });
      return this.restart();
    };

    App.prototype.initSvg = function() {
      this.svg = d3.select('body').append('svg');
      this.svg.append('svg:defs').append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 30).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#000');
      this.svg.append('svg:defs').append('svg:marker').attr('id', 'start-arrow').attr('viewBox', '0 -5 10 10').attr('refX', -20).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M10,-5L0,0L10,5').attr('fill', '#000');
      this.drag_line = this.svg.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');
      this.path = this.svg.append('svg:g').selectAll('path');
      this.label = this.svg.append('svg:g').selectAll('textpath');
      this.circle = this.svg.append('svg:g').selectAll('g');
      return this.svg.on('dblclick', this.svgDblclick).on('mousemove', this.svgMouseMove).on('mouseup', this.svgMouseUp).on('mousedown', this.svgMouseDown).on('wheel.zoom', this.svgMouseWheel);
    };

    function App() {
      this.nodeFixer = __bind(this.nodeFixer, this);
      this.delCurrentSelection = __bind(this.delCurrentSelection, this);
      this.dragKeyUp = __bind(this.dragKeyUp, this);
      this.dragKeyDown = __bind(this.dragKeyDown, this);
      this.restart = __bind(this.restart, this);
      this.tick = __bind(this.tick, this);
      this.resetMouseVars = __bind(this.resetMouseVars, this);
      this.resize = __bind(this.resize, this);
      this.initSvg = __bind(this.initSvg, this);
      this.svgMouseWheel = __bind(this.svgMouseWheel, this);
      this.svgMouseUp = __bind(this.svgMouseUp, this);
      this.svgMouseDown = __bind(this.svgMouseDown, this);
      this.svgMouseMove = __bind(this.svgMouseMove, this);
      this.svgDblclick = __bind(this.svgDblclick, this);
      this.selected_node = null;
      this.selected_link = null;
      this.mousedown_link = null;
      this.mousedown_node = null;
      this.mouseup_node = null;
      this.mousedown_svg = {};
      this.delta = {
        x: 0,
        y: 0
      };
      this.scale = 1;
      this.lastKeyDown = -1;
      this.graph = new Graph(this);
      this.viewer = new Viewer(this);
      ko.applyBindings(this.viewer);
      this.initSvg();
      this.force = d3.layout.force().nodes(this.graph.nodes).links(this.graph.links).size([width, height]).linkDistance(150).charge(-500).on('tick', this.tick);
      document.documentElement.style.overflow = 'hidden';
      document.body.scroll = "no";
      d3.select(window).on('resize', this.resize);
      this.resize();
    }

    App.prototype.resize = function() {
      width = window.innerWidth;
      height = window.innerHeight;
      this.svg.attr('height', height).attr("width", width);
      return this.force.size([width, height]);
    };

    App.prototype.resetMouseVars = function() {
      this.mousedown_node = null;
      this.mouseup_node = null;
      return this.mousedown_link = null;
    };

    App.prototype.tick = function() {
      var node, _i, _len, _ref,
        _this = this;
      _ref = this.graph.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        node.dx = node.x * this.scale;
        node.dx = node.dx + this.delta.x;
        node.dy = node.y * this.scale;
        node.dy = node.dy + this.delta.y;
      }
      this.path.selectAll('path.link').attr('d', function(d) {
        var deltaX, deltaY, dist, normX, normY, sourcePadding, sourceX, sourceY, targetPadding, targetX, targetY;
        deltaX = d.target.dx - d.source.dx;
        deltaY = d.target.dy - d.source.dy;
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        normX = deltaX / dist;
        normY = deltaY / dist;
        sourcePadding = 0;
        targetPadding = 0;
        sourceX = d.source.dx + (sourcePadding * normX);
        sourceY = d.source.dy + (sourcePadding * normY);
        targetX = d.target.dx - (targetPadding * normX);
        targetY = d.target.dy - (targetPadding * normY);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
      });
      this.path.selectAll('path.forText').attr('d', function(d) {
        var deltaX, deltaY, dist, normX, normY, sourcePadding, sourceX, sourceY, targetPadding, targetX, targetY;
        deltaX = d.target.dx - d.source.dx;
        deltaY = d.target.dy - d.source.dy;
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        normX = deltaX / dist;
        normY = deltaY / dist;
        sourcePadding = d.left ? 17 : 12;
        targetPadding = d.right ? 17 : 12;
        sourceX = d.source.dx + (sourcePadding * normX);
        sourceY = d.source.dy + (sourcePadding * normY);
        targetX = d.target.dx - (targetPadding * normX);
        targetY = d.target.dy - (targetPadding * normY);
        if (targetX < sourceX) {
          return 'M' + targetX + ',' + targetY + 'L' + sourceX + ',' + sourceY;
        } else {
          return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        }
      });
      return this.circle.attr('transform', function(d) {
        var dx, dy;
        dx = d.dx - d.width / 2;
        dy = d.dy - d.height / 2;
        return "translate(" + dx + ", " + dy + ")";
      });
    };

    App.prototype.restart = function() {
      var g, p, th;
      th = this;
      this.path = this.path.data(this.graph.links, function(d) {
        return d._id;
      });
      this.path.selectAll('path.link').classed('selected', function(d) {
        return d === th.selected_link;
      }).style('marker-start', function(d) {
        if (d.left) {
          return 'url(#start-arrow)';
        } else {
          return '';
        }
      }).style('marker-end', function(d) {
        if (d.right) {
          return 'url(#end-arrow)';
        } else {
          return '';
        }
      });
      this.path.selectAll('text').each(function(d) {
        return $(this).children().text(d.text);
      });
      p = this.path.enter().append('svg:g');
      p.append('svg:path').attr('id', function(d) {
        return d._id;
      }).attr('class', 'link').classed('selected', function(d) {
        return d === th.selected_link;
      }).style('marker-start', function(d) {
        if (d.left) {
          return 'url(#start-arrow)';
        } else {
          return '';
        }
      }).style('marker-end', function(d) {
        if (d.right) {
          return 'url(#end-arrow)';
        } else {
          return '';
        }
      }).on('mousedown', function(d) {
        if (d3.event.ctrlKey) {
          return;
        }
        th.mousedown_link = d;
        if (th.mousedown_link === th.selected_link) {
          th.selected_link = null;
        } else {
          th.selected_link = th.mousedown_link;
        }
        th.selected_node = null;
        th.restart();
        return th.viewer.load();
      });
      p.append('svg:path').attr('class', 'forText').attr('id', function(d) {
        return "text_" + d._id;
      });
      p.append("svg:text").attr('dy', -5).attr('text-anchor', 'middle').append("svg:textPath").attr('startOffset', "50%").attr("stroke", "black").attr("xlink:href", function(d) {
        return '#text_' + d._id;
      }).text(function(d) {
        return d.text;
      });
      this.path.exit().remove();
      this.circle = this.circle.data(this.graph.nodes, function(d) {
        return d._id;
      });
      this.circle.selectAll('rect').style('fill', function(d) {
        if (d.color != null) {
          return d.color;
        }
        if (d === th.selected_node) {
          return d3.rgb(colors(d._id)).brighter().toString();
        } else {
          return colors(d._id);
        }
      }).classed('reflexive', function(d) {
        return d.fixed;
      });
      this.circle.selectAll('text').text(function(d) {
        return d.text;
      });
      g = this.circle.enter().append('svg:g').on('mouseover', function(d) {});
      g.append('svg:rect').attr('class', 'node').style('fill', function(d) {
        if (d.color != null) {
          return d.color;
        }
        if (d === th.selected_node) {
          return d3.rgb(colors(d._id)).brighter().toString();
        } else {
          return colors(d._id);
        }
      }).style('stroke', function(d) {
        if (d.strokeColor != null) {
          return d.strokeColor;
        }
        return d3.rgb(colors(d._id)).darker().toString();
      }).classed('reflexive', function(d) {
        return d.reflexive != null;
      }).on('mouseout', function(d) {
        return d3.select(this).attr('transform', '');
      }).on('mousedown', function(d) {
        th.mousedown_node = d;
        th.selected_node = th.mousedown_node;
        th.selected_link = null;
        th.viewer.load();
        if (d3.event.ctrlKey) {
          return;
        }
        th.drag_line.style('marker-end', 'url(#end-arrow)').classed('hidden', false).attr('d', 'M' + th.mousedown_node.dx + ',' + th.mousedown_node.dy + 'L' + th.mousedown_node.dx + ',' + th.mousedown_node.dy);
        return th.restart();
      }).on('mouseup', function(d) {
        var direction, source, target;
        if (!th.mousedown_node) {
          return;
        }
        th.drag_line.classed('hidden', true).style('marker-end', '');
        th.mouseup_node = d;
        if (th.mouseup_node === th.mousedown_node) {
          th.resetMouseVars();
          return;
        }
        d3.select(this).attr('transform', '');
        source = -1;
        target = -1;
        direction = -1;
        if (th.mousedown_node._id < th.mouseup_node._id) {
          source = th.mousedown_node;
          target = th.mouseup_node;
          direction = 'right';
        } else {
          source = th.mouseup_node;
          target = th.mousedown_node;
          direction = 'left';
        }
        return th.graph.addLink(source, target, direction);
      });
      g.append('svg:text').attr('x', 0).attr('y', 4).attr('class', 'id').text(function(d) {
        return d.text;
      });
      this.circle.selectAll('rect').attr('width', function(d) {
        return d.width = $(this).next().innerWidth() + 8;
      }).attr('height', function(d) {
        return d.height = $(this).next().innerHeight() + 8;
      }).attr('rx', 4).attr('ry', 4);
      this.circle.selectAll('text').attr('x', function(d) {
        return $(this).innerWidth() / 2 + 4;
      }).attr('y', function(d) {
        return $(this).innerHeight() + 2;
      });
      this.circle.exit().remove();
      if (!this.svg.classed('ctrl')) {
        return this.force.start();
      } else {
        return this.tick();
      }
    };

    App.prototype.dragKeyDown = function() {
      var _this = this;
      this.circle.call(d3.behavior.drag().on("dragstart", function() {
        return _this.force.stop();
      }).on("drag", function() {
        _this.mousedown_node.px += d3.event.dx / _this.scale;
        _this.mousedown_node.py += d3.event.dy / _this.scale;
        _this.mousedown_node.x += d3.event.dx / _this.scale;
        _this.mousedown_node.y += d3.event.dy / _this.scale;
        return _this.tick();
      }).on("dragend", function(d, i) {
        sio.emit('editNode', d);
        return _this.force.resume();
      }));
      return this.svg.classed('ctrl', true);
    };

    App.prototype.dragKeyUp = function() {
      this.circle.on('mousedown.drag', null).on('touchstart.drag', null);
      return this.svg.classed('ctrl', false);
    };

    App.prototype.delCurrentSelection = function() {
      if (this.selected_node) {
        this.graph.delNode(this.selected_node);
        this.selected_node = null;
      } else if (this.selected_link) {
        this.graph.delLink(this.selected_link);
        this.selected_link = null;
      }
      return this.restart();
    };

    App.prototype.nodeFixer = function() {
      if ((this.selected_node == null) || $('#myModal').attr("aria-hidden") === "false") {
        return;
      }
      this.selected_node.fixed = !this.selected_node.fixed;
      return sio.emit('editNode', this.selected_node);
    };

    return App;

  })();

  window.app = app = new App();

  connected = false;

  sio.on('connect', function() {
    var href;
    console.info("successfully established a working connection \\o/");
    href = window.location.href;
    if (!connected) {
      return sio.emit('graphInit', href.slice(href.lastIndexOf('/') + 1));
    }
  });

  sio.on('graphInit', function(graph) {
    var i, len, link, node, _i, _j, _len, _len1, _ref, _ref1;
    connected = true;
    _ref = graph.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      app.graph.nodes.push(new Node(node));
    }
    _ref1 = graph.links;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      link = _ref1[_j];
      len = app.graph.nodes.length;
      i = 0;
      while (i < len && app.graph.nodes[i]._id !== link.target) {
        i++;
      }
      if (i < len) {
        link.target = app.graph.nodes[i];
        i = 0;
        while (i < len && app.graph.nodes[i]._id !== link.source) {
          i++;
        }
        if (i < len) {
          link.source = app.graph.nodes[i];
          app.graph.links.push(link);
        } else {
          sio.emit('rmLink', link._id);
        }
      } else {
        sio.emit('rmLink', link._id);
      }
    }
    return app.restart();
  });

  sio.on('addNode', function(node) {
    app.graph.nodes.push(node);
    return app.restart();
  });

  sio.on('editNode', function(node) {
    var i, len;
    len = app.graph.nodes.length;
    i = 0;
    while (i < len && app.graph.nodes[i]._id !== node._id) {
      i++;
    }
    app.graph.nodes[i].text = node.text;
    app.graph.nodes[i].reflexive = node.reflexive;
    app.graph.nodes[i].fixed = node.fixed;
    app.graph.nodes[i].x = node.x;
    app.graph.nodes[i].y = node.y;
    return app.restart();
  });

  sio.on('rmNode', function(id) {
    var i, len, toSplice,
      _this = this;
    len = app.graph.nodes.length;
    i = 0;
    while (i < len && app.graph.nodes[i]._id !== id) {
      i++;
    }
    app.graph.nodes.splice(i, 1);
    toSplice = app.graph.links.filter(function(l) {
      return l.source._id === id || l.target._id === id;
    });
    toSplice.map(function(l) {
      return app.graph.links.splice(app.graph.links.indexOf(l), 1);
    });
    return app.restart();
  });

  sio.on('addLink', function(link) {
    var i, len;
    len = app.graph.nodes.length;
    i = 0;
    while (i < len && app.graph.nodes[i]._id !== link.target) {
      i++;
    }
    link.target = app.graph.nodes[i];
    i = 0;
    while (i < len && app.graph.nodes[i]._id !== link.source) {
      i++;
    }
    link.source = app.graph.nodes[i];
    app.graph.links.push(link);
    return app.restart();
  });

  sio.on('editLink', function(link) {
    var i, len;
    len = app.graph.links.length;
    i = 0;
    while (i < len && app.graph.links[i]._id !== link._id) {
      i++;
    }
    app.link[i] = link;
    return app.restart();
  });

  sio.on('rmLink', function(id) {
    var i, len;
    len = app.graph.links.length;
    i = 0;
    while (i < len && app.graph.links[i]._id !== id) {
      i++;
    }
    app.graph.links.splice(i, 1);
    return app.restart();
  });

  Mousetrap.bind(['f', 'enter'], app.viewer.modal).bind('del', app.delCurrentSelection).bind('s', app.nodeFixer).bind('ctrl', app.dragKeyDown, 'keydown').bind('ctrl', app.dragKeyUp, 'keyup').bind('x o', app.viewer.modal).bind('n', app.graph.addNode);

}).call(this);

/*
//@ sourceMappingURL=app.js.map
*/