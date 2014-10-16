width = window.innerWidth
height = window.innerHeight - 4
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

#knockout for #viewer
class Node
	constructor: (@app) ->
		@titre = ko.observable ''
		@attr = ko.observableArray []
		@newAttr = ko.observable ''

	Attr: (name, val, del = false) =>
		if typeof(name) == "string"
			if val?
				@attr.push
					name: name
					val: ko.observable(val)
			else
				at = ko.toJS @attr
				console.log at
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

				if ! exist
					@attr.push
						name: x.name
						val: ko.observable(x.val || '')	


	modal: =>
		if $('#myModal').attr("aria-hidden") == "true"		
			sel = @app.selected_node || @app.selected_link
			if sel?
				$('#myModal').modal 'toggle'
				@titre sel.text || ''
				@attr []
				@Attr sel.attr if sel.attr?
				$('#myModal .form-control').eq(0).focus()

		else
			$('input').blur()
			@modOk()

	modOk: =>
			sel = @app.selected_node || @app.selected_link
			return if !sel
			sel.text = @titre()
			console.log sel
			if @newAttr() != ''
				@Attr @newAttr(), ''
				@newAttr ''
			sel.attr = ko.toJS(@attr())
			@app.restart()
			if @app.selected_node?
				sio.emit 'editNode', sel
			if @app.selected_link?
				sio.emit 'editLink', sel

	modRm: (th) =>
		console.log th
		# BADBADBAD
		@Attr th.name, undefined, true
		@app.selected_node.attr = ko.toJS(@attr()[1..])




 

colors = d3.scale.category10()

class App
	svgDblclick: =>
		# because :active only works in WebKit?
		@svg.classed('active', true)

		return if d3.event.ctrlKey || @mousedown_node || @mousedown_link

		# insert new node at point
		node = {reflexive: false}
		node.x = d3.event.offsetX
		node.y = d3.event.offsetY
		sio.emit 'addNode', node, (res) =>
			return if !res?
			node.id = res
			@nodes.push node
			@selected_link = undefined
			@selected_node = node
			$('#texter').focus()
			@restart()

	svgMouseMove: =>
		console.log "MM"
		if @mousedown_node
			# update drag line
			@drag_line.attr('d', 'M' + @mousedown_node.dx + ',' + @mousedown_node.dy + 'L' + d3.event.offsetX + ',' + d3.event.offsetY)
			@restart()
		else if @mousedown_svg.x?
			@delta.x += d3.event.offsetX - @mousedown_svg.x
			@delta.y += d3.event.offsetY - @mousedown_svg.y
			console.log "toto"
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
		if d3.event.wheelDelta > 0
			@scale += 0.025
		else if d3.event.wheelDelta < 0
			@scale -= 0.025
		#d3.select('svg').selectAll('g').attr('transform', => "scale(#{@scale})").selectAll('g').attr('transform', => "scale(#{@scale})")
		@restart()
		console.log  d3.event

	initSvg: =>
		@svg = d3.select('body')
			.append('svg')
				.attr('width', width)
				.attr('height', height)
				#.call(d3.behavior.zoom())
		
		# define arrow markers for graph links
		@svg.append('svg:defs').append('svg:marker')
				.attr('id', 'end-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 15)
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

		console.log @path, @circle

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

		@nodes = []
		@links = []

		@initSvg()
		
		@force = d3.layout.force()
			.nodes(@nodes)
			.links(@links)
			.size([width, height])
			.linkDistance(150)
			.charge(-500)
			.on('tick', @tick)
		
		d3.select(window)
			.on('keydown', @keydown)
			.on('keyup', @keyup)


		# modal validation









	resetMouseVars: =>
		@mousedown_node = null
		@mouseup_node = null
		@mousedown_link = null

# update force layout (called automatically each iteration)
	tick: =>
		# draw directed edges with proper padding from node centers

		for node in @nodes

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
		@path = @path.data(@links, (d) -> d._id)

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
			)

		p.append('svg:path')
			.attr('class', 'forText')
			.attr('id', (d) -> "text_" + d._id)

		texPa = p.append("svg:text")
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
		@circle = @circle.data(@nodes, (d) -> return d.id)

		# update existing nodes (reflexive & selected visual states)
		@circle.selectAll('rect')
			.style('fill', (d) -> return if d == th.selected_node then d3.rgb(colors(d.id)).brighter().toString() else colors(d.id))
			.classed('reflexive', (d) ->  d.fixed)

		@circle.selectAll('text')
			.text((d) -> return d.text)


		# add new nodes
		g = @circle.enter().append('svg:g')

		g.append('svg:rect')
			.attr('class', 'node')
			.style('fill', (d) -> return if d == th.selected_node then d3.rgb(colors(d.id)).brighter().toString() else colors(d.id))
			.style('stroke', (d) -> return d3.rgb(colors(d.id)).darker().toString())
			.classed('reflexive', (d) -> return d.reflexive?)
			.on('mouseover', (d) ->
				#return if(!th.mousedown_node || d == th.mousedown_node)
				# enlarge target node
				d3.select(this).attr('transform', 'scale(1.5)')
				console.log d3.select(this)
			)
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
				@circle.call(d3.behavior.drag()
					.on("dragstart", =>
						#@mousedown_node.x = 0
						@force.stop()
						#d3.event.x *= @scale
						#d3.event.y *= @scale
					)
					.on("drag", =>
						console.log "d", d3.event
						@mousedown_node.px += d3.event.dx / @scale
						@mousedown_node.py += d3.event.dy / @scale
						@mousedown_node.x += d3.event.dx / @scale
						@mousedown_node.y += d3.event.dy / @scale
						@tick()
					)
					.on("dragend", (d, i) =>
						console.log "dragend", d, i
						sio.emit 'editNode', d
						@force.resume()
					)
				)
				@svg.classed('ctrl', true)
			console.log d3.event.keyCode
			return if !@selected_node && !@selected_link
			switch d3.event.keyCode
				when 8, 46  # backspace, delete
					return if $('#myModal').attr("aria-hidden") == "false"
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
				when 83 # S
					return if !@selected_node? || $('#myModal').attr("aria-hidden") == "false"
					@selected_node.fixed = !@selected_node.fixed
					sio.emit 'editNode', @selected_node
				when 13
					n.modal()



	keyup: =>
		@lastKeyDown = -1

		# ctrl
		if d3.event.keyCode == 17
			@circle
				.on('mousedown.drag', null)
				.on('touchstart.drag', null)
			@svg.classed('ctrl', false)






# app starts here
window.app = app = new App()
#ko controller
window.n = n = new Node(app)
ko.applyBindings n

connected = false

sio.on 'connect', ->
	console.info("successfully established a working connection \\o/")
	href = window.location.href
	sio.emit 'graphInit', href.slice href.lastIndexOf('/') + 1 if !connected

sio.on 'graphInit', (graph) ->
	console.log graph
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
	console.log node
	app.nodes[i].text = node.text
	app.nodes[i].reflexive = node.reflexive
	app.nodes[i].fixed = node.fixed
	app.nodes[i].x = node.x
	app.nodes[i].y = node.y

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
