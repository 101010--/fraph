mongoose = require 'mongoose'
async = require 'async'


OI = mongoose.Schema.Types.ObjectId

graphSchema = new mongoose.Schema
	room: String

	nodes: [
		reflexive: Boolean
		text: String
		x: Number
		y: Number
		fixed: Boolean
		attr: [
			name: String
			val: String
		]
	]

	links: [
		left: Boolean
		right: Boolean
		source: String
		target: String
		text: String
		attr: [
			name: String
			val: String
		]
	]


G = mongoose.model 'Graph', graphSchema

a = 
	b: () ->
		
 
class Graph
	constructor: ->

	createOrGet: (room, cb) ->
		return cb 'noRoom' if !room? or room == ''
		console.log "/graph/createOrGet :"
		G.findOne {room: room}, (err, res) ->
			return cb err if err?
			if res?
				console.log 'found : ', res
				cb undefined, res
			else
				graph = new G()
				graph.room = room
				graph.save (err, res) ->
					console.log 'created'
					cb err, res

	addNode: (req, cb) ->
		return cb 'noRoom' if !req.room? || req.room == ''
		async.waterfall [
			(fn) ->
				G.findOne {room: req.room}, (err, res) ->
					return fn err || 'dafukRoom' if err? || !res?
					fn undefined, res
			,(graph, fn) ->
				graph.nodes.push {x: req.x, y: req.y}
				graph.save fn
		], (err, res) ->
			if err?
				cb err
			else
				console.log 'added', res.nodes[res.nodes.length - 1]
				cb undefined, res.nodes[res.nodes.length - 1]

	editNode: (req, cb) ->
		return cb 'noRoom' if !req.room? || req.room == ''
		return cb 'noId' if !req._id? || req._id == ''
		i = 0
		async.waterfall [
			(fn) ->
				G.findOne {room: req.room}, (err, res) ->
					return fn err || 'dafukRoom' if err? || !res?
					fn undefined, res
			,(graph, fn) ->
				len = graph.nodes.length
				while i < len && graph.nodes[i]._id.toString() != req._id
					i++
				if i < len
					console.log req
					n = graph.nodes[i]
					n.text = req.text
					n.reflexive = req.reflexive
					n.x = req.x
					n.y = req.y
					n.fixed = req.fixed || req.fixed == 1
					n.attr = req.attr


					graph.save (err, res) ->
						fn err, res
				else
					fn 'oops'

				#graph.save fn
		], (err, res) ->
			if err?
				cb err
			else
				cb undefined, res.nodes[i]


	rmNode: (req, cb) ->
		return cb 'noRoom' if !req.room? || req.room == ''
		return cb 'noId' if !req._id? || req._id == ''
		G.findOneAndUpdate {room: req.room}, {$pull: {nodes: {_id: req._id}}}, (err, res) ->
			return fn err || 'dafukRoom' if err? || !res?
			cb undefined, req._id

	addLink: (req, cb) ->
		return cb 'noRoom' if !req.room? || req.room == ''
		async.waterfall [
			(fn) ->
				G.findOne {room: req.room}, (err, res) ->
					return fn err || 'dafukRoom' if err? || !res?
					fn undefined, res
			,(graph, fn) ->
				graph.links.push {left: req.left, right: req.right, source: req.source._id, target: req.target._id}
				graph.save fn
		], (err, res) ->
			if err?
				cb err
			else
				console.log 'addLink', res.links[res.links.length - 1]
				cb undefined, res.links[res.links.length - 1]

	editLink: (req, cb) ->
		console.log "editLink", req
		return cb 'noRoom' if !req.room? || req.room == ''
		return cb 'noId' if !req._id? || req._id == ''
		async.waterfall [
			(fn) ->
				G.findOne {room: req.room}, (err, res) ->
					return fn err || 'dafukRoom' if err? || !res?
					fn undefined, res
			,(graph, fn) ->
				len = graph.links.length
				i = 0
				while i < len && graph.links[i]._id.toString() != req._id
					i++
				if i < len
					graph.links[i].left = req.left
					graph.links[i].right = req.right
					graph.links[i].text = req.text
					graph.links[i].attr = req.attr
					graph.save fn
				else
					fn 'oops'

				#graph.save fn
		], (err, res) ->
			if err?
				cb err
			else
				cb undefined, res.links[res.links.length - 1]

	rmLink: (req, cb) ->
		console.log req
		return cb 'noRoom' if !req.room? || req.room == ''
		return cb 'noId' if !req._id? || req._id == ''
		G.findOneAndUpdate {room: req.room}, {$pull: {links: {_id: req._id}}}, (err, res) ->
			return fn err || 'dafukRoom' if err? || !res?
			cb undefined, req._id










module.exports = exports = new Graph()