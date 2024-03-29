/*** modules ***/
	const HTTP    = require("http")
	const FS      = require("fs")
	const QS      = require("querystring")
	const WS      = require("websocket").server

	const CORE    = require("./node/core")
	const ROOM    = require("./node/room")
	const SESSION = require("./node/session")

/*** constants ***/
	const ENVIRONMENT = CORE.getEnvironment()

/*** server ***/
	/* server */
		const SERVER = HTTP.createServer(handleRequest)
			SERVER.listen(ENVIRONMENT.port, launchServer)

	/* launchServer */
		function launchServer(error) {
			if (error) {
				CORE.logError(error)
				return
			}
			CORE.logStatus("listening on port " + ENVIRONMENT.port)
		}

	/* handleRequest */
		function handleRequest(REQUEST, RESPONSE) {
			try {
				// collect data
					let data = ""
					REQUEST.on("data", function(chunk) {
						data += chunk
					})
					REQUEST.on("end", function() {
						parseRequest(REQUEST, RESPONSE, data)
					})
			}
			catch (error) {CORE.logError(error)}
		}

	/* parseRequest */
		function parseRequest(REQUEST, RESPONSE, data) {
			try {
				// redirect non-https
					if ((/^http\:\/\//).test(REQUEST.headers.host)) {
						_302(REQUEST.url.replace(REQUEST, RESPONSE, "http://", "https://"))
						return
					}

				// get info
					REQUEST.get         = QS.parse(REQUEST.url.split("?")[1]) || {}
					REQUEST.path        = REQUEST.url.split("?")[0].split("/") || []
					REQUEST.url         = REQUEST.url.split("?")[0] || "/"
					REQUEST.post        = data ? JSON.parse(data) : {}
					REQUEST.cookie      = REQUEST.headers.cookie ? QS.parse(REQUEST.headers.cookie.replace(/; /g, "&")) : {}
					REQUEST.ip          = REQUEST.headers["x-forwarded-for"] || REQUEST.connection.remoteAddress || REQUEST.socket.remoteAddress || REQUEST.connection.socket.remoteAddress
					REQUEST.contentType = CORE.getContentType(REQUEST.url)
					REQUEST.fileType    = (/[.]([a-zA-Z0-9])+$/).test(REQUEST.url) ? (REQUEST.path[REQUEST.path.length - 1].split(".")[1] || null) : null

				// log it
					if (REQUEST.url !== "/favicon.ico") {
						CORE.logStatus((REQUEST.cookie.session || "new") + " @ " + REQUEST.ip + "\n" + 
							"[" + REQUEST.method + "] " + REQUEST.path.join("/") + "\n" + 
							JSON.stringify(REQUEST.method == "GET" ? REQUEST.get : REQUEST.post.action + ": " + Object.keys(REQUEST.post).filter(function(k) { return k !== "action" })))
					}

				// readSession
					SESSION.readOne(REQUEST, RESPONSE, routeRequest)
			}
			catch (error) {_403(REQUEST, RESPONSE, "unable to " + arguments.callee.name)}
		}

	/* routeRequest */
		function routeRequest(REQUEST, RESPONSE) {
			try {
				// get
					if (REQUEST.method == "GET") {
						switch (true) {
							// ping
								case (/^\/ping\/?$/).test(REQUEST.url):
									try {
										RESPONSE.writeHead(200, {
											"Content-Type": "text/json"
										})
										RESPONSE.end( JSON.stringify({success: true, timestamp: new Date().getTime()}) )
									}
									catch (error) {_403(error)}
								break
								
							// favicon
								case (/\/favicon[.]ico$/).test(REQUEST.url):
								case (/\/icon[.]png$/).test(REQUEST.url):
								case (/\/apple\-touch\-icon[.]png$/).test(REQUEST.url):
								case (/\/apple\-touch\-icon\-precomposed[.]png$/).test(REQUEST.url):
								case (/\/logo[.]png$/).test(REQUEST.url):
									try {
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										FS.readFile("./assets/logo.png", function (error, file) {
											if (error) {
												_404(REQUEST, RESPONSE, error)
												return
											}
											RESPONSE.end(file, "binary")
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// banner
								case (/\/banner[.]png$/).test(REQUEST.url):
									try {
										let imageName = CORE.chooseRandom(Object.keys(CORE.getAsset("configurations").presets)) + "-" + CORE.chooseRandom(["light", "dark"])
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										FS.readFile("./assets/" + imageName + ".png", function (error, file) {
											if (error) {
												_404(REQUEST, RESPONSE, error)
												return
											}
											RESPONSE.end(file, "binary")
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// css
								case (REQUEST.fileType == "css"):
									try {
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										FS.readFile("./css/" + REQUEST.path[REQUEST.path.length - 1], function (error, file) {
											if (error) {
												_404(REQUEST, RESPONSE, error)
												return
											}
											RESPONSE.end(file, "binary")
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// js
								case (REQUEST.fileType == "js"):
									try {
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										FS.readFile("./js/" + REQUEST.path[REQUEST.path.length - 1], function (error, file) {
											if (error) {
												_404(REQUEST, RESPONSE, error)
												return
											}
											RESPONSE.end(file, "binary")
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// asset
								case (/[.]([a-zA-Z0-9])+$/).test(REQUEST.url):
									try {
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										FS.readFile("./assets/" + REQUEST.path[REQUEST.path.length - 1], function (error, file) {
											if (error) {
												_404(REQUEST, RESPONSE, error)
												return
											}
											RESPONSE.end(file, "binary")
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// home
								case (/^\/?$/).test(REQUEST.url):
									try {
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										CORE.renderHTML(REQUEST, "./html/home.html", function (html) {
											RESPONSE.end(html)
										})
										return
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// room
								case (/^\/room\/[a-zA-Z0-9]{4}$/).test(REQUEST.url):
									try {
										RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
										CORE.renderHTML(REQUEST, "./html/room.html", function (html) {
											RESPONSE.end(html)
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// data
								case (/^\/data$/).test(REQUEST.url):
									try {
										if (!ENVIRONMENT.debug) {
											_404(REQUEST, RESPONSE)
											return
										}
										CORE.accessDatabase(null, function(data) {
											REQUEST.method = "POST"
											RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
											RESPONSE.end(JSON.stringify(data, null, 2))
										})
									}
									catch (error) {_404(REQUEST, RESPONSE, error)}
								break

							// other
								default:
									_404(REQUEST, RESPONSE, REQUEST.url)
									return
								break
						}
					}

				// post
					else if (REQUEST.method == "POST" && REQUEST.post.action) {
						switch (REQUEST.post.action) {
							// home
								// createRoom
									case "createRoom":
										try {
											RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
											ROOM.createOne(REQUEST, function (data) {
												RESPONSE.end(JSON.stringify(data))
											})
										}
										catch (error) {_403(REQUEST, RESPONSE, error)}
									break

								// joinRoom
									case "joinRoom":
										try {
											RESPONSE.writeHead(200, CORE.constructHeaders(REQUEST))
											ROOM.joinOne(REQUEST, function (data) {
												RESPONSE.end(JSON.stringify(data))
											})
										}
										catch (error) {_403(REQUEST, RESPONSE, error)}
									break

							// others
								default:
									_403(REQUEST, RESPONSE)
								break
						}
					}

				// others
					else {_403(REQUEST, RESPONSE, "unknown route")}
			}
			catch (error) {_403(REQUEST, RESPONSE, "unable to " + arguments.callee.name)}
		}

	/* _302 */
		function _302(REQUEST, RESPONSE, data) {
			CORE.logStatus("redirecting to " + (data || "/"))
			RESPONSE.writeHead(302, {Location: data || "../../../../"})
			RESPONSE.end()
		}

	/* _403 */
		function _403(REQUEST, RESPONSE, data) {
			CORE.logError(data)
			REQUEST.contentType = "application/json"
			RESPONSE.writeHead(403, CORE.constructHeaders(REQUEST))
			RESPONSE.end( JSON.stringify({success: false, error: data}) )
		}

	/* _404 */
		function _404(REQUEST, RESPONSE, data) {
			CORE.logError(data)
			REQUEST.contentType = "text/html"
			RESPONSE.writeHead(404, CORE.constructHeaders(REQUEST))
			CORE.renderHTML(REQUEST, "./html/_404.html", function (html) {
				RESPONSE.end(html)
			})
		}

/*** socket ***/
	/* socket */
		ENVIRONMENT.ws_config.httpServer = SERVER
		const SOCKET = new WS(ENVIRONMENT.ws_config)
			SOCKET.on("request", handleSocket)
		const CONNECTIONS = {}

	/* handleSocket */
		function handleSocket(REQUEST) {
			try {
				// reject
					if ((REQUEST.origin.replace("https://", "").replace("http://", "") !== ENVIRONMENT.domain)
					 && (REQUEST.origin !== "http://" + ENVIRONMENT.domain + ":" + ENVIRONMENT.port)) {
						CORE.logStatus("[REJECTED]: " + REQUEST.origin + " @ " + (REQUEST.socket._peername.address || "?"))
						REQUEST.reject()
						return
					}

				// create connection
					if (!REQUEST.connection) {
						REQUEST.connection = REQUEST.accept(null, REQUEST.origin)
					}

				// parse connection
					parseSocket(REQUEST)
			}
			catch (error) {CORE.logError(error)}
		}

	/* parseSocket */
		function parseSocket(REQUEST) {
			try {
				// get request info
					REQUEST.url     = (REQUEST.httpRequest.headers.host || "") + (REQUEST.httpRequest.url || "")
					REQUEST.path    = REQUEST.httpRequest.url.split("?")[0].split("/") || []
					REQUEST.cookie  = REQUEST.httpRequest.headers.cookie ? QS.parse(REQUEST.httpRequest.headers.cookie.replace(/; /g, "&")) : {}
					REQUEST.headers = {}
					REQUEST.headers["user-agent"] = REQUEST.httpRequest.headers["user-agent"]
					REQUEST.headers["accept-language"] = REQUEST.httpRequest.headers["accept-langauge"]
					REQUEST.ip      = REQUEST.connection.remoteAddress || REQUEST.socket._peername.address

				// log it
					CORE.logStatus((REQUEST.cookie.session || "new") + " @ " + REQUEST.ip + "\n[WEBSOCKET] " + REQUEST.path.join("/"))

				// get session and wait for messages
					SESSION.readOne(REQUEST, null, saveSocket)
			}
			catch (error) {_400(REQUEST, "unable to " + arguments.callee.name)}
		}

	/* saveSocket */
		function saveSocket(REQUEST) {
			try {
				// on connect - save connection & fetch room
					if (!CONNECTIONS[REQUEST.session.id]) {
						CONNECTIONS[REQUEST.session.id] = {}
					}
					CONNECTIONS[REQUEST.session.id][REQUEST.path[REQUEST.path.length - 1]] = REQUEST.connection
					sendSocketData({roomId: REQUEST.path[REQUEST.path.length - 1], success: true, message: "connected", recipients: [REQUEST.session.id]})
					ROOM.readOne(REQUEST, sendSocketData)

				// on close
					REQUEST.connection.on("close", function (reasonCode, description) {
						// remove from connections pool
							if (CONNECTIONS[REQUEST.session.id]) {
								delete CONNECTIONS[REQUEST.session.id][REQUEST.path[REQUEST.path.length - 1]]
							}
							if (!Object.keys(CONNECTIONS[REQUEST.session.id])) {
								delete CONNECTIONS[REQUEST.session.id]
							}

						// update room
							REQUEST.post = {action: "disconnectPlayer"}
							ROOM.updateOne(REQUEST, sendSocketData)
					})

				// on message
					REQUEST.connection.on("message", function (message) {
						try {
							// get post data
								let data = JSON.parse(message.utf8Data)

							// invalid data?
								if (!data || typeof data !== "object") {
									return
								}

							// route
								REQUEST.post = data
								routeSocket(REQUEST)
						}
						catch (error) {CORE.logError(error)}
					})
			}
			catch (error) {_400(REQUEST, "unable to " + arguments.callee.name)}
		}

	/* routeSocket */
		function routeSocket(REQUEST) {
			try {
				switch (REQUEST.post.action) {
					// room
						case "updateRoom":
						case "updateConfiguration":
						case "updatePlayer":
						case "updateObject":
						case "startGame":
						case "endGame":
						case "leaveRoom":
						case "removePlayer":
							try {
								ROOM.updateOne(REQUEST, sendSocketData)
							}
							catch (error) {_400(REQUEST, "unable to " + REQUEST.post.action)}
						break

					// other
						default:
							return
						break
				}
			}
			catch (error) {_400(REQUEST, "unable to " + arguments.callee.name)}
		}

	/* sendSocketData */
		function sendSocketData(data) {
			try {
				// hunt down errors
					if (!data.recipients || !data.roomId) {
						return
					}

				// get recipients
					let recipients = data.recipients.slice() || []
					delete data.recipients

				// stringify
					roomId = data.roomId
					data = JSON.stringify(data)

				// loop through recipients
					for (let r in recipients) {
						try {
							if (CONNECTIONS[recipients[r]] && CONNECTIONS[recipients[r]][roomId]) {
								CONNECTIONS[recipients[r]][roomId].sendUTF(data)
							}
						}
						catch (error) {CORE.logError(error)}
					}
			}
			catch (error) {CORE.logError(error)}
		}

	/* _400 */
		function _400(REQUEST, data) {
			CORE.logError(data)
			REQUEST.connection.sendUTF(JSON.stringify({success: false, message: (data || "unknown websocket error")}))
		}
