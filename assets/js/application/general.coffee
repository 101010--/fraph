width = $(window).width()
height = $(window).height()


getClass = (obj) ->
  if (typeof obj == "undefined")
    return "undefined"
  if (obj == null)
    return "null"
  return Object.prototype.toString.call(obj)
    .match(/^\[object\s(.*)\]$/)[1]

sio = io.connect()

sio.socket.on 'error', (reason) ->
  console.error 'Unable to connect Socket.IO', reason



# knockout for #viewer
class Viewer
	constructor: (@app) ->
		@isVis = ko.observable true
		@titre = ko.observable ''
		@attr = ko.observableArray []
		@newAttr = ko.observable ''

	keyDown: (x, y) =>
		@modOk() if y.which == 13
		return true

	Attr: (name, val, del = false) =>
		if typeof(name) == "string"
			if val?
				@attr.push
					name: name
					val: ko.observable(val)
				if name[0] == "/"
					@[name.slice(1)] = val
			else
				at = ko.toJS @attr
				for i in [0...at.length]
					x = at[i]
					if x.name == name
						if del
							@attr.splice i, 1
							return true
						return x.val
				return false
		else
			for x in name
				exist = false
				for y in @attr()
					if y.name == x.name
						exist = true
						y.val x.val || ''

				if !exist
					@attr.push
						name: x.name
						val: ko.observable(x.val || '')	
					if name[0] == "/"
						@[name.slice(1)] = val


	load: =>
		sel = @app.selected_node || @app.selected_link
		if sel?
			@titre sel.text || ''
			@attr []
			@Attr sel.attr if sel.attr?
			$('.viewer .form-control').eq(0).focus()

	modal: =>
		return @isVis !@isVis()
		# if !@isVis()

		# else
		# 	$('input').blur()
		# 	@modOk()

	modOk: =>
			sel = @app.selected_node || @app.selected_link
			return if !sel
			sel.text = @titre()
			if @newAttr() != ''
				@Attr @newAttr(), ''
				@newAttr ''
			sel.attr = ko.toJS(@attr())
			if @app.selected_node?
				sio.emit 'editNode', sel
				sel.refreshAttr()
			if @app.selected_link?
				sio.emit 'editLink', sel
			@app.restart()

	modRm: (th) =>
		# BADBADBAD
		@Attr th.name, undefined, true
		@app.selected_node.attr = ko.toJS(@attr()[1..])


colors = d3.scale.category10()

class Node
	constructor: (n) ->
		@_id = n._id
		@x = n.x || 0
		@y = n.y || 0
		@reflexive = false
		@attr = []
		@fixed = n.fixed
		if n.attr?
			for x in n.attr
				@attr.push
					name: x.name
					val: x.val
				if x.name[0] == "/"
					@[x.name.slice(1)] = x.val
		@text = n.text

	refreshAttr: =>
		for x in @attr
			if x.name[0] == "/"
				@[x.name.slice(1)] = x.val



class Graph
	constructor: (@visu) ->
		@nodes = []
		@links = []

	addNode: (n = {x: 10, y: 10}) =>
		n = {x: 10, y: 10} if getClass(n) == "KeyboardEvent"
		x = {}
		sio.emit 'addNode', n, (res) =>
			
			return if !res?
			n._id = res
			n = new Node n
			@nodes.push n
			@visu.selected_link = undefined
			@visu.selected_node = n
			@visu.viewer.load()
			@visu.restart()

	delNode: (n) =>
		@nodes.splice(@nodes.indexOf(n), 1)
		@spliceLinksForNode(n)
		sio.emit 'rmNode', n._id

	addLink: (source, target, direction) =>
		link = @links.filter((l) ->
			l.source == source && l.target == target
		)[0]

		if link
			link[direction] = true
			sio.emit 'editLink', link
		else
			link = {source: source, target: target, left: false, right: false, attr: []}
			link[direction] = true
			sio.emit 'addLink', link, (res) =>
				link._id = res
				@links.push link
				@visu.selected_link = link
				@visu.selected_node = null
				@visu.viewer.load()
				@visu.restart()

	delLink: (l) =>
		@links.splice(@links.indexOf(l), 1)
		sio.emit 'rmLink', n._id

	spliceLinksForNode: (node) =>
		toSplice = @links.filter((l) ->
			return (l.source == node || l.target == node);
		)
		toSplice.map((l) => 
			sio.emit 'rmLink', l._id
			@links.splice(@links.indexOf(l), 1)
		)


