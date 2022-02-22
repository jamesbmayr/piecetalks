/*** modules ***/
	if (!HTTP) { const HTTP = require("http")}
	if (!FS)   { const FS   = require("fs")}
	module.exports = {}

/*** environment ***/
	const ENVIRONMENT = getEnvironment()

/*** logs ***/
	/* logError */
		module.exports.logError = logError
		function logError(error) {
			if (ENVIRONMENT.debug) {
				console.log("\n***ERROR @ " + new Date().toLocaleString() + " ***")
				console.log(" - " + error)
				console.dir(arguments)
			}
		}

	/* logStatus */
		module.exports.logStatus = logStatus
		function logStatus(status) {
			if (ENVIRONMENT.debug) {
				console.log("\n--- STATUS @ " + new Date().toLocaleString() + " ---")
				console.log(" - " + status)
			}
		}

	/* logMessage */
		module.exports.logMessage = logMessage
		function logMessage(message) {
			if (ENVIRONMENT.debug) {
				console.log(" - " + new Date().toLocaleString() + ": " + message)
			}
		}

	/* logTime */
		module.exports.logTime = logTime
		function logTime(flag, callback) {
			if (ENVIRONMENT.debug) {
				let before = process.hrtime()
				callback()

				let after = process.hrtime(before)[1] / 1e6
				if (after > 10) {
					logMessage(flag + " " + after)
				}
				else {
					logMessage(".")
				}
			}
			else {
				callback()
			}
		}

