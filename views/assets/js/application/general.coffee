width = window.innerWidth
height = window.innerHeight
#colors = d3.scale.category10()

# forceInit = ->
# 	d3.layout.force()
# 		.nodes([{x: 42, y: 42}])
# 		.links([])
# 		.size([width, height])

# dragstart = (d) ->
# 	d3.select(@).classed "fixed", d.fixed = true

# class App
# 	constructor: ->
# 		@force = forceInit()

# 		@nodes = @force.nodes()
# 		@links = @force.links()

# 		@svg = d3.select("body").append("svg")
# 			.attr("width", width)
# 			.attr("height", height)
# 			.on("dblclick", @addNode)

# 		@vlink = @svg.selectAll("line")
# 		@vnode = @svg.selectAll("circle")

# 		@selectedNode = {}


# 		@force.on "tick", =>
# 			@vlink.attr("x1", (d) -> d.source.x)
# 				.attr("y1", (d) -> d.source.y)
# 				.attr("x2", (d) -> d.target.x)
# 				.attr("y2", (d) -> d.target.y)

# 			@vnode.attr "transform", (d) -> "translate(#{d.x}, #{d.y})"
# 			@svg.selectAll("circle").attr "transform", (d) -> "translate(#{d.x}, #{d.y})"
# 			# @vnode.attr("cx", (d) -> d.x)
# 			# 	.attr("cy", (d) -> d.y)

# 		@restart()


# 	drag: =>
# 		@force.drag().on "dragstart", @dragstart

# 	selectNode: (d) =>
# 		console.log d
# 		d3.event.cancelBubble = true
# 		if d == @selectedNode
# 			@selectedNode = undefined
# 		else
# 			@selectedNode = d
# 		@restart()


# 	restart: =>
# 		@vlink = @vlink.data(@links)
# 		@vlink.enter().append("line")

# 		@vnode = @vnode.data(@nodes)

# 		@vnode.enter().append("circle")
# 		    .attr("r", 5)
# 			.style('fill', (d) => 
# 				console.log "toto : ", d, @selectedNode
# 				if d == @selectedNode then d3.rgb(colors(2)).brighter().toString() else colors(2))
# 			.style('stroke', (d) -> d3.rgb(colors(d.index)).darker().toString())
# 			.on "mousedown", @selectNode
# 		    #.call @drag
				
# 		@vnode.enter().append("text")
# 			#.attr("x", 12)
# 			.attr("y", -15)
# 			.attr("dy", ".35em")
# 			.text("toto")
		

# 		@force.start()

# 	addNode: () ->
# 		point = d3.mouse(@)
# 		n =
# 			x: point[0]
# 			y: point[1]
# 		window.app.nodes.push n

# 		window.app.restart()

# window.app = new App()



sio = io.connect()

sio.socket.on 'error', (reason) ->
  console.error 'Unable to connect Socket.IO', reason