class App
	svgDblclick: =>
		# because :active only works in WebKit?
		@svg.classed('active', true)

		return if d3.event.ctrlKey || @mousedown_node || @mousedown_link

		@graph.addNode 
			x: d3.event.offsetX
			y: d3.event.offsetY

		@restart()

	svgMouseMove: =>
		if @mousedown_node
			# update drag line
			@drag_line.attr('d', 'M' + @mousedown_node.dx + ',' + @mousedown_node.dy + 'L' + d3.event.offsetX + ',' + d3.event.offsetY)
			@restart()
		else if @mousedown_svg.x?
			@delta.x += d3.event.offsetX - @mousedown_svg.x
			@delta.y += d3.event.offsetY - @mousedown_svg.y
			@mousedown_svg.x = d3.event.offsetX
			@mousedown_svg.y = d3.event.offsetY
			@restart()


	svgMouseDown: =>
		@mousedown_svg =
			x: d3.event.offsetX
			y: d3.event.offsetY

		
	svgMouseUp: =>
		if @mousedown_node
			# hide drag line
			@drag_line
				.classed('hidden', true)
				.style('marker-end', '')

		# because :active only works in WebKit?
		@svg.classed('active', false)

		# clear mouse event vars
		@mousedown_svg = {}
		@resetMouseVars()

	svgMouseWheel: =>

		scaleVal = 0.04

		widthMid = window.innerWidth * scaleVal / 2
		heightMid = window.innerHeight * scaleVal / 2

		if d3.event.wheelDelta > 0
			@scale += scaleVal
			@delta.x -= widthMid
			@delta.y -= heightMid

		else if d3.event.wheelDelta < 0
			@scale -= scaleVal
			@delta.x += widthMid
			@delta.y += heightMid
		#d3.select('svg').selectAll('g').attr('transform', => "scale(#{@scale})").selectAll('g').attr('transform', => "scale(#{@scale})")
		@restart()

	initSvg: =>
		@svg = d3.select('body')
			.append('svg')
				#.call(d3.behavior.zoom())
		
		# define arrow markers for graph links
		@svg.append('svg:defs').append('svg:marker')
				.attr('id', 'end-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 30)
				.attr('markerWidth', 3)
				.attr('markerHeight', 3)
				.attr('orient', 'auto')
			.append('svg:path')
				.attr('d', 'M0,-5L10,0L0,5')
				.attr('fill', '#000')

		@svg.append('svg:defs').append('svg:marker')
				.attr('id', 'start-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', -20)
				.attr('markerWidth', 3)
				.attr('markerHeight', 3)
				.attr('orient', 'auto')
			.append('svg:path')
				.attr('d', 'M10,-5L0,0L10,5')
				.attr('fill', '#000')

		# line displayed when dragging new nodes
		@drag_line = @svg.append('svg:path')
			.attr('class', 'link dragline hidden')
			.attr('d', 'M0,0L0,0')


		# handles to link and node element groups
		@path = @svg.append('svg:g').selectAll('path')
		@label = @svg.append('svg:g').selectAll('textpath')
		@circle = @svg.append('svg:g').selectAll('g')


		@svg.on('dblclick'	, @svgDblclick)
			.on('mousemove'	, @svgMouseMove)
			.on('mouseup'	, @svgMouseUp)
			.on('mousedown'	, @svgMouseDown)
			.on('wheel.zoom', @svgMouseWheel)

	constructor: ->
		# mouse event vars
		@selected_node = null
		@selected_link = null
		@mousedown_link = null
		@mousedown_node = null
		@mouseup_node = null
		@mousedown_svg = {}
		@delta =
			x: 0
			y: 0

		@scale = 1
		@lastKeyDown = -1

		@graph = new Graph(@)

		@viewer = new Viewer(@)
		ko.applyBindings @viewer

		@initSvg()
		
		@force = d3.layout.force()
			.nodes(@graph.nodes)
			.links(@graph.links)
			.size([width, height])
			.linkDistance(150)
			.charge(-500)
			.on('tick', @tick)

		document.documentElement.style.overflow = 'hidden'  # firefox, chrome
		document.body.scroll = "no" # ie only

		d3.select(window).on('resize', @resize)
		@resize()
		
	resize: =>
		width = window.innerWidth
		height = window.innerHeight
		@svg.attr('height', height).attr("width", width)
		@force.size([width, height])


	resetMouseVars: =>
		@mousedown_node = null
		@mouseup_node = null
		@mousedown_link = null

# update force layout (called automatically each iteration)
	tick: =>
		# draw directed edges with proper padding from node centers

		for node in @graph.nodes

			node.dx = node.x * @scale
			node.dx = node.dx + @delta.x
			node.dy = node.y * @scale
			node.dy = node.dy + @delta.y

		@path.selectAll('path.link').attr 'd', (d) => 
			deltaX = (d.target.dx - d.source.dx)
			deltaY = (d.target.dy - d.source.dy)
			dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
			normX = deltaX / dist
			normY = deltaY / dist
			sourcePadding = 0#if d.left  then 17 else 12
			targetPadding = 0#if d.right then 17 else 12
			sourceX = (d.source.dx + (sourcePadding * normX))
			sourceY = (d.source.dy + (sourcePadding * normY))
			targetX = (d.target.dx - (targetPadding * normX))
			targetY = (d.target.dy - (targetPadding * normY))
			return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY


		@path.selectAll('path.forText').attr 'd', (d) => 
			deltaX = (d.target.dx - d.source.dx)
			deltaY = (d.target.dy - d.source.dy)
			dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
			normX = deltaX / dist
			normY = deltaY / dist
			sourcePadding = if d.left  then 17 else 12
			targetPadding = if d.right then 17 else 12
			sourceX = (d.source.dx + (sourcePadding * normX))
			sourceY = (d.source.dy + (sourcePadding * normY))
			targetX = (d.target.dx - (targetPadding * normX))
			targetY = (d.target.dy - (targetPadding * normY))
			if targetX < sourceX
				return 'M' + targetX + ',' + targetY + 'L' + sourceX + ',' + sourceY
			else
				return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY


		@circle.attr 'transform', (d) =>
			dx = (d.dx - d.width / 2) 
			dy = (d.dy - d.height / 2)

			return "translate(#{dx}, #{dy})"


# update graph (called when needed)
	restart: =>
		th = @
		# path (link) group
		@path = @path.data(@graph.links, (d) -> d._id)

		# update existing links
		@path.selectAll('path.link')
			.classed('selected', (d) -> return d == th.selected_link)
			.style('marker-start', (d) -> return if d.left then 'url(#start-arrow)' else '')
			.style('marker-end', (d) -> return if d.right then 'url(#end-arrow)' else '')

		@path.selectAll('text').each (d) ->
			$(@).children().text(d.text)


		# add new links
		p = @path.enter().append('svg:g')

		p.append('svg:path')
			.attr('id', (d) -> d._id)
			.attr('class', 'link')
			.classed('selected', (d) -> return d == th.selected_link)
			.style('marker-start', (d) -> return if d.left then 'url(#start-arrow)' else '')
			.style('marker-end', (d) -> return if d.right then 'url(#end-arrow)' else '')
			.on('mousedown', (d) ->
				return if(d3.event.ctrlKey)

				# select link
				th.mousedown_link = d
				if th.mousedown_link == th.selected_link
					th.selected_link = null
				else 
					th.selected_link = th.mousedown_link

				th.selected_node = null
				th.restart()
				th.viewer.load()
			)

		p.append('svg:path')
			.attr('class', 'forText')
			.attr('id', (d) -> "text_" + d._id)

		p.append("svg:text")
			.attr('dy', -5)
			.attr('text-anchor', 'middle')
		.append("svg:textPath")
			.attr('startOffset', "50%")
			.attr("stroke","black")
			.attr("xlink:href", (d) -> '#text_' + d._id)
			.text((d) -> d.text)


		# remove old links
		@path.exit().remove()



		# circle (node) group
		# NB: the function arg is crucial here! nodes are known by id, not by index!
		@circle = @circle.data(@graph.nodes, (d) -> return d._id)

		# update existing nodes (reflexive & selected visual states)
		@circle.selectAll('rect')
			.style('fill', (d) -> 
				return d.color if d.color?				
				if d == th.selected_node then d3.rgb(colors(d._id)).brighter().toString() else colors(d._id))
			.classed('reflexive', (d) ->  d.fixed)

		@circle.selectAll('text')
			.text((d) -> return d.text)

		g = @circle.enter().append('svg:g')
			.on('mouseover', (d) ->
				#return if(!th.mousedown_node || d == th.mousedown_node)
				# enlarge target node
				# d3.select(this).select('rect').attr('transform', 'scale(2.5)')
				# d3.select(this).select('text').append('svg:tspan')
				# 	.text("toto")
				#for x in d.attr
			)

		g.append('svg:rect')
			.attr('class', 'node')
			.style('fill', (d) -> 
				return d.color if d.color?
				if d == th.selected_node then d3.rgb(colors(d._id)).brighter().toString() else colors(d._id))
			.style('stroke', (d) ->
				return d.strokeColor if d.strokeColor?
				d3.rgb(colors(d._id)).darker().toString())
			.classed('reflexive', (d) -> return d.reflexive?)
			.on('mouseout', (d) ->
				#alsaasddreturn if(!th.mousedown_node || d == th.mousedown_node)
				# unenlarge target node
				d3.select(this).attr('transform', '')
			)
			.on('mousedown', (d) ->

				# select node
				th.mousedown_node = d
				th.selected_node = th.mousedown_node
				th.selected_link = null
				th.viewer.load()

				return if(d3.event.ctrlKey)
				# reposition drag line
				th.drag_line
					.style('marker-end', 'url(#end-arrow)')
					.classed('hidden', false)
					.attr('d', 'M' + th.mousedown_node.dx + ',' + th.mousedown_node.dy + 'L' + th.mousedown_node.dx + ',' + th.mousedown_node.dy)

				th.restart()
			)
			.on('mouseup', (d) ->
				return if !th.mousedown_node

				# needed by FF
				th.drag_line
					.classed('hidden', true)
					.style('marker-end', '')

				# check for drag-to-self
				th.mouseup_node = d
				if th.mouseup_node == th.mousedown_node
					th.resetMouseVars()
					return

				# unenlarge target node
				d3.select(this).attr('transform', '')

				# add link to graph (update if exists)
				# NB: links are strictly source < target; arrows separately specified by booleans
				source = -1
				target = -1
				direction = -1
				if th.mousedown_node._id < th.mouseup_node._id
					source = th.mousedown_node
					target = th.mouseup_node
					direction = 'right'
				else
					source = th.mouseup_node
					target = th.mousedown_node
					direction = 'left'
				

				



				# select new link
				th.graph.addLink source, target, direction
			)

		# show link label

		# show node IDs
		g.append('svg:text')
			.attr('x', 0)
			.attr('y', 4)
			.attr('class', 'id')
			.text((d) -> return d.text)


		@circle.selectAll('rect')
			.attr('width', (d) -> d.width = $(@).next().innerWidth() + 8)
			.attr('height', (d) -> d.height = $(@).next().innerHeight() + 8)
			.attr('rx', 4)
			.attr('ry', 4)

		@circle.selectAll('text')
			.attr('x', (d) -> $(@).innerWidth() / 2 + 4)
			.attr('y', (d) -> $(@).innerHeight() + 2)

		# remove old nodes
		@circle.exit().remove()

		# set the graph in motion if not drag
		if !@svg.classed 'ctrl'
			@force.start()
		else
			@tick()




	dragKeyDown: =>
		@circle.call(d3.behavior.drag()
			.on("dragstart", =>
				#@mousedown_node.x = 0
				@force.stop()
				#d3.event.x *= @scale
				#d3.event.y *= @scale
			)
			.on("drag", =>
				@mousedown_node.px += d3.event.dx / @scale
				@mousedown_node.py += d3.event.dy / @scale
				@mousedown_node.x += d3.event.dx / @scale
				@mousedown_node.y += d3.event.dy / @scale
				@tick()
			)
			.on("dragend", (d, i) =>
				sio.emit 'editNode', d
				@force.resume()
			)
		)
		@svg.classed('ctrl', true)
		
	dragKeyUp: =>
		@circle
			.on('mousedown.drag', null)
			.on('touchstart.drag', null)
		@svg.classed('ctrl', false)


	delCurrentSelection: =>
		if @selected_node
			@graph.delNode @selected_node
			@selected_node = null
		else if @selected_link
			@graph.delLink @selected_link
			@selected_link = null
		@restart()

	nodeFixer: =>
		return if !@selected_node? || $('#myModal').attr("aria-hidden") == "false"
		@selected_node.fixed = !@selected_node.fixed
		sio.emit 'editNode', @selected_node

# app starts here
window.app = app = new App()



		


		# when 66 # B
		# 	if @selected_link
		# 		# set link direction to both left and right
		# 		@selected_link.left = true
		# 		@selected_link.right = true
		# 		sio.emit 'editLink', @selected_link
		# 	@restart()
		# when 76 # L
		# 	if @selected_link
		# 		# set link direction to left only
		# 		@selected_link.left = true
		# 		@selected_link.right = false
		# 		sio.emit 'editLink', @selected_link
		# 	@restart()
		# when 82 # R
		# 	if @selected_node
		# 		# toggle node reflexivity
		# 		@selected_node.reflexive = !@selected_node.reflexive;
		# 		sio.emit 'editNode', @selected_node
		# 	else if @selected_link
		# 		# set link direction to right only
		# 		@selected_link.left = false
		# 		@selected_link.right = true
		# 		sio.emit 'editLink', @selected_link
		# 	@restart()

		# when 13
		# 	@viewer.modal()


connected = false

sio.on 'connect', ->
	console.info("successfully established a working connection \\o/")
	href = window.location.href
	sio.emit 'graphInit', href.slice href.lastIndexOf('/') + 1 if !connected

sio.on 'graphInit', (graph) ->
	connected = true

	for node in graph.nodes
		app.graph.nodes.push new Node node
	for link in graph.links
		len = app.graph.nodes.length
		i = 0
		while i < len && app.graph.nodes[i]._id != link.target
			i++
		if i < len
			link.target = app.graph.nodes[i]
			i = 0
			while i < len && app.graph.nodes[i]._id != link.source
				i++
			if i < len
				link.source = app.graph.nodes[i]
				app.graph.links.push link
			else
				sio.emit 'rmLink', link._id
		else
			sio.emit 'rmLink', link._id

	app.restart()

sio.on 'addNode', (node) ->
	app.graph.nodes.push node
	app.restart()

sio.on 'editNode', (node) ->
	len = app.graph.nodes.length
	i = 0
	while i < len && app.graph.nodes[i]._id != node._id
		i++
	app.graph.nodes[i].text = node.text
	app.graph.nodes[i].reflexive = node.reflexive
	app.graph.nodes[i].fixed = node.fixed
	app.graph.nodes[i].x = node.x
	app.graph.nodes[i].y = node.y

	app.restart()

sio.on 'rmNode', (id) ->
	len = app.graph.nodes.length
	i = 0
	while i < len && app.graph.nodes[i]._id != id
		i++
	app.graph.nodes.splice i, 1
	toSplice = app.graph.links.filter((l) ->
		return (l.source._id == id || l.target._id == id);
	)
	toSplice.map((l) => 
		app.graph.links.splice(app.graph.links.indexOf(l), 1)
	)
	app.restart()

sio.on 'addLink', (link) ->
	len = app.graph.nodes.length
	i = 0
	while i < len && app.graph.nodes[i]._id != link.target
		i++
	link.target = app.graph.nodes[i]
	i = 0
	while i < len && app.graph.nodes[i]._id != link.source
		i++
	link.source = app.graph.nodes[i]

	app.graph.links.push link
	app.restart()

sio.on 'editLink', (link) ->
	len = app.graph.links.length
	i = 0
	while i < len && app.graph.links[i]._id != link._id
		i++
	app.link[i] = link
	app.restart()

sio.on 'rmLink', (id) ->
	len = app.graph.links.length
	i = 0
	while i < len && app.graph.links[i]._id != id
		i++
	app.graph.links.splice i, 1
	app.restart()


Mousetrap
	.bind(['f', 'enter'], app.viewer.modal)
	.bind('del', app.delCurrentSelection)
	.bind('s', app.nodeFixer)
	.bind('ctrl', app.dragKeyDown, 'keydown')
	.bind('ctrl', app.dragKeyUp, 'keyup')
	.bind('x o', app.viewer.modal)
	.bind('n', app.graph.addNode)
