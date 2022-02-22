/*** modules ***/
	if (!CORE) { const CORE = require("../node/core") }
	if (!SESSION) { const SESSION = require("../node/session") }
	module.exports = {}

/*** constants ***/
	const CONSTANTS = CORE.getAsset("constants")

/*** creates ***/
	/* createOne */
		module.exports.createOne = createOne
		function createOne(REQUEST, callback) {
			try {
				// name
					if (!REQUEST.post.name || !CORE.isNumLet(REQUEST.post.name)) {
						callback({success: false, message: "Name must be letters and numbers only."})
						return
					}

					if (CONSTANTS.minimumNameLength > REQUEST.post.name.length || REQUEST.post.name.length > CONSTANTS.maximumNameLength) {
						callback({success: false, message: "Name must be between " + CONSTANTS.minimumNameLength + " and " + CONSTANTS.maximumNameLength + " characters."})
						return
					}

				// create
					let player = CORE.getSchema("player")
						player.sessionId = REQUEST.session.id
						player.name = REQUEST.post.name.trim()

					let game = CORE.getSchema("game")
						game.players[player.id] = player

				// query
					let query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "insert"
						query.document = game

				// insert
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// update session
							REQUEST.updateSession = {
								playerId: player.id,
								gameId: game.id
							}
							SESSION.updateOne(REQUEST, null, function() {
								// redirect
									callback({success: true, message: "game created", location: "../game/" + game.id})
							})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* joinOne */
		module.exports.joinOne = joinOne
		function joinOne(REQUEST, callback) {
			try {
				// name
					if (!REQUEST.post.name || !CORE.isNumLet(REQUEST.post.name)) {
						callback({success: false, message: "Name must be letters and numbers only."})
						return
					}

					if (CONSTANTS.minimumNameLength > REQUEST.post.name.length || REQUEST.post.name.length > CONSTANTS.maximumNameLength) {
						callback({success: false, message: "Name must be between " + CONSTANTS.minimumNameLength + " and " + CONSTANTS.maximumNameLength + " characters."})
						return
					}

				// game id
					if (!REQUEST.post.gameId || REQUEST.post.gameId.length !== CONSTANTS.gameIdLength || !CORE.isNumLet(REQUEST.post.gameId)) {
						callback({success: false, message: "gameId must be " + CONSTANTS.gameIdLength + " letters and numbers"})
						return
					}

				// query
					REQUEST.post.gameId = REQUEST.post.gameId.toLowerCase()
					let query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: REQUEST.post.gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({success: false, message: "no game found"})
								return
							}

						// already a player
							let game = results.documents[0]
							let playerKeys = Object.keys(game.players)
							if (playerKeys.find(function(p) { return game.players[p].sessionId == REQUEST.session.id })) {
								callback({success: true, message: "rejoining game", location: "../game/" + game.id})
								return
							}

						// player count
							if (playerKeys.length >= CONSTANTS.maximumPlayers) {
								callback({success: false, message: "maximum player count reached"})
								return
							}

						// create player
							let player = CORE.getSchema("player")
								player.sessionId = REQUEST.session.id

						// name taken
							if (playerKeys.find(function(p) { return game.players[p].name.trim().toLowerCase() == REQUEST.post.name.trim().toLowerCase() })) {
								callback({success: false, message: "name already taken"})
								return
							}
							
							player.name = REQUEST.post.name.trim()

						// add to game
							game.players[player.id] = player

						// query
							game.updated = new Date().getTime()
							let query = CORE.getSchema("query")
								query.collection = "games"
								query.command = "update"
								query.filters = {id: game.id}
								query.document = game

						// update
							CORE.accessDatabase(query, function(results) {
								if (!results.success) {
									callback(results)
									return
								}

								// update session
									REQUEST.updateSession = {
										playerId: player.id,
										gameId: game.id
									}
									SESSION.updateOne(REQUEST, null, function() {
										// redirect
											callback({success: true, message: "game joined", location: "../game/" + game.id})
									})
							})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** reads ***/
	/* readOne */
		module.exports.readOne = readOne
		function readOne(REQUEST, callback) {
			try {
				// game id
					let gameId = REQUEST.path[REQUEST.path.length - 1]

				// query
					let query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({gameId: gameId, success: false, message: "no game found", location: "../../../../", recipients: [REQUEST.session.id]})
							}

						// get player id
							let game = results.documents[0]
							let playerId = null
							if (Object.keys(game.players).length) {
								playerId = Object.keys(game.players).find(function(p) {
									return game.players[p].sessionId == REQUEST.session.id
								})
							}

						// new player --> send full game
							if (playerId) {
								callback({gameId: game.id, success: true, message: null, playerId: playerId, game: game, recipients: [REQUEST.session.id]})
								return
							}

						// existing spectator
							if (game.spectators[REQUEST.session.id]) {
								callback({gameId: game.id, success: true, message: "now observing the game", playerId: null, game: game, recipients: [REQUEST.session.id]})
							}

						// new spectator
							if (!game.spectators[REQUEST.session.id]) {
								// add spectator
									game.spectators[REQUEST.session.id] = true

								// query
									game.updated = new Date().getTime()
									let query = CORE.getSchema("query")
										query.collection = "games"
										query.command = "update"
										query.filters = {id: game.id}
										query.document = {updated: game.updated, spectators: game.spectators}

								// update
									CORE.accessDatabase(query, function(results) {
										if (!results.success) {
											results.gameId = game.id
											callback(results)
											return
										}

										// for this spectator
											callback({gameId: game.id, success: true, message: "now observing the game", playerId: null, game: game, recipients: [REQUEST.session.id]})
									})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}


/*** updates ***/
	/* updateOne */
		module.exports.updateOne = updateOne
		function updateOne(REQUEST, callback) {
			try {
				// game id
					let gameId = REQUEST.path[REQUEST.path.length - 1]
					if (!gameId || gameId.length !== CONSTANTS.gameIdLength) {
						callback({gameId: gameId, success: false, message: "invalid game id", recipients: [REQUEST.session.id]})
						return
					}

				// player id
					if (!REQUEST.post || !REQUEST.post.playerId) {
						callback({gameId: gameId, success: false, message: "invalid player id", recipients: [REQUEST.session.id]})
						return
					}

				// action
					if (!REQUEST.post || !REQUEST.post.action || !["updateOption", "updateObject", "updatePlayer", "startGame", "endGame"].includes(REQUEST.post.action)) {
						callback({gameId: gameId, success: false, message: "invalid action", recipients: [REQUEST.session.id]})
						return
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback({gameId: gameId, success: false, message: "no game found", recipients: [REQUEST.session.id]})
							return
						}

						// not a player?
							let game = results.documents[0]
							let player = game.players[REQUEST.post.playerId] || null
							if (!player) {
								callback({gameId: gameId, success: false, message: "not a player", recipients: [REQUEST.session.id]})
								return
							}

						// action
							switch (REQUEST.post.action) {
								case "updateOption":
									updateOption(REQUEST, game, player, callback)
									return
								break
								case "updateObject":
									updateObject(REQUEST, game, player, callback)
									return
								break
								case "updatePlayer":
									updatePlayer(REQUEST, game, player, callback)
									return
								break
								case "startGame":
									startGame(REQUEST, game, player, callback)
									return
								break
								case "endGame":
									endGame(REQUEST, game, player, callback)
									return
								break
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** deletes ***/
	/* deleteOne */
		module.exports.deleteOne = deleteOne
		function deleteOne(REQUEST, callback) {
			try {
				// game id
					if (!gameId || gameId.length !== CONSTANTS.gameIdLength) {
						return
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "delete"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						return
					})
			}
			catch (error) {
				CORE.logError(error)
			}
		}

/*** actions ***/
	/* updateOption */
		module.exports.updateOption = updateOption
		function updateOption(REQUEST, game, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updateObject */
		module.exports.updateObject = updateObject
		function updateObject(REQUEST, game, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updatePlayer */
		module.exports.updatePlayer = updatePlayer
		function updatePlayer(REQUEST, game, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* startGame */
		module.exports.startGame = startGame
		function startGame(REQUEST, game, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* endGame */
		module.exports.endGame = endGame
		function endGame(REQUEST, game, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

/*** tools ***/


