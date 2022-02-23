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

					let room = CORE.getSchema("room")
						room.players[player.id] = player

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "insert"
						query.document = room

				// insert
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// update session
							REQUEST.updateSession = {
								playerId: player.id,
								roomId: room.id
							}
							SESSION.updateOne(REQUEST, null, function() {
								// redirect
									callback({success: true, message: "room created", location: "../room/" + room.id})
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

				// room id
					if (!REQUEST.post.roomId || REQUEST.post.roomId.length !== CONSTANTS.roomIdLength || !CORE.isNumLet(REQUEST.post.roomId)) {
						callback({success: false, message: "roomId must be " + CONSTANTS.roomIdLength + " letters and numbers"})
						return
					}

				// query
					REQUEST.post.roomId = REQUEST.post.roomId.toLowerCase()
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "find"
						query.filters = {id: REQUEST.post.roomId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({success: false, message: "no room found"})
								return
							}

						// already a player
							let room = results.documents[0]
							let playerKeys = Object.keys(room.players)
							if (playerKeys.find(function(p) { return room.players[p].sessionId == REQUEST.session.id })) {
								callback({success: true, message: "rejoining room", location: "../room/" + room.id})
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
							if (playerKeys.find(function(p) { return room.players[p].name.trim().toLowerCase() == REQUEST.post.name.trim().toLowerCase() })) {
								callback({success: false, message: "name already taken"})
								return
							}
							
							player.name = REQUEST.post.name.trim()

						// add to room
							room.players[player.id] = player

						// query
							room.updated = new Date().getTime()
							let query = CORE.getSchema("query")
								query.collection = "rooms"
								query.command = "update"
								query.filters = {id: room.id}
								query.document = room

						// update
							CORE.accessDatabase(query, function(results) {
								if (!results.success) {
									callback(results)
									return
								}

								// update session
									REQUEST.updateSession = {
										playerId: player.id,
										roomId: room.id
									}
									SESSION.updateOne(REQUEST, null, function() {
										// redirect
											callback({success: true, message: "room joined", location: "../room/" + room.id})
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
				// room id
					let roomId = REQUEST.path[REQUEST.path.length - 1]

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "find"
						query.filters = {id: roomId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({roomId: roomId, success: false, message: "no room found", location: "../../../../", recipients: [REQUEST.session.id]})
							}

						// get player id
							let room = results.documents[0]
							let playerId = null
							if (Object.keys(room.players).length) {
								playerId = Object.keys(room.players).find(function(p) {
									return room.players[p].sessionId == REQUEST.session.id
								})
							}

						// new player --> send full room
							if (playerId) {
								callback({roomId: room.id, success: true, message: null, playerId: playerId, room: room, recipients: [REQUEST.session.id]})
								return
							}

						// existing spectator
							if (room.spectators[REQUEST.session.id]) {
								callback({roomId: room.id, success: true, message: "now observing the room", playerId: null, room: room, recipients: [REQUEST.session.id]})
							}

						// new spectator
							if (!room.spectators[REQUEST.session.id]) {
								// add spectator
									room.spectators[REQUEST.session.id] = true

								// query
									room.updated = new Date().getTime()
									let query = CORE.getSchema("query")
										query.collection = "rooms"
										query.command = "update"
										query.filters = {id: room.id}
										query.document = {updated: room.updated, spectators: room.spectators}

								// update
									CORE.accessDatabase(query, function(results) {
										if (!results.success) {
											results.roomId = room.id
											callback(results)
											return
										}

										// for this spectator
											callback({roomId: room.id, success: true, message: "now observing the room", playerId: null, room: room, recipients: [REQUEST.session.id]})
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
				// room id
					let roomId = REQUEST.path[REQUEST.path.length - 1]
					if (!roomId || roomId.length !== CONSTANTS.roomIdLength) {
						callback({roomId: roomId, success: false, message: "invalid room id", recipients: [REQUEST.session.id]})
						return
					}

				// player id
					if (!REQUEST.post || !REQUEST.post.playerId) {
						callback({roomId: roomId, success: false, message: "invalid player id", recipients: [REQUEST.session.id]})
						return
					}

				// action
					if (!REQUEST.post || !REQUEST.post.action || !["updateRoom", "updateConfiguration", "updatePlayer", "updateObject", "startGame", "endGame"].includes(REQUEST.post.action)) {
						callback({roomId: roomId, success: false, message: "invalid action", recipients: [REQUEST.session.id]})
						return
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "find"
						query.filters = {id: roomId}

				// find
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback({roomId: roomId, success: false, message: "no room found", recipients: [REQUEST.session.id]})
							return
						}

						// not a player?
							let room = results.documents[0]
							let player = room.players[REQUEST.post.playerId] || null
							if (!player) {
								callback({roomId: roomId, success: false, message: "not a player", recipients: [REQUEST.session.id]})
								return
							}

						// action
							switch (REQUEST.post.action) {
								case "updateRoom":
									updateRoom(REQUEST, room, player, callback)
									return
								break
								case "updateConfiguration":
									updateConfiguration(REQUEST, room, player, callback)
									return
								break
								case "updatePlayer":
									updatePlayer(REQUEST, room, player, callback)
									return
								break
								case "updateObject":
									updateObject(REQUEST, room, player, callback)
									return
								break
								case "startGame":
									startGame(REQUEST, room, player, callback)
									return
								break
								case "endGame":
									endGame(REQUEST, room, player, callback)
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
				// room id
					if (!roomId || roomId.length !== CONSTANTS.roomIdLength) {
						return
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "delete"
						query.filters = {id: roomId}

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
	/* updateRoom */
		module.exports.updateRoom = updateRoom
		function updateRoom(REQUEST, room, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updateConfiguration */
		module.exports.updateConfiguration = updateConfiguration
		function updateConfiguration(REQUEST, room, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updatePlayer */
		module.exports.updatePlayer = updatePlayer
		function updatePlayer(REQUEST, room, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updateObject */
		module.exports.updateObject = updateObject
		function updateObject(REQUEST, room, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* startGame */
		module.exports.startGame = startGame
		function startGame(REQUEST, room, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* endGame */
		module.exports.endGame = endGame
		function endGame(REQUEST, room, player, callback) {
			try {

			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

/*** tools ***/


