(function() {
  var App, Node, app, colors, connected, height, n, sio, width,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  width = window.innerWidth;

  height = window.innerHeight - 4;

  sio = io.connect();

  sio.socket.on('error', function(reason) {
    return console.error('Unable to connect Socket.IO', reason);
  });

  Node = (function() {
    function Node(app) {
      this.app = app;
      this.modRm = __bind(this.modRm, this);
      this.modOk = __bind(this.modOk, this);
      this.modal = __bind(this.modal, this);
      this.Attr = __bind(this.Attr, this);
      this.titre = ko.observable('');
      this.attr = ko.observableArray([]);
      this.newAttr = ko.observable('');
    }

    Node.prototype.Attr = function(name, val, del) {
      var at, exist, i, x, y, _i, _j, _k, _len, _len1, _ref, _ref1, _results;
      if (del == null) {
        del = false;
      }
      if (typeof name === "string") {
        if (val != null) {
          return this.attr.push({
            name: name,
            val: ko.observable(val)
          });
        } else {
          at = ko.toJS(this.attr);
          console.log(at);
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
            _results.push(this.attr.push({
              name: x.name,
              val: ko.observable(x.val || '')
            }));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    Node.prototype.modal = function() {
      var sel;
      if ($('#myModal').attr("aria-hidden") === "true") {
        sel = this.app.selected_node || this.app.selected_link;
        if (sel != null) {
          $('#myModal').modal('toggle');
          this.titre(sel.text || '');
          this.attr([]);
          if (sel.attr != null) {
            this.Attr(sel.attr);
          }
          return $('#myModal .form-control').eq(0).focus();
        }
      } else {
        $('input').blur();
        return this.modOk();
      }
    };

    Node.prototype.modOk = function() {
      var sel;
      sel = this.app.selected_node || this.app.selected_link;
      if (!sel) {
        return;
      }
      sel.text = this.titre();
      console.log(sel);
      if (this.newAttr() !== '') {
        this.Attr(this.newAttr(), '');
        this.newAttr('');
      }
      sel.attr = ko.toJS(this.attr());
      this.app.restart();
      if (this.app.selected_node != null) {
        sio.emit('editNode', sel);
      }
      if (this.app.selected_link != null) {
        return sio.emit('editLink', sel);
      }
    };

    Node.prototype.modRm = function(th) {
      console.log(th);
      this.Attr(th.name, void 0, true);
      return this.app.selected_node.attr = ko.toJS(this.attr().slice(1));
    };

    return Node;

  })();

  colors = d3.scale.category10();

  App = (function() {
    App.prototype.svgDblclick = function() {
      var node,
        _this = this;
      this.svg.classed('active', true);
      if (d3.event.ctrlKey || this.mousedown_node || this.mousedown_link) {
        return;
      }
      node = {
        reflexive: false
      };
      node.x = d3.event.offsetX;
      node.y = d3.event.offsetY;
      return sio.emit('addNode', node, function(res) {
        if (res == null) {
          return;
        }
        node.id = res;
        _this.nodes.push(node);
        _this.selected_link = void 0;
        _this.selected_node = node;
        $('#texter').focus();
        return _this.restart();
      });
    };

    App.prototype.svgMouseMove = function() {
      console.log("MM");
      if (this.mousedown_node) {
        this.drag_line.attr('d', 'M' + this.mousedown_node.dx + ',' + this.mousedown_node.dy + 'L' + d3.event.offsetX + ',' + d3.event.offsetY);
        return this.restart();
      } else if (this.mousedown_svg.x != null) {
        this.delta.x += d3.event.offsetX - this.mousedown_svg.x;
        this.delta.y += d3.event.offsetY - this.mousedown_svg.y;
        console.log("toto");
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
      if (d3.event.wheelDelta > 0) {
        this.scale += 0.025;
      } else if (d3.event.wheelDelta < 0) {
        this.scale -= 0.025;
      }
      this.restart();
      return console.log(d3.event);
    };

    App.prototype.initSvg = function() {
      this.svg = d3.select('body').append('svg').attr('width', width).attr('height', height);
      this.svg.append('svg:defs').append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 15).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#000');
      this.svg.append('svg:defs').append('svg:marker').attr('id', 'start-arrow').attr('viewBox', '0 -5 10 10').attr('refX', -20).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M10,-5L0,0L10,5').attr('fill', '#000');
      this.drag_line = this.svg.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');
      this.path = this.svg.append('svg:g').selectAll('path');
      this.label = this.svg.append('svg:g').selectAll('textpath');
      this.circle = this.svg.append('svg:g').selectAll('g');
      console.log(this.path, this.circle);
      return this.svg.on('dblclick', this.svgDblclick).on('mousemove', this.svgMouseMove).on('mouseup', this.svgMouseUp).on('mousedown', this.svgMouseDown).on('wheel.zoom', this.svgMouseWheel);
    };

    function App() {
      this.keyup = __bind(this.keyup, this);
      this.keydown = __bind(this.keydown, this);
      this.spliceLinksForNode = __bind(this.spliceLinksForNode, this);
      this.restart = __bind(this.restart, this);
      this.tick = __bind(this.tick, this);
      this.resetMouseVars = __bind(this.resetMouseVars, this);
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
      this.nodes = [];
      this.links = [];
      this.initSvg();
      this.force = d3.layout.force().nodes(this.nodes).links(this.links).size([width, height]).linkDistance(150).charge(-500).on('tick', this.tick);
      d3.select(window).on('keydown', this.keydown).on('keyup', this.keyup);
    }

    App.prototype.resetMouseVars = function() {
      this.mousedown_node = null;
      this.mouseup_node = null;
      return this.mousedown_link = null;
    };

    App.prototype.tick = function() {
      var node, _i, _len, _ref,
        _this = this;
      _ref = this.nodes;
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
      var g, p, texPa, th;
      th = this;
      this.path = this.path.data(this.links, function(d) {
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
        return th.restart();
      });
      p.append('svg:path').attr('class', 'forText').attr('id', function(d) {
        return "text_" + d._id;
      });
      texPa = p.append("svg:text").attr('dy', -5).attr('text-anchor', 'middle').append("svg:textPath").attr('startOffset', "50%").attr("stroke", "black").attr("xlink:href", function(d) {
        return '#text_' + d._id;
      }).text(function(d) {
        return d.text;
      });
      this.path.exit().remove();
      this.circle = this.circle.data(this.nodes, function(d) {
        return d.id;
      });
      this.circle.selectAll('rect').style('fill', function(d) {
        if (d === th.selected_node) {
          return d3.rgb(colors(d.id)).brighter().toString();
        } else {
          return colors(d.id);
        }
      }).classed('reflexive', function(d) {
        return d.fixed;
      });
      this.circle.selectAll('text').text(function(d) {
        return d.text;
      });
      g = this.circle.enter().append('svg:g');
      g.append('svg:rect').attr('class', 'node').style('fill', function(d) {
        if (d === th.selected_node) {
          return d3.rgb(colors(d.id)).brighter().toString();
        } else {
          return colors(d.id);
        }
      }).style('stroke', function(d) {
        return d3.rgb(colors(d.id)).darker().toString();
      }).classed('reflexive', function(d) {
        return d.reflexive != null;
      }).on('mouseover', function(d) {
        d3.select(this).attr('transform', 'scale(1.5)');
        return console.log(d3.select(this));
      }).on('mouseout', function(d) {
        return d3.select(this).attr('transform', '');
      }).on('mousedown', function(d) {
        th.mousedown_node = d;
        th.selected_node = th.mousedown_node;
        th.selected_link = null;
        if (d3.event.ctrlKey) {
          return;
        }
        th.drag_line.style('marker-end', 'url(#end-arrow)').classed('hidden', false).attr('d', 'M' + th.mousedown_node.dx + ',' + th.mousedown_node.dy + 'L' + th.mousedown_node.dx + ',' + th.mousedown_node.dy);
        return th.restart();
      }).on('mouseup', function(d) {
        var direction, link, source, target;
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
        if (th.mousedown_node.id < th.mouseup_node.id) {
          source = th.mousedown_node;
          target = th.mouseup_node;
          direction = 'right';
        } else {
          source = th.mouseup_node;
          target = th.mousedown_node;
          direction = 'left';
        }
        link = -1;
        link = th.links.filter(function(l) {
          return l.source === source && l.target === target;
        })[0];
        if (link) {
          link[direction] = true;
          sio.emit('editLink', link);
        } else {
          link = {
            source: source,
            target: target,
            left: false,
            right: false
          };
          link[direction] = true;
          sio.emit('addLink', link, function(res) {
            link.id = res;
            th.links.push(link);
            return th.restart();
          });
        }
        th.selected_link = link;
        th.selected_node = null;
        return th.restart();
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

    App.prototype.spliceLinksForNode = function(node) {
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

    App.prototype.keydown = function() {
      var _this = this;
      if ($('#texter:focus')[0] != null) {
        if (d3.event.keyCode === 13) {
          this.changeText($('#texter:focus').val());
          return $('#texter:focus').val('').blur();
        } else if (d3.event.keyCode === 27) {
          console.log(d3.event.keyCode);
          return $('#texter').blur();
        }
      } else {
        if (this.lastKeyDown !== -1) {
          return;
        }
        this.lastKeyDown = d3.event.keyCode;
        if (d3.event.keyCode === 17) {
          this.circle.call(d3.behavior.drag().on("dragstart", function() {
            return _this.force.stop();
          }).on("drag", function() {
            console.log("d", d3.event);
            _this.mousedown_node.px += d3.event.dx / _this.scale;
            _this.mousedown_node.py += d3.event.dy / _this.scale;
            _this.mousedown_node.x += d3.event.dx / _this.scale;
            _this.mousedown_node.y += d3.event.dy / _this.scale;
            return _this.tick();
          }).on("dragend", function(d, i) {
            console.log("dragend", d, i);
            sio.emit('editNode', d);
            return _this.force.resume();
          }));
          this.svg.classed('ctrl', true);
        }
        console.log(d3.event.keyCode);
        if (!this.selected_node && !this.selected_link) {
          return;
        }
        switch (d3.event.keyCode) {
          case 8:
          case 46:
            if ($('#myModal').attr("aria-hidden") === "false") {
              return;
            }
            if (this.selected_node) {
              this.nodes.splice(this.nodes.indexOf(this.selected_node), 1);
              this.spliceLinksForNode(this.selected_node);
              sio.emit('rmNode', this.selected_node.id);
            } else if (this.selected_link) {
              sio.emit('rmLink', this.selected_link._id);
              this.links.splice(this.links.indexOf(this.selected_link), 1);
            }
            this.selected_link = null;
            this.selected_node = null;
            return this.restart();
          case 66:
            if (this.selected_link) {
              this.selected_link.left = true;
              this.selected_link.right = true;
              sio.emit('editLink', this.selected_link);
            }
            return this.restart();
          case 76:
            if (this.selected_link) {
              this.selected_link.left = true;
              this.selected_link.right = false;
              sio.emit('editLink', this.selected_link);
            }
            return this.restart();
          case 82:
            if (this.selected_node) {
              this.selected_node.reflexive = !this.selected_node.reflexive;
              sio.emit('editNode', this.selected_node);
            } else if (this.selected_link) {
              this.selected_link.left = false;
              this.selected_link.right = true;
              sio.emit('editLink', this.selected_link);
            }
            return this.restart();
          case 83:
            if ((this.selected_node == null) || $('#myModal').attr("aria-hidden") === "false") {
              return;
            }
            this.selected_node.fixed = !this.selected_node.fixed;
            return sio.emit('editNode', this.selected_node);
          case 13:
            return n.modal();
        }
      }
    };

    App.prototype.keyup = function() {
      this.lastKeyDown = -1;
      if (d3.event.keyCode === 17) {
        this.circle.on('mousedown.drag', null).on('touchstart.drag', null);
        return this.svg.classed('ctrl', false);
      }
    };

    return App;

  })();

  window.app = app = new App();

  window.n = n = new Node(app);

  ko.applyBindings(n);

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
    console.log(graph);
    connected = true;
    _ref = graph.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      node.id = node._id;
      app.nodes.push(node);
    }
    _ref1 = graph.links;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      link = _ref1[_j];
      len = app.nodes.length;
      i = 0;
      while (i < len && app.nodes[i].id !== link.target) {
        i++;
      }
      if (i < len) {
        link.target = app.nodes[i];
        i = 0;
        while (i < len && app.nodes[i].id !== link.source) {
          i++;
        }
        if (i < len) {
          link.source = app.nodes[i];
          app.links.push(link);
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
    node.id = node._id;
    app.nodes.push(node);
    return app.restart();
  });

  sio.on('editNode', function(node) {
    var i, len;
    len = app.nodes.length;
    i = 0;
    while (i < len && app.nodes[i].id !== node._id) {
      i++;
    }
    console.log(node);
    app.nodes[i].text = node.text;
    app.nodes[i].reflexive = node.reflexive;
    app.nodes[i].fixed = node.fixed;
    app.nodes[i].x = node.x;
    app.nodes[i].y = node.y;
    return app.restart();
  });

  sio.on('rmNode', function(id) {
    var i, len, toSplice,
      _this = this;
    len = app.nodes.length;
    i = 0;
    while (i < len && app.nodes[i].id !== id) {
      i++;
    }
    app.nodes.splice(i, 1);
    toSplice = app.links.filter(function(l) {
      return l.source.id === id || l.target.id === id;
    });
    toSplice.map(function(l) {
      return app.links.splice(app.links.indexOf(l), 1);
    });
    return app.restart();
  });

  sio.on('addLink', function(link) {
    var i, len;
    len = app.nodes.length;
    i = 0;
    while (i < len && app.nodes[i].id !== link.target) {
      i++;
    }
    link.target = app.nodes[i];
    i = 0;
    while (i < len && app.nodes[i].id !== link.source) {
      i++;
    }
    link.source = app.nodes[i];
    app.links.push(link);
    return app.restart();
  });

  sio.on('editLink', function(link) {
    var i, len;
    len = app.links.length;
    i = 0;
    while (i < len && app.links[i]._id !== link.id) {
      i++;
    }
    app.link[i] = link;
    return app.restart();
  });

  sio.on('rmLink', function(id) {
    var i, len;
    len = app.links.length;
    i = 0;
    while (i < len && app.links[i]._id !== id) {
      i++;
    }
    app.links.splice(i, 1);
    return app.restart();
  });

}).call(this);

/*
//@ sourceMappingURL=app.js.map
*/