module.exports = (grunt) ->
	grunt.initConfig
		coffee:
			options:
				join: true
				sourceMap: true
			index:
				files:
					'assets/js/application/app.js' : ['assets/js/application/elements/**/*.coffee', 'assets/js/application/general.coffee']
			app:
				expand: true
				cwd: 'src/'
				src: ['**/*.coffee']
				dest: 'app/'
				ext: '.js'

		uglify:
			option:
				mangle: false
			index:
				files:
					'public/app.min.js' : ['assets/js/application/app.js', 'assets/js/application/**/*.js']

		jade:
			index:
				files:
					'views/index.html' : 'views/index.jade'
					'views/login.html' : 'views/login.jade'

		less:
			index:
				files:
					'assets/css/application/app.css' : 'assets/css/application/**/*.less'

		concat:
			indexcss:
				files:
					'public/app.min.css' : 'assets/css/application/**/*.css'
			indexjs:
				files:
					'public/app.min.js' : ['assets/js/application/vendor/*.js', 'assets/js/application/app.js']
		express:
			dev:
				options:
					script: 'server.js'
					fallback: ->
						grunt.task.run 'express:dev'


		watch:
			options:
					interrupt: true
					nospawn: true
			express:
				files: ['src/*.coffee', 'src/**/*.coffee']
				tasks: ['coffee:app', 'express:dev']
			coffee_index:
				files: ['assets/js/application/general.coffee', 'assets/js/application/**/*.coffee']
				tasks: ['coffee:index', 'concat:indexjs']
			jade_index:
				files: ['views/index.jade', 'views/**/*.jade']
				tasks: 'jade:index'
			less_index:
				files: 'assets/css/application/**/*.less'
				tasks: ['less:index', 'concat:indexcss']

		copy:
			main:
				files: [
					{src: 'server.js', dest: '../toDeploy/'}
					{src: 'package.json', dest: '../toDeploy/'}
					{src: 'public/**', dest: '../toDeploy/'}
					{src: 'views/index.html', dest: '../toDeploy/views/index.html'}
					{src: 'app/*.js', dest: '../toDeploy/'}
					{src: 'app/controllers/*.js', dest: '../toDeploy/'}
				]
				options:
					mode: true


		shell:
			cleanToDeploy :
				command : 'rm -rf ../toDeploy'


			publish :
				command : 'scp ../toDep.tar prod@serialskiller.net:~'
				options:
					stdout: true

		compress:
			main:
				options:
					archive: "../toDep.tar"
					level: 5
				files: [
					src: ['../toDeploy/**'], dest: 'app/'
				]




	grunt.registerTask 'default', ['coffee', 'jade', 'less', 'concat', 'express', 'watch']
	grunt.registerTask 'dev', ['express', 'watch']
	grunt.registerTask 'ccop', ['copy', "compress"]
	grunt.registerTask 'copy', ['copy']
	grunt.registerTask 'test', ['watch:coffee_test']

	grunt.loadNpmTasks 'grunt-contrib-coffee'
	grunt.loadNpmTasks 'grunt-contrib-jade'
	grunt.loadNpmTasks 'grunt-contrib-less'
	grunt.loadNpmTasks 'grunt-contrib-watch'
	grunt.loadNpmTasks 'grunt-express-server'
	grunt.loadNpmTasks 'grunt-contrib-uglify'
	grunt.loadNpmTasks 'grunt-contrib-concat'
	grunt.loadNpmTasks 'grunt-contrib-compress'
	grunt.loadNpmTasks 'grunt-contrib-copy'
	grunt.loadNpmTasks 'grunt-shell'
