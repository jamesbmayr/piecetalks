/*** modules ***/
	const HTTP = require("http")
	const FS   = require("fs")
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
							rooms: {}
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
							rooms: {}
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
							return "text/" + extension
						break
						case "js":
							return "text/javascript"
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
								roomId: null,
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
								connected: false,
								name: null,
								isHost: false,
								role: "spectator",
								objects: {}
							}
						break

						case "room":
							return {
								id: generateRandom(null, getAsset("constants").roomIdLength).toLowerCase(),
								created: new Date().getTime(),
								updated: new Date().getTime(),
								status: {
									name: "unnamed room",
									startTime: null,
									endTime: null,
									timeRemaining: null,
									play: false
								},
								configuration: {
									preset: "custom",
									timer: {
										active: false,
										seconds: 0
									},
									board: {
										x: 0,
										y: 0,
										grid: false,
										coordinates: false,
										background: {name: "blank", value: "transparent"}
									},
									objects: {
										count: 0,
										unused: 0,
										overlap: false,
										borders: false,
										labels: false,
										sizes: [],
										shapes: [],
										colors: []
									}
								},
								players: {}
							}
						break

					// small structures
						case "object":
							return {
								id: generateRandom(),
								position: {
									x: null,
									y: null,
									z: null
								},
								target: {
									x: null,
									y: null
								},
								size: {
									x: 0,
									y: 0
								},
								shape: null,
								color: null,
								border: null,
								label: null
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
							return "Taking Shape"
						break
						case "logo":
							return `<link rel="shortcut icon" href="logo.png"/>`
						break
						case "meta":
							let title = getAsset("title")
							return `<meta charset="UTF-8"/>
									<meta name="description" content="` + title + `"/>
									<meta name="author" content="James Mayr & Ayelet Kershenbaum"/>
									<meta property="og:title" content="` + title + `"/>
									<meta property="og:description" content="` + title + `"/>
									<meta property="og:image" content="https://"` + ENVIRONMENT.domain + `"/banner.png"/>
									<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0"/>`
						break
						case "fonts":
							return `<link href="https://fonts.googleapis.com/css?family=Roboto:wght@400;700&display=swap" rel="stylesheet">`
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
								return `<style>:root {` + output + `}</style>`
						break

					// styling
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
								"shadow-size": "10px",
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
								"transition-time": "1s",
								"hover-brightness": "0.75",
								"disabled-brightness": "0.25",
								"drawer-opacity": "0.5",
								"object-opacity": "0.85",
								"object-border": "80%"
							}
						break

					// constants
						case "constants":
							return {
								alphabet: "abcdefghijklmnopqrstuvwxyz",
								randomLength: 16,
								minute: 60000,
								second: 1000,
								cookieLength: 1000 * 60 * 60 * 24 * 7,
								minimumPlayers: 2,
								maximumPlayers: 10,
								minimumPlayerNameLength: 3,
								maximumPlayerNameLength: 20,
								minimumRoomNameLength: 3,
								maximumRoomNameLength: 40,
								roomIdLength: 4,
								rounding: 100,
								roles: ["speaker", "actor", "spectator"],
								attempts: 10,
								borderProbability: 0.5,
								labelProbability: 1
							}
						break

					// play
						case "configurations":
							return {
								timer: {
									seconds: {
										minimum: 0,
										maximum: 60 * 30
									}
								},
								board: {
									x: {
										minimum: 2,
										maximum: 10
									},
									y: {
										minimum: 2,
										maximum: 10
									},
									backgrounds: {
										"blank": "transparent",
										"horizontal color gradient": "linear-gradient(to right, red, yellow, green, cyan, blue, magenta)",
										"vertical color gradient": "linear-gradient(red, yellow, green, cyan, blue, magenta)",
										"radial color gradient": "radial-gradient(red, yellow, green, cyan, blue, magenta)",
										"horizontal grayscale gradient": "linear-gradient(to right, white, black)",
										"vertical grayscale gradient": "linear-gradient(white, black)",
										"radial grayscale gradient": "radial-gradient(white, black)"
									}
								},
								objects: {
									count: {
										minimum: 1,
										maximum: 100
									},
									unused: {
										minimum: 0,
										maximum: 100
									},
									sizes: {
										"1x1": {x: 1, y: 1},
										"3x3": {x: 3, y: 3},
										"5x5": {x: 5, y: 5}
									},
									shapes: {
										"circle": "circle(50%)",
										"triangle up": "polygon(50% 0%, 100% 100%, 0% 100%)",
										"triangle down": "polygon(0% 0%, 100% 0%, 50% 100%)",
										"triangle left": "polygon(100% 0%, 100% 100%, 0% 50%)",
										"triangle right": "polygon(0% 0%, 100% 50%, 0% 100%)",
										"square": "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
										"diamond": "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
										"rectangle horizontal": "polygon(0% 20%, 100% 20%, 100% 80%, 0% 80%)",
										"rectangle vertical": "polygon(20% 0%, 80% 0%, 80% 100%, 20% 100%)",
										"rhombus positive": "polygon(25% 25%, 100% 0%, 75% 75%, 0% 100%)",
										"rhombus negative": "polygon(0% 0%, 75% 25%, 100% 100%, 25% 75%)",
										"chevron up": "polygon(0% 100%, 50% 0%, 100% 100%, 50% 75%)",
										"chevron down": "polygon(0% 0%, 50% 25%, 100% 0%, 50% 100%)",
										"chevron left": "polygon(0% 0%, 100% 50%, 0% 100%, 25% 50%)",
										"chevron right": "polygon(0% 50%, 100% 0%, 75% 50%, 100% 100%)",
										"hexagon horizontal": "polygon(20% 5%, 80% 5%, 100% 50%, 80% 95%, 20% 95%, 0% 50%)",
										"hexagon vertical": "polygon(5% 20%, 50% 0%, 90% 20%, 90% 80%, 50% 100%, 5% 80%)",
										"hourglass horizontal": "polygon(0% 0%, 50% 30%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)",
										"hourglass vertical": "polygon(0% 0%, 100% 0%, 70% 50%, 100% 100%, 0% 100%, 30% 50%)",
										"octagon": "polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)",
										"octagon diagonal": "polygon(50% 0%, 87.5% 12.5%, 100% 50%, 87.5% 87.5%, 50% 100%, 12.5% 87.5%, 0% 50%, 12.5% 12.5%)",
										"4 point star": "polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)",
										"cross": "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)",
										"x": "polygon(20% 0%, 50% 30%, 80% 0%, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0% 80%, 30% 50%, 0% 20%)",
										"5 point star": "polygon(50% 0%, 63% 38%, 100% 38%, 70% 62%, 80% 100%, 50% 77%, 20% 100%, 30% 62%, 0% 38%, 37% 38%)",
										"pentagram": "polygon(50% 100%, 63% 62%, 100% 62%, 70% 38%, 80% 0%, 50% 23%, 20% 0%, 30% 38%, 0% 62%, 37% 62%)",
										"8 point star": "polygon(10% 10%, 40% 25%, 50% 0%, 60% 25%, 90% 10%, 75% 40%, 100% 50%, 75% 60%, 90% 90%, 60% 75%, 50% 100%, 40% 75%, 10% 90%, 25% 60%, 0% 50%, 25% 40%)"
									},
									colors: getAsset("colors")
								},
								presets: {
									easy: {
										preset: "easy",
										timer: {
											active: false,
											seconds: 0
										},
										board: {
											x: 3,
											y: 3,
											grid: true,
											coordinates: true,
											background: {name: "blank", value: "transparent"}
										},
										objects: {
											count: 5,
											unused: 0,
											overlap: false,
											borders: false,
											labels: true,
											sizes: ["1x1"],
											shapes: ["circle", "triangle up", "square", "octagon", "cross", "8 point star"],
											colors: ["light-gray", "medium-red", "medium-yellow", "medium-green", "medium-blue"]
										}
									},
									medium: {
										preset: "medium",
										timer: {
											active: false,
											seconds: 0
										},
										board: {
											x: 5,
											y: 5,
											grid: true,
											coordinates: false,
											background: {name: "horizontal grayscale gradient", value: "linear-gradient(to right, white, black)"}
										},
										objects: {
											count: 10,
											unused: 0,
											overlap: false,
											borders: true,
											labels: false,
											sizes: ["1x1"],
											shapes: ["circle", "triangle up", "square", "diamond", "rectangle horizontal", "hexagon horizontal", "octagon", "cross", "5 point star", "8 point star"],
											colors: ["light-gray", "medium-red", "medium-orange", "medium-yellow", "medium-green", "medium-blue", "medium-purple"]
										}
									},
									challenging: {
										preset: "challenging",
										timer: {
											active: true,
											seconds: 300
										},
										board: {
											x: 6,
											y: 6,
											grid: true,
											coordinates: false,
											background: {name: "vertical grayscale gradient", value: "linear-gradient(white, black)"}
										},
										objects: {
											count: 10,
											unused: 5,
											overlap: false,
											borders: true,
											labels: false,
											sizes: ["1x1"],
											shapes: ["circle", "triangle up", "triangle down", "square", "diamond", "rectangle horizontal", "rectangle vertical", "hexagon horizontal", "hexagon vertical", "octagon", "cross", "x", "5 point star", "8 point star"],
											colors: ["light-gray", "medium-gray", "light-red", "medium-red", "light-orange", "medium-orange", "light-yellow", "medium-yellow", "light-green", "medium-green", "light-blue", "medium-blue", "light-purple", "medium-purple"]
										}
									},
									difficult: {
										preset: "difficult",
										timer: {
											active: true,
											seconds: 300
										},
										board: {
											x: 8,
											y: 8,
											grid: false,
											coordinates: false,
											background: {name: "vertical color gradient", value: "vertical color gradient"}
										},
										objects: {
											count: 10,
											unused: 10,
											overlap: true,
											borders: true,
											labels: false,
											sizes: ["1x1", "3x3"],
											shapes: ["circle", "triangle up", "triangle down", "triangle left", "triangle right", "square", "diamond", "rectangle horizontal", "rectangle vertical", "rhombus positive", "rhombus negative", "hexagon horizontal", "hexagon vertical", "hourglass vertical", "octagon", "octagon diagonal", "cross", "x", "5 point star", "8 point star"],
											colors: ["light-gray", "medium-gray", "light-red", "medium-red", "light-orange", "medium-orange", "light-yellow", "medium-yellow", "light-green", "medium-green", "light-blue", "medium-blue", "light-purple", "medium-purple"]
										}
									},
									insane: {
										preset: "insane",
										timer: {
											active: true,
											seconds: 300
										},
										board: {
											x: 10,
											y: 10,
											grid: false,
											coordinates: false,
											background: {name: "radial color gradient", value: "radial-gradient(red, yellow, green, cyan, blue, magenta)"}
										},
										objects: {
											count: 15,
											unused: 15,
											overlap: true,
											borders: true,
											labels: false,
											sizes: ["1x1", "3x3", "5x5"],
											shapes: ["circle", "triangle up", "triangle down", "triangle left", "triangle right", "square", "diamond", "rectangle horizontal", "rectangle vertical", "rhombus positive", "rhombus negative", "chevron up", "chevron down", "chevron left", "chevron right", "hexagon horizontal", "hexagon vertical", "hourglass horizontal", "hourglass vertical", "octagon", "octagon diagonal", "4 point star", "cross", "x", "5 point star", "pentagram", "8 point star"],
											colors: ["light-gray", "medium-gray", "dark-gray", "light-red", "medium-red", "dark-red", "light-orange", "medium-orange", "dark-orange", "light-yellow", "medium-yellow", "dark-yellow", "light-green", "medium-green", "dark-green", "light-blue", "medium-blue", "dark-blue", "light-purple", "medium-purple", "dark-purple"]
										}
									}
								}
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

	/* isEmail */
		module.exports.isEmail = isEmail
		function isEmail(string) {
			try {
				return (/[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/).test(string)
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
				})
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
		module.exports.chooseRandom = chooseRandom
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
