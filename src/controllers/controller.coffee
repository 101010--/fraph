mongoose = require 'mongoose'

db = mongoose.connect 'mongodb://127.0.0.1/graph'



class CoC
	constructor: ->
		@controllers =
			user: require './user'
			graph: require './graph'	

		for key, con of @controllers
			this[key] = con

	send: (controller, methode, req, cb) ->
		if controllers[controller]?[methode]?
			controllers[controller][methode] req, cb
		else
			cb 'GTFO'

module.exports = exports = new CoC()