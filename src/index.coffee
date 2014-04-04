express = require 'express'
stylus = require 'stylus'
assets = require 'connect-assets'
d3 = require 'd3'
CoC = require './controllers/controller'

#### Basic application initialization
# Create app instance.
app = express()
server = require('http').createServer(app)
io = require('socket.io').listen(server)

# Define Port
server.port = process.env.PORT or process.env.VMC_APP_PORT or 3000


# Config module exports has `setEnvironment` function that sets app settings depending on environment.

#### View initialization 
# Add Connect Assets.
app.use assets()
# Set the public folder as static assets.
app.use express.static(process.cwd() + '/public')
# Express Session
store = new express.session.MemoryStore
app.use express.cookieParser()
app.use express.session(
  secret: 'shhh'
  store: store
) 

# Set View Engine.
app.set 'view engine', 'jade'

# [Body parser middleware](http://www.senchalabs.org/connect/middleware-bodyParser.html) parses JSON or XML bodies into `req.body` object
app.use express.bodyParser()
app.use express.cookieParser("shhh")

requireLongin = (req, res, next) ->
	if req.session.username?
		next()
	else
		res.redirect '/login'

app.get '/*', (req, res) ->
	res.sendfile 'views/index.html'

app.get '/login', (req, res) ->
	res.sendfile 'views/login.html'


io.configure ->
	io.set 'authorization', (handshakeData, cb) ->
		if handshakeData.address.address == '79.89.104.82'
			cb null, true
		else
			cb null, true

io.sockets.on 'connection', (socket) ->
	room = ''
	socket.on 'graphInit', (data, cb) ->
		room = data
		socket.join(data)
		
		CoC.graph.createOrGet data, (err, graph) ->
			socket.emit 'graphInit', graph || err
	
	socket.on 'addNode', (data, cb) ->
		data.room = room
		CoC.graph.addNode data, (err, res) ->
			if err
				cb()
			else
				cb res._id
				socket.broadcast.to(room).emit('addNode', res)

	socket.on 'addLink', (data, cb) ->
		data.room = room
		CoC.graph.addLink data, (err, res) ->
			console.log 'addLink : ', err, res
			if err
				cb()
			else
				cb res._id
				socket.broadcast.to(room).emit('addLink', res)

	socket.on 'editNode', (data, cb) ->
		data.room = room
		CoC.graph.editNode data, (err, res) ->
			console.log err, res
			socket.broadcast.to(room).emit('editNode', res)

	socket.on 'editLink', (data, cb) ->
		data.room = room
		CoC.graph.editLink data, (err, res) ->
			console.log err, res
			socket.broadcast.to(room).emit('editLink', res)

	socket.on 'rmNode', (data, cb) ->
		data = {id: data, room: room}
		CoC.graph.rmNode data, (err, res) ->
			console.log 'rmNode', err, res
			socket.broadcast.to(room).emit('rmNode', res)

	socket.on 'rmLink', (data, cb) ->
		console.log "rmLink", data
		data = {_id: data, room: room}
		CoC.graph.rmLink data, (err, res) ->
			console.log 'rmLink', err, res
			socket.broadcast.to(room).emit('rmLink', res)

#### Finalization
# Initialize routes

# Export application object
module.exports = server