/*** maps ***/
	/* getEnvironment */
		module.exports.getEnvironment = getEnvironment
		function getEnvironment() {
			try {
				if (process.env.DOMAIN !== undefined) {
					return {
						port:   process.env.PORT,
						domain: process.env.DOMAIN,
						debug:  process.env.DEBUG || false,
						db: {
							sessions: {},
							games: {}
						},
						ws_config: {
							autoAcceptConnections: false
						}
					}
				}
				else {
					return {
						port:   3000,
						domain: "localhost",
						debug:  true,
						db: {
							sessions: {},
							games: {}
						},
						ws_config: {
							autoAcceptConnections: false
						}
					}
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

	/* getContentType */
		module.exports.getContentType = getContentType
		function getContentType(string) {
			try {
				let array = string.split(".")
				let extension = array[array.length - 1].toLowerCase()

				switch (extension) {
					// application
						case "json":
						case "pdf":
						case "rtf":
						case "xml":
						case "zip":
							return "application/" + extension
						break

					// font
						case "otf":
						case "ttf":
						case "woff":
						case "woff2":
							return "font/" + extension
						break

					// audio
						case "aac":
						case "midi":
						case "wav":
							return "audio/" + extension
						break
						case "mid":
							return "audio/midi"
						break
						case "mp3":
							return "audio/mpeg"
						break
						case "oga":
							return "audio/ogg"
						break
						case "weba":
							return "audio/webm"
						break

					// images
						case "iso":
						case "bmp":
						case "gif":
						case "jpeg":
						case "png":
						case "tiff":
						case "webp":
							return "image/" + extension
						break
						case "jpg":
							return "image/jpeg"
						break
						case "svg":
							return "image/svg+xml"
						break
						case "tif":
							return "image/tiff"
						break

					// video
						case "mpeg":
						case "webm":
							return "video/" + extension
						break
						case "ogv":
							return "video/ogg"
						break

					// text
						case "css":
						case "csv":
						case "html":
						case "js":
							return "text/" + extension
						break
						case "md":
							return "text/html"
						break
						case "txt":
						default:
							return "text/plain"
						break
				}
			}
			catch (error) {logError(error)}
		}

	/* getSchema */
		module.exports.getSchema = getSchema
		function getSchema(index) {
			try {
				switch (index) {
					// core
						case "query":
							return {
								collection: null,
								command: null,
								filters: null,
								document: null,
								options: {}
							}
						break

						case "session":
							return {
								id: generateRandom(),
								updated: new Date().getTime(),
								playerId: null,
								gameId: null,
								info: {
									"ip":         null,
									"user-agent": null,
									"language":   null
								}
							}
						break

					// large structures
						case "player":
							return {
								id: generateRandom(),
								sessionId: null,
								name: null,
								isAdmin: false,
								role: null
							}
						break

						case "game":
							return {
								id: generateRandom(null, getAsset("constants").gameIdLength).toLowerCase(),
								created: new Date().getTime(),
								updated: new Date().getTime(),
								status: {
									startTime: null,
									endTime: null,
									timeRemaining: null,
									play: false
								},
								settings: {
									timeLimit: null,
									x: 0,
									y: 0,
									grid: false,
									gridLabels: false,
									backgroundImage: null,
									backgroundMarkers: [],
									objectCount: 0,
									objectColors: [],
									objectBorders: false,
									objectBorderColors: [],
									objectShapes: [],
									objectSizes: [],
									objectOpacities: []
								},
								objects: {},
								players: {},
								spectators: {}
							}
						break

					// other
						default:
							return null
						break
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

	/* getAsset */
		module.exports.getAsset = getAsset
		function getAsset(index) {
			try {
				switch (index) {
					// web
						case "title":
							return "Barrier Task Game"
						break
						case "logo":
							return `<link rel="shortcut icon" href="logo.png/>`
						break
						case "meta":
							return `<meta charset="UTF-8"/>
									<meta name="description" content="TBD"/>
									<meta name="author content="James Mayr/>
									<meta property="og:title" content="TBD"/>
									<meta property="og:description" content="TBD"/>
									<meta property="og:image" content="https://tbd.herokuapp.com/banner.png/>
									<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0/>`
						break
						case "fonts":
							return `<link href="https://fonts.googleapis.com/css?family=TBD&display=swap" rel="stylesheet">`
						break
						case "css-variables":
							// output
								let output = ""

							// colors
								let colors = getAsset("colors")
								for (let i in colors) {
									output += ("--" + i + ": " + colors[i] + "; ")
								}

							// sizes
								let sizes = getAsset("sizes")
								for (let i in sizes) {
									output += ("--" + i + ": " + sizes[i] + "; ")
								}

							// fonts
								let fonts = getAsset("fonts")
									fonts = fonts.slice(fonts.indexOf("family=") + 7, fonts.indexOf("&display="))
									fonts = fonts.split("|")
								for (let i in fonts) {
									output += ("--font-" + i + ": '" + fonts[i].replace(/\+/i, " ") + "', sans-serif; ")
								}

							// return
								return `<style>:root {` + output = `}</style>`
						break

						case "colors":
							return {
								"light-gray": "#dddddd",
								"medium-gray": "#555555",
								"dark-gray": "#111111",
								"light-red": "#ddaaaa",
								"medium-red": "#aa5555",
								"dark-red": "#551111",
								"light-orange": "#ddaa77",
								"medium-orange": "#aa7755",
								"dark-orange": "#775511",
								"light-yellow": "#ddddaa",
								"medium-yellow": "#aaaa55",
								"dark-yellow": "#555511",
								"light-green": "#aaddaa",
								"medium-green": "#55aa55",
								"dark-green": "#115511",
								"light-blue": "#aaaadd",
								"medium-blue": "#5555aa",
								"dark-blue": "#111155",
								"light-purple": "#ddaadd",
								"medium-purple": "#aa55aa",
								"dark-purple": "#551155",
							}
						break

						case "sizes":
							return {
								"shadow-size": "5px",
								"border-radius": "20px",
								"blur-size": "5px",
								"border-size": "2px",
								"small-gap-size": "5px",
								"medium-gap-size": "10px",
								"large-gap-size": "20px",
								"small-font-size": "15px",
								"medium-font-size": "20px",
								"large-font-size": "35px",
								"huge-font-size": "50px",
								"transition-time": "1s"
							}
						break

					// gameplay
						case "shapes":
							return {

							}
						break

						case "constants":
							return {
								alphabet: "abcdefghijklmnopqrstuvwxyz",
								randomLength: 16,
								minute: 60000,
								second: 1000,
								cookieLength: 1000 * 60 * 60 * 24 * 7,
								minimumPlayers: 2,
								maximumPlayers: 8,
								minimumNameLength: 3,
								maximumNameLength: 16,
								gameIdLength: 4,
								rounding: 100,
								minimumGridSize: 2,
								maximumGridSize: 10
							}
						break

					// other
						default:
							return null
						break
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** checks ***/
	/* isNumLet */
		module.exports.isNumLet = isNumLet
		function isNumLet(string) {
			try {
				return (/^[a-zA-Z0-9]+$/).test(string)
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** tools ***/
	/* renderHTML */
		module.exports.renderHTML = renderHTML
		function renderHTML(REQUEST, path, callback) {
			try {
				let html = {}
				FS.readFile(path, "utf8", function (error, file) {
					if (error) {
						logError(error)
						callback("")
						return
					}

					html.original = file
					html.array = html.original.split(/<script\snode>|<\/script>node>/gi)

					for (html.count = 1; html.count < html.array.length; html.count += 2) {
						try {
							html.temp = eval(html.array[html.count])
						}
						catch (error) {
							html.temp = ""
							logError("<sn>" + Math.ceil(html.count / 2) + "</sn>\n" + error)
						}
						html.array[html.count] = html.temp
					}

					callback(html.array.join(""))
				}
			}
			catch (error) {
				logError(error)
				callback("")
			}
		}

	/* constructHeaders */
		module.exports.constructHeaders = constructHeaders
		function constructHeaders(REQUEST) {
			try {
				// asset
					if (REQUEST.method == "GET" && (REQUEST.fileType || !REQUEST.session)) {
						return {"Content-Type": REQUEST.contentType}
					}

				// get
					if (REQUEST.method == "GET") {
						return {
							"Set-Cookie": ("session=" + REQUEST.session.id + "; expires=" + (new Date(new Date().getTime() + ENVIRONMENT.cookieLength).toUTCString()) + "; path=/; domain=" + ENVIRONMENT.domain),
							"Content-Type": "text/html; charset=utf-8"
						}
					}

				// post
					if (REQUEST.method == "POST") {
						return {
							"Content-Type": "application/json"
						}
					}
			}
			catch (error) {
				logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* duplicateObject */
		module.exports.duplicateObject = duplicateObject
		function duplicateObject(object) {
			try {
				return JSON.parse(JSON.stringify(object))
			}
			catch (error) {
				logError(error)
				return null
			}
		}

/*** randoms ***/
	/* generateRandom */
		module.exports.generateRandom = generateRandom
		function generateRandom(set, length) {
			try {
				set = set || getAsset("constants").alphabet
				length = length || getAsset("constants").randomLength

				let output = ""
				for (let i = 0; i < length; i++) {
					output += (set[Math.floor(Math.random() * set.length)])
				}

				return output
			}
			catch (error) {
				logError(error)
				return null
			}
		}

	/* chooseRandom */
		module.exprots.chooseRandom = chooseRandom
		function chooseRandom(options) {
			try {
				if (!Array.isArray(options)) {
					return false
				}

				return options[Math.floor(Math.random() * options.length)]
			}
			catch (error) {
				logError(error)
				return false
			}
		}	

	/* sortRandom */
		module.exports.sortRandom = sortRandom
		function sortRandom(options) {
			try {
				if (!Array.isArray(options)) {
					return false
				}
				
				let copy = duplicateObject(options)

				let x = copy.length
				while (x > 0) {
					let y = Math.floor(Math.random() * x)
					x -= 1
					let temp = copy[x]
					copy[x] = copy[y]
					copy[y] = temp
				}

				return copy
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** database ***/
	/* accessDatabase */
		module.exports.accessDatabase = accessDatabase
		function accessDatabase(query, callback) {
			try {
				// no query?
					if (!query) {
						if (typeof ENVIRONMENT.db !== "object") {
							callback({success: false, message: "invalid database"})
							return
						}
						callback(ENVIRONMENT.db)
						return
					}

				// log
					// logMessage("db: " + query.command + " " + query.collection)

				// fake database?
					if (!ENVIRONMENT.db) {
						logError("database not found")
						callback({success: false, message: "database not found"})
						return
					}

				// collection
					if (!ENVIRONMENT.db[query.collection]) {
						logError("collection not found")
						callback({success: false, message: "collection not found"})
						return
					}

				// find
					if (query.command == "find") {
						// all documents
							let documentKeys = Object.keys(ENVIRONMENT.db[query.collection])

						// apply filters
							let filters = Object.keys(query.filters)
							for (let f in filters) {
								let property = filters[f]
								let filter = query.filters[property]

								if (filter instanceof RegExp) {
									documentKeys = documentKeys.filter(function(key) {
										return filter.test(ENVIRONMENT.db[query.collection][key][property])
									})
								}
								else {
									documentKeys = documentKeys.filter(function(key) {
										return filter == ENVIRONMENT.db[query.collection][key][property]
									})
								}
							}

						// get documents
							let documents = []
							for (let d in documentKeys) {
								documents.push(duplicateObject(ENVIRONMENT.db[query.collection][documentKeys[d]]))
							}

						// no documents
							if (!documents.length) {
								callback({success: false, count: 0, documents: []})
								return
							}

						// yes documents
							callback({success: true, count: documentKeys.length, documents: documents})
							return
					}

				// insert
					if (query.command == "insert") {
						// unique id
							let id = null
							do {
								id = generateRandom()
							}
							while (ENVIRONMENT.db[query.collection][id])

						// insert document
							ENVIRONMENT.db[query.collection][id] = duplicateObject(query.document)

						// return document
							callback({success: true, count: 1, documents: [query.document]})
							return
					}

				// update
					if (query.command == "update") {
						// all documents
							let documentKeys = Object.keys(ENVIRONMENT.db[query.collection])

						// apply filters
							let filters = Object.keys(query.filters)
							for (let f in filters) {
								documentKeys = documentKeys.filter(function(key) {
									return ENVIRONMENT.db[query.collection][key][filters[f]] == query.filters[filters[f]]
								})
							}

						// update keys
							let updateKeys = Object.keys(query.document)

						// update
							for (let d in documentKeys) {
								let document = ENVIRONMENT.db[query.collection][documentKeys[d]]

								for (let u in updateKeys) {
									document[updateKeys[u]] = query.document[updateKeys[u]]
								}
							}

						// update documents
							let documents = []
							for (let d in documentKeys) {
								documents.push(duplicateObject(ENVIRONMENT.db[query.collection][documentKeys[d]]))
							}

						// no documents
							if (!documents.length) {
								callback({success: false, count: 0, documents: []})
								return
							}

						// yes documents
							callback({success: true, count: documentKeys.length, documents: documents})
							return
					}

				// delete
					if (query.command == "delete") {
						// all documents
							let documentKeys = Object.keys(ENVIRONMENT.db[query.collection])

						// apply filters
							let filters = Object.keys(query.filters)
							for (let f in filters) {
								documentKeys = documentKeys.filter(function(key) {
									return ENVIRONMENT.db[query.collection][key][filters[f]] == query.filters[filters[f]]
								})
							}

						// delete
							for (let d in documentKeys) {
								delete ENVIRONMENT.db[query.collection][documentKeys[d]]
							}

						// no documents
							if (!documentKeys.length) {
								callback({success: false, count: 0})
							}

						// yes documents
							callback({success: true, count: documentKeys.length})
							return
					}
			}
			catch (error) {
				logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}
