(function() {
  var App, app, colors, connected, height, sio, width,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  width = window.innerWidth;

  height = window.innerHeight;

  sio = io.connect();

  sio.socket.on('error', function(reason) {
    return console.error('Unable to connect Socket.IO', reason);
  });

  colors = d3.scale.category10();

  App = (function() {
    function App() {
      this.changeText = __bind(this.changeText, this);
      this.keyup = __bind(this.keyup, this);
      this.keydown = __bind(this.keydown, this);
      this.spliceLinksForNode = __bind(this.spliceLinksForNode, this);
      this.restart = __bind(this.restart, this);
      this.tick = __bind(this.tick, this);
      this.resetMouseVars = __bind(this.resetMouseVars, this);
      var th,
        _this = this;
      this.lastKeyDown = -1;
      this.svg = d3.select('body').append('svg').attr('width', width).attr('height', height);
      this.nodes = [];
      this.links = [];
      this.force = d3.layout.force().nodes(this.nodes).links(this.links).size([width, height]).linkDistance(50).charge(-200).on('tick', this.tick);
      this.svg.append('svg:defs').append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 6).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#000');
      this.svg.append('svg:defs').append('svg:marker').attr('id', 'start-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 4).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M10,-5L0,0L10,5').attr('fill', '#000');
      this.drag_line = this.svg.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');
      this.path = this.svg.append('svg:g').selectAll('path');
      this.circle = this.svg.append('svg:g').selectAll('g');
      this.selected_node = null;
      this.selected_link = null;
      this.mousedown_link = null;
      this.mousedown_node = null;
      this.mouseup_node = null;
      th = this;
      d3.select(window).on('keydown', this.keydown).on('keyup', this.keyup);
      this.svg.on('dblclick', function() {
        var node, point;
        th.svg.classed('active', true);
        if (d3.event.ctrlKey || th.mousedown_node || th.mousedown_link) {
          return;
        }
        point = d3.mouse(this);
        node = {
          reflexive: false
        };
        node.x = point[0];
        node.y = point[1];
        return sio.emit('addNode', node, function(res) {
          if (res == null) {
            return;
          }
          node.id = res;
          th.nodes.push(node);
          th.selected_link = void 0;
          th.selected_node = node;
          $('#texter').focus();
          return th.restart();
        });
      }).on('mousemove', function() {
        if (!th.mousedown_node) {
          return;
        }
        th.drag_line.attr('d', 'M' + th.mousedown_node.x + ',' + th.mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
        return th.restart();
      }).on('mouseup', function() {
        if (_this.mousedown_node) {
          _this.drag_line.classed('hidden', true).style('marker-end', '');
        }
        _this.svg.classed('active', false);
        return _this.resetMouseVars();
      });
    }

    App.prototype.resetMouseVars = function() {
      this.mousedown_node = null;
      this.mouseup_node = null;
      return this.mousedown_link = null;
    };

    App.prototype.tick = function() {
      this.path.attr('d', function(d) {
        var deltaX, deltaY, dist, normX, normY, sourcePadding, sourceX, sourceY, targetPadding, targetX, targetY;
        deltaX = d.target.x - d.source.x;
        deltaY = d.target.y - d.source.y;
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        normX = deltaX / dist;
        normY = deltaY / dist;
        sourcePadding = d.left ? 17 : 12;
        targetPadding = d.right ? 17 : 12;
        sourceX = d.source.x + (sourcePadding * normX);
        sourceY = d.source.y + (sourcePadding * normY);
        targetX = d.target.x - (targetPadding * normX);
        targetY = d.target.y - (targetPadding * normY);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
      });
      return this.circle.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    };

    App.prototype.restart = function() {
      var g, th;
      th = this;
      this.path = this.path.data(this.links);
      this.path.classed('selected', function(d) {
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
      this.path.enter().append('svg:path').attr('class', 'link').classed('selected', function(d) {
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
      this.path.exit().remove();
      this.circle = this.circle.data(this.nodes, function(d) {
        return d.id;
      });
      this.circle.selectAll('circle').style('fill', function(d) {
        if (d === th.selected_node) {
          return d3.rgb(colors(d.id)).brighter().toString();
        } else {
          return colors(d.id);
        }
      }).classed('reflexive', function(d) {
        return d.reflexive;
      });
      this.circle.selectAll('text').text(function(d) {
        return d.text;
      });
      g = this.circle.enter().append('svg:g');
      g.append('svg:circle').attr('class', 'node').attr('r', 12).style('fill', function(d) {
        if (d === th.selected_node) {
          return d3.rgb(colors(d.id)).brighter().toString();
        } else {
          return colors(d.id);
        }
      }).style('stroke', function(d) {
        return d3.rgb(colors(d.id)).darker().toString();
      }).classed('reflexive', function(d) {
        return d.reflexive;
      }).on('mouseover', function(d) {
        if (!th.mousedown_node || d === th.mousedown_node) {
          return;
        }
        return d3.select(this).attr('transform', 'scale(1.1)');
      }).on('mouseout', function(d) {
        if (!th.mousedown_node || d === th.mousedown_node) {
          return;
        }
        return d3.select(this).attr('transform', '');
      }).on('mousedown', function(d) {
        if (d3.event.ctrlKey) {
          return;
        }
        th.mousedown_node = d;
        if (th.mousedown_node === th.selected_node) {
          th.selected_node = null;
        } else {
          th.selected_node = th.mousedown_node;
        }
        th.selected_link = null;
        th.drag_line.style('marker-end', 'url(#end-arrow)').classed('hidden', false).attr('d', 'M' + th.mousedown_node.x + ',' + th.mousedown_node.y + 'L' + th.mousedown_node.x + ',' + th.mousedown_node.y);
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
      this.circle.exit().remove();
      return this.force.start();
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
          this.circle.call(this.force.drag);
          this.svg.classed('ctrl', true);
        }
        console.log(d3.event.keyCode);
        if (!this.selected_node && !this.selected_link) {
          return;
        }
        switch (d3.event.keyCode) {
          case 8:
          case 46:
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
          case 13:
            return $('#texter').focus();
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

    App.prototype.changeText = function(text) {
      if (text == null) {
        text = '';
      }
      if (!this.selected_node) {
        return;
      }
      this.selected_node.text = text;
      this.restart();
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
    app.nodes[i].text = node.text;
    app.nodes[i].reflexive = node.reflexive;
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