colors = d3.scale.category10()
class App
	constructor: ->

		@lastKeyDown = -1


		@svg = d3.select('body')
			.append('svg')
			.attr('width', width)
			.attr('height', height)

		@nodes = []
		@links = []

		@force = d3.layout.force()
			.nodes(@nodes)
			.links(@links)
			.size([width, height])
			.linkDistance(50)
			.charge(-200)
			.on('tick', @tick)

		# define arrow markers for graph links
		@svg.append('svg:defs').append('svg:marker')
				.attr('id', 'end-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 6)
				.attr('markerWidth', 3)
				.attr('markerHeight', 3)
				.attr('orient', 'auto')
			.append('svg:path')
				.attr('d', 'M0,-5L10,0L0,5')
				.attr('fill', '#000')

		@svg.append('svg:defs').append('svg:marker')
				.attr('id', 'start-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 4)
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
		@circle = @svg.append('svg:g').selectAll('g')

		# mouse event vars
		@selected_node = null
		@selected_link = null
		@mousedown_link = null
		@mousedown_node = null
		@mouseup_node = null

		th = @
		d3.select(window)
			.on('keydown', @keydown)
			.on('keyup', @keyup)

		@svg.on('dblclick', ->
			# because :active only works in WebKit?
			th.svg.classed('active', true)

			return if d3.event.ctrlKey || th.mousedown_node || th.mousedown_link

			# insert new node at point
			point = d3.mouse(this)
			node = {reflexive: false}
			node.x = point[0]
			node.y = point[1]
			sio.emit 'addNode', node, (res) ->
				return if !res?
				node.id = res
				th.nodes.push node
				th.selected_link = undefined
				th.selected_node = node
				$('#texter').focus()
				th.restart()
			)
			.on('mousemove', ->
				return if !th.mousedown_node

				# update drag line
				th.drag_line.attr('d', 'M' + th.mousedown_node.x + ',' + th.mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

				th.restart()
			)
			.on('mouseup', =>
				if @mousedown_node
					# hide drag line
					@drag_line
						.classed('hidden', true)
						.style('marker-end', '')

				# because :active only works in WebKit?
				@svg.classed('active', false)

				# clear mouse event vars
				@resetMouseVars()
		)

	resetMouseVars: =>
		@mousedown_node = null
		@mouseup_node = null
		@mousedown_link = null

# update force layout (called automatically each iteration)
	tick: =>
		# draw directed edges with proper padding from node centers
		@path.attr 'd', (d) -> 
			deltaX = d.target.x - d.source.x
			deltaY = d.target.y - d.source.y
			dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
			normX = deltaX / dist
			normY = deltaY / dist
			sourcePadding = if d.left  then 17 else 12
			targetPadding = if d.right then 17 else 12
			sourceX = d.source.x + (sourcePadding * normX)
			sourceY = d.source.y + (sourcePadding * normY)
			targetX = d.target.x - (targetPadding * normX)
			targetY = d.target.y - (targetPadding * normY)
			return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY

		@circle.attr 'transform', (d) ->
			return 'translate(' + d.x + ',' + d.y + ')';


# update graph (called when needed)
	restart: =>
		th = @
		# path (link) group
		@path = @path.data(@links)

		# update existing links
		@path.classed('selected', (d) -> return d == th.selected_link)
			.style('marker-start', (d) -> return if d.left then 'url(#start-arrow)' else '')
			.style('marker-end', (d) -> return if d.right then 'url(#end-arrow)' else '')


		# add new links
		@path.enter().append('svg:path')
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
			)

		# remove old links
		@path.exit().remove()


		# circle (node) group
		# NB: the function arg is crucial here! nodes are known by id, not by index!
		@circle = @circle.data(@nodes, (d) -> return d.id)

		# update existing nodes (reflexive & selected visual states)
		@circle.selectAll('circle')
			.style('fill', (d) -> return if d == th.selected_node then d3.rgb(colors(d.id)).brighter().toString() else colors(d.id))
			.classed('reflexive', (d) -> return d.reflexive)
		@circle.selectAll('text').text((d) -> return d.text)


		# add new nodes
		g = @circle.enter().append('svg:g')

		g.append('svg:circle')
			.attr('class', 'node')
			.attr('r', 12)
			.style('fill', (d) -> return if d == th.selected_node then d3.rgb(colors(d.id)).brighter().toString() else colors(d.id))
			.style('stroke', (d) -> return d3.rgb(colors(d.id)).darker().toString())
			.classed('reflexive', (d) -> return d.reflexive)
			.on('mouseover', (d) ->
				return if(!th.mousedown_node || d == th.mousedown_node)
				# enlarge target node
				d3.select(this).attr('transform', 'scale(1.1)')
			)
			.on('mouseout', (d) ->
				return if(!th.mousedown_node || d == th.mousedown_node)
				# unenlarge target node
				d3.select(this).attr('transform', '')
			)
			.on('mousedown', (d) ->
				return if(d3.event.ctrlKey)

				# select node
				th.mousedown_node = d
				if th.mousedown_node == th.selected_node
					th.selected_node = null
				else
					th.selected_node = th.mousedown_node
				th.selected_link = null

				# reposition drag line
				th.drag_line
					.style('marker-end', 'url(#end-arrow)')
					.classed('hidden', false)
					.attr('d', 'M' + th.mousedown_node.x + ',' + th.mousedown_node.y + 'L' + th.mousedown_node.x + ',' + th.mousedown_node.y)

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
				if th.mousedown_node.id < th.mouseup_node.id
					source = th.mousedown_node
					target = th.mouseup_node
					direction = 'right'
				else
					source = th.mouseup_node
					target = th.mousedown_node
					direction = 'left'
				
				link = -1
				link = th.links.filter((l) ->
					return (l.source == source && l.target == target);
				)[0]

				if link
					link[direction] = true
					sio.emit 'editLink', link
				else
					link = {source: source, target: target, left: false, right: false}
					link[direction] = true
					sio.emit 'addLink', link, (res) ->
						link.id = res
						th.links.push link
						th.restart()

				# select new link
				th.selected_link = link
				th.selected_node = null
				th.restart()
			)

		# show node IDs
		g.append('svg:text')
			.attr('x', 0)
			.attr('y', 4)
			.attr('class', 'id')
			.text((d) -> return d.text)

		# remove old nodes
		@circle.exit().remove()

		# set the graph in motion
		@force.start()

	spliceLinksForNode: (node) =>
		toSplice = @links.filter((l) ->
			return (l.source == node || l.target == node);
		)
		toSplice.map((l) => 
			sio.emit 'rmLink', l._id
			@links.splice(@links.indexOf(l), 1)
		)


	keydown: =>
		if $('#texter:focus')[0]?
			if d3.event.keyCode == 13
				@changeText $('#texter:focus').val()
				$('#texter:focus').val('').blur()
			else if d3.event.keyCode == 27
				console.log d3.event.keyCode
				$('#texter').blur()
		else
			return if @lastKeyDown != -1
			@lastKeyDown = d3.event.keyCode

			# ctrl
			if d3.event.keyCode == 17
				@circle.call(@force.drag)
				@svg.classed('ctrl', true)
			console.log d3.event.keyCode
			return if !@selected_node && !@selected_link
			switch d3.event.keyCode
				when 8, 46  # backspace, delete
					if @selected_node
						@nodes.splice(@nodes.indexOf(@selected_node), 1)
						@spliceLinksForNode(@selected_node)
						sio.emit 'rmNode', @selected_node.id
					else if @selected_link
						sio.emit 'rmLink', @selected_link._id
						@links.splice(@links.indexOf(@selected_link), 1)
					@selected_link = null

					@selected_node = null
					@restart()
				when 66 # B
					if @selected_link
						# set link direction to both left and right
						@selected_link.left = true
						@selected_link.right = true
						sio.emit 'editLink', @selected_link
					@restart()
				when 76 # L
					if @selected_link
						# set link direction to left only
						@selected_link.left = true
						@selected_link.right = false
						sio.emit 'editLink', @selected_link
					@restart()
				when 82 # R
					if @selected_node
						# toggle node reflexivity
						@selected_node.reflexive = !@selected_node.reflexive;
						sio.emit 'editNode', @selected_node
					else if @selected_link
						# set link direction to right only
						@selected_link.left = false
						@selected_link.right = true
						sio.emit 'editLink', @selected_link
					@restart()
				when 13
					$('#texter').focus()


	keyup: =>
		@lastKeyDown = -1

		# ctrl
		if d3.event.keyCode == 17
			@circle
				.on('mousedown.drag', null)
				.on('touchstart.drag', null)
			@svg.classed('ctrl', false)

	changeText: (text = '')=>
		return if !@selected_node
		@selected_node.text = text
		@restart()
		sio.emit 'editNode', @selected_node


# app starts here
window.app = app = new App()

connected = false

sio.on 'connect', ->
	console.info("successfully established a working connection \\o/")
	href = window.location.href
	sio.emit 'graphInit', href.slice href.lastIndexOf('/') + 1 if !connected

sio.on 'graphInit', (graph) ->
	connected = true

	for node in graph.nodes
		node.id = node._id
		app.nodes.push node
	for link in graph.links
		len = app.nodes.length
		i = 0
		while i < len && app.nodes[i].id != link.target
			i++
		if i < len
			link.target = app.nodes[i]
			i = 0
			while i < len && app.nodes[i].id != link.source
				i++
			if i < len
				link.source = app.nodes[i]
				app.links.push link
			else
				sio.emit 'rmLink', link._id
		else
			sio.emit 'rmLink', link._id

	app.restart()

sio.on 'addNode', (node) ->
	node.id = node._id
	app.nodes.push node
	app.restart()

sio.on 'editNode', (node) ->
	len = app.nodes.length
	i = 0
	while i < len && app.nodes[i].id != node._id
		i++
	app.nodes[i].text = node.text
	app.nodes[i].reflexive = node.reflexive
	app.restart()

sio.on 'rmNode', (id) ->
	len = app.nodes.length
	i = 0
	while i < len && app.nodes[i].id != id
		i++
	app.nodes.splice i, 1
	toSplice = app.links.filter((l) ->
		return (l.source.id == id || l.target.id == id);
	)
	toSplice.map((l) => 
		app.links.splice(app.links.indexOf(l), 1)
	)
	app.restart()

sio.on 'addLink', (link) ->
	len = app.nodes.length
	i = 0
	while i < len && app.nodes[i].id != link.target
		i++
	link.target = app.nodes[i]
	i = 0
	while i < len && app.nodes[i].id != link.source
		i++
	link.source = app.nodes[i]

	app.links.push link
	app.restart()

sio.on 'editLink', (link) ->
	len = app.links.length
	i = 0
	while i < len && app.links[i]._id != link.id
		i++
	app.link[i] = link
	app.restart()

sio.on 'rmLink', (id) ->
	len = app.links.length
	i = 0
	while i < len && app.links[i]._id != id
		i++
	app.links.splice i, 1
	app.restart()
