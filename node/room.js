/*** modules ***/
	const CORE = require("../node/core")
	const SESSION = require("../node/session")
	module.exports = {}

/*** constants ***/
	const CONSTANTS = CORE.getAsset("constants")
	const CONFIGURATIONS = CORE.getAsset("configurations")

/*** creates ***/
	/* createOne */
		module.exports.createOne = createOne
		function createOne(REQUEST, callback) {
			try {
				// name
					if (!REQUEST.post.name || !CORE.isNumLet(REQUEST.post.name)) {
						callback({success: false, message: "name must be letters and numbers only"})
						return
					}

					if (CONSTANTS.minimumPlayerNameLength > REQUEST.post.name.length || REQUEST.post.name.length > CONSTANTS.maximumPlayerNameLength) {
						callback({success: false, message: "name must be between " + CONSTANTS.minimumPlayerNameLength + " and " + CONSTANTS.maximumPlayerNameLength + " characters"})
						return
					}

				// create
					let player = CORE.getSchema("player")
						player.sessionId = REQUEST.session.id
						player.name = REQUEST.post.name.trim()
						player.isHost = true

					let room = CORE.getSchema("room")
						room.players[player.id] = player
						room.configuration = CORE.duplicateObject(CONFIGURATIONS.presets.easy)

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
						callback({success: false, message: "name must be letters and numbers only"})
						return
					}

					if (CONSTANTS.minimumPlayerNameLength > REQUEST.post.name.length || REQUEST.post.name.length > CONSTANTS.maximumPlayerNameLength) {
						callback({success: false, message: "name must be between " + CONSTANTS.minimumPlayerNameLength + " and " + CONSTANTS.maximumPlayerNameLength + " characters"})
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
								return
							}

						// get player id
							let room = results.documents[0]
							let playerId = Object.keys(room.players).find(function(p) {
								return room.players[p].sessionId == REQUEST.session.id
							}) || null

						// not a player
							if (!playerId) {
								callback({roomId: room.id, success: false, message: "not part of the room", playerId: null, recipients: [REQUEST.session.id], location: "../../../../"})
								return
							}

						// update player
							room.players[playerId].connected = true
							let name = room.players[playerId].name

						// update time
							let timeUpdated = false
							if (room.status.play && room.configuration.timer.active) {
								room.status.timeRemaining = Math.round((room.status.startTime + (room.configuration.timer.seconds * CONSTANTS.second) - new Date().getTime()) / CONSTANTS.second)
								if (room.status.timeRemaining <= 0) {
									endGame(REQUEST, room, null, callback)
									return
								}
								timeUpdated = true
							}

						// query
							let query = CORE.getSchema("query")
								query.collection = "rooms"
								query.command = "update"
								query.filters = {id: room.id}
								query.document = {players: room.players}
							if (timeUpdated) {
								query.document.status = room.status
							}

						// update room
							CORE.accessDatabase(query, function(results) {
								if (!results.success) {
									results.roomId = REQUEST.path[REQUEST.path.length - 1]
									results.recipients = [REQUEST.session.id]
									callback(results)
									return
								}

								// updated room
									let room = results.documents[0]
									for (let i in room.players) {
										callback({roomId: room.id, success: true, message: name + " connected", playerId: i, room: room, launch: room.status.play, recipients: [room.players[i].sessionId]})
									}
							})
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

				// action
					if (!REQUEST.post || !REQUEST.post.action || !["updateRoom", "updateConfiguration", "updatePlayer", "updateObject", "startGame", "endGame", "leaveRoom", "disconnectPlayer"].includes(REQUEST.post.action)) {
						callback({roomId: roomId, success: false, message: "invalid action", recipients: [REQUEST.session.id]})
						return
					}

				// player id
					if (REQUEST.post.action !== "disconnectPlayer" && (!REQUEST.post || !REQUEST.post.playerId)) {
						callback({roomId: roomId, success: false, message: "invalid player id", recipients: [REQUEST.session.id]})
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
							let player = room.players[REQUEST.post.playerId] || room.players[Object.keys(room.players).find(function(p) { return room.players[p].sessionId == REQUEST.session.id })] || null
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
								case "leaveRoom":
									leaveRoom(REQUEST, room, player, callback)
									return
								break
								case "disconnectPlayer":
									disconnectPlayer(REQUEST, room, player, callback)
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
					let roomId = REQUEST.path[REQUEST.path.length - 1]
					if (!roomId || roomId.length !== CONSTANTS.roomIdLength) {
						return
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "delete"
						query.filters = {id: roomId}

				// find
					CORE.accessDatabase(query, callback)
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
				// permissions
					if (!player.isHost) {
						callback({roomId: room.id, success: false, message: "not the host", recipients: [REQUEST.session.id]})
						return
					}

				// no parameters
					if (REQUEST.post.name == undefined && REQUEST.post.darkness == undefined) {
						callback({roomId: room.id, success: false, message: "nothing changed", recipients: [REQUEST.session.id]})
						return
					}

				// name
					if (REQUEST.post.name !== undefined) {
						let name = REQUEST.post.name.trim() || null
						if (!name || !name.length || CONSTANTS.minimumRoomNameLength > name.length || name.length > CONSTANTS.maximumRoomNameLength) {
							callback({roomId: room.id, success: false, message: "room name must be " + CONSTANTS.minimumRoomNameLength + " - " + CONSTANTS.maximumRoomNameLength + " characters", recipients: [REQUEST.session.id]})
							return
						}
						room.status.name = name
					}

				// darkness
					if (REQUEST.post.darkness !== undefined) {
						room.status.darkness = Boolean(REQUEST.post.darkness)
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = {status: room.status}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for all players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, room: room, recipients: [room.players[i].sessionId]})
							}
					})
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
				// permissions
					if (!player.isHost) {
						callback({roomId: room.id, success: false, message: "not the host", recipients: [REQUEST.session.id]})
						return
					}

				// missing fields
					if (!REQUEST.post.category || !Object.keys(room.configuration).includes(REQUEST.post.category)) {
						callback({roomId: room.id, success: false, message: "invalid category", recipients: [REQUEST.session.id]})
						return
					}

					if (typeof room.configuration[REQUEST.post.category] == "object" && !Object.keys(room.configuration[REQUEST.post.category]).includes(REQUEST.post.configuration)) {
						callback({roomId: room.id, success: false, message: "invalid configuration", recipients: [REQUEST.session.id]})
						return
					}

					if (typeof REQUEST.post.value == "undefined") {
						callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
						return
					}

				// get configuration
					let value
					switch (REQUEST.post.category + "-" + REQUEST.post.configuration) {
						// preset
							case "preset-null":
							case "preset-":
								if (!Object.keys(CONFIGURATIONS.presets).includes(REQUEST.post.value)) {
									return
								}
								room.configuration = CORE.duplicateObject(CONFIGURATIONS.presets[REQUEST.post.value])
							break

						// timer
							case "timer-active":
								room.configuration.timer.active = Boolean(REQUEST.post.value)
							break
							case "timer-seconds":
								value = Math.round(REQUEST.post.value)
								if (isNaN(value) || CONFIGURATIONS.timer.seconds.minimum > value || value > CONFIGURATIONS.timer.seconds.maximum) {
									callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
									return
								}
								room.configuration.timer.seconds = value
							break

						// board
							case "board-x":
							case "board-y":
								value = Math.round(REQUEST.post.value)
								if (isNaN(value) || CONFIGURATIONS.board[REQUEST.post.configuration].minimum > value || value > CONFIGURATIONS.board[REQUEST.post.configuration].maximum) {
									callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
									return
								}
								room.configuration.board[REQUEST.post.configuration] = value
							break
							case "board-grid":
							case "board-coordinates":
								room.configuration.board[REQUEST.post.configuration] = Boolean(REQUEST.post.value)
							break
							case "board-background":
								value = REQUEST.post.value
								if (!Object.keys(CONFIGURATIONS.board.backgrounds).includes(value)) {
									callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
									return
								}
								room.configuration.board.background = value
							break

						// objects
							case "objects-count":
							case "objects-unused":
								value = Math.round(REQUEST.post.value)
								if (isNaN(value) || CONFIGURATIONS.objects[REQUEST.post.configuration].minimum > value || value > CONFIGURATIONS.objects[REQUEST.post.configuration].maximum) {
									callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
									return
								}
								room.configuration.objects[REQUEST.post.configuration] = value
							break
							case "objects-overlap":
							case "objects-borders":
							case "objects-labels":
								room.configuration.objects[REQUEST.post.configuration] = Boolean(REQUEST.post.value)
							break
							case "objects-sizes":
								value = REQUEST.post.value
								if (REQUEST.post.include) {
									if (!Object.keys(CONFIGURATIONS.objects.sizes).includes(value)) {
										callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
										return
									}
									if (!room.configuration.objects.sizes.includes(value)) {
										room.configuration.objects.sizes.push(value)
									}
								}
								else {
									room.configuration.objects.sizes = room.configuration.objects.sizes.filter(function(i) {
										return i !== value
									}) || []
								}
							break
							case "objects-shapes":
								value = REQUEST.post.value
								if (REQUEST.post.include) {
									if (!Object.keys(CONFIGURATIONS.objects.shapes).includes(value)) {
										callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
										return
									}
									if (!room.configuration.objects.shapes.includes(value)) {
										room.configuration.objects.shapes.push(value)
									}
								}
								else {
									room.configuration.objects.shapes = room.configuration.objects.shapes.filter(function(i) {
										return i !== value
									}) || []
								}
							break
							case "objects-colors":
								value = REQUEST.post.value
								if (REQUEST.post.include) {
									if (!Object.keys(CONFIGURATIONS.objects.colors).includes(value)) {
										callback({roomId: room.id, success: false, message: "invalid value", recipients: [REQUEST.session.id]})
										return
									}
									if (!room.configuration.objects.colors.includes(value)) {
										room.configuration.objects.colors.push(value)
									}
								}
								else {
									room.configuration.objects.colors = room.configuration.objects.colors.filter(function(i) {
										return i !== value
									}) || []
								}
							break
					}

				// change from preset
					if (REQUEST.post.category !== "preset") {
						room.configuration.preset = "custom"
					}

				// also clear out player objects
					for (let i in room.players) {
						room.players[i].objects = {}
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = {configuration: room.configuration, players: room.players}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for all players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, room: room, recipients: [room.players[i].sessionId]})
							}
					})
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
				// permissions
					if (!player.isHost && player.id !== REQUEST.post.targetId) {
						callback({roomId: room.id, success: false, message: "not the host", recipients: [REQUEST.session.id]})
						return
					}

				// get target player
					let targetPlayer = room.players[REQUEST.post.targetId]
					if (!targetPlayer) {
						callback({roomId: room.id, success: false, message: "player not found", recipients: [REQUEST.session.id]})
						return
					}

				// change role
					if (!player.isHost && targetPlayer.role !== REQUEST.post.role) {
						callback({roomId: room.id, success: false, message: "not the host", recipients: [REQUEST.session.id]})
						return
					}

				// in progress
					if (room.status.play && targetPlayer.role !== REQUEST.post.role) {
						callback({roomId: room.id, success: false, message: "cannot change roles during a game", recipients: [REQUEST.session.id]})
						return
					}

				// invalid name
					if (!REQUEST.post.name || !CORE.isNumLet(REQUEST.post.name)) {
						callback({roomId: room.id, success: false, message: "name must be letters and numbers only", recipients: [REQUEST.session.id]})
						return
					}

					if (CONSTANTS.minimumNamePlayerLength > REQUEST.post.name.length || REQUEST.post.name.length > CONSTANTS.maximumPlayerNameLength) {
						callback({roomId: room.id, success: false, message: "name must be between " + CONSTANTS.minimumPlayerNameLength + " and " + CONSTANTS.maximumPlayerNameLength + " characters", recipients: [REQUEST.session.id]})
						return
					}

				// invalid role
					if (!CONSTANTS.roles.includes(REQUEST.post.role)) {
						callback({roomId: room.id, success: false, message: "invalid role", recipients: [REQUEST.session.id]})
						return	
					}

				// update player
					room.players[targetPlayer.id].name = REQUEST.post.name
					room.players[targetPlayer.id].role = REQUEST.post.role

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = {players: room.players}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for all players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, room: room, recipients: [room.players[i].sessionId]})
							}
					})
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
				// game over
					if (!room.status.play || (room.configuration.timer.active && !room.status.timeRemaining) || room.status.endTime) {
						callback({roomId: room.id, success: false, message: "game ended", recipients: [REQUEST.session.id]})
						return
					}

				// update time
					let timeUpdated = false
					if (room.configuration.timer.active) {
						room.status.timeRemaining = Math.round((room.status.startTime + (room.configuration.timer.seconds * CONSTANTS.second) - new Date().getTime()) / CONSTANTS.second)
						if (room.status.timeRemaining <= 0) {
							endGame(REQUEST, room, null, callback)
							return
						}
						timeUpdated = true
					}

				// permissions
					if (!player.role == "actor") {
						callback({roomId: room.id, success: false, message: "not an actor", recipients: [REQUEST.session.id]})
						return
					}

				// invalid object
					if (!REQUEST.post.objectId || !player.objects[REQUEST.post.objectId]) {
						callback({roomId: room.id, success: false, message: "object not found", recipients: [REQUEST.session.id]})
						return
					}

				// move object
					player.objects[REQUEST.post.objectId].position.x = REQUEST.post.x == null ? null : Math.round(REQUEST.post.x)
					player.objects[REQUEST.post.objectId].position.y = REQUEST.post.y == null ? null : Math.round(REQUEST.post.y)

				// check for victory
					if (isVictory(room, player)) {
						endGame(REQUEST, room, null, function(data) {
							data.message = player.name + " successfully arranged the objects"
							callback(data)
						})
						return
					}

				// update player & time
					room.players[player.id] = player

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = {players: room.players}
					if (timeUpdated) {
						query.document.status = room.status
					}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for all players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, room: room, recipients: [room.players[i].sessionId]})
							}
					})
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
				// permissions
					if (!player.isHost) {
						callback({roomId: room.id, success: false, message: "not the host", recipients: [REQUEST.session.id]})
						return
					}

				// already started
					if (room.status.startTime) {
						callback({roomId: room.id, success: false, message: "game already started", recipients: [REQUEST.session.id]})
						return
					}

				// no actors
					let theseRoles = {}
					for (let i in room.players) {
						let role = room.players[i].role
						if (!theseRoles[role]) {
							theseRoles[role] = 1
						}
						else {
							theseRoles[role]++
						}
					}					

					if (!theseRoles.actor) {
						callback({roomId: room.id, success: false, message: "at least 1 actor required", recipients: [REQUEST.session.id]})
						return
					}

					if (!theseRoles.speaker) {
						callback({roomId: room.id, success: false, message: "at least 1 speaker required", recipients: [REQUEST.session.id]})
						return
					}

				// generate board
					let generatedRoom = generateBoard(room) || false

				// unable
					if (!generatedRoom) {
						callback({roomId: room.id, success: false, message: "unable to fit all the objects on the board", recipients: [REQUEST.session.id]})
						return
					}

				// set status
					room = generatedRoom
					room.status.startTime = new Date().getTime()
					room.status.endTime = null
					room.status.timeRemaining = room.configuration.timer.active ? room.configuration.timer.seconds : null
					room.status.play = true

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = room

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for all players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, message: "game started! your role: " + room.players[i].role, room: room, launch: true, recipients: [room.players[i].sessionId]})
							}
					})
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
				// permissions
					if (player && !player.isHost) {
						callback({roomId: room.id, success: false, message: "not the host", recipients: [REQUEST.session.id]})
						return
					}

				// timeout?
					let message = "the game has ended"
					if (room.configuration.timer.active) {
						room.status.timeRemaining = Math.round((room.status.startTime + (room.configuration.timer.seconds * CONSTANTS.second) - new Date().getTime()) / CONSTANTS.second)
						if (room.status.timeRemaining <= 0) {
							room.status.timeRemaining = 0
							message = "time's up!"
						}
					}

				// set status
					room.status.startTime = null
					room.status.endTime = new Date().getTime()
					room.status.play = false

				// activate grid
					room.configuration.board.grid = true
					room.configuration.board.coordinates = true
					room.configuration.preset = "custom"

				// set roles
					for (let i in room.players) {
						room.players[i].role = "spectator"
					}

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = room

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for all players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, message: message, room: room, recipients: [room.players[i].sessionId]})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* leaveRoom */
		module.exports.leaveRoom = leaveRoom
		function leaveRoom(REQUEST, room, player, callback) {
			try {
				// host --> close room
					if (player.isHost) {
						// get session ids
							let sessionIds = []
							for (let i in room.players) {
								sessionIds.push(room.players[i].sessionId)
							}

						// update sessions
							for (let i in sessionIds) {
								// that id
									let thatSessionId = sessionIds[i]

								// make a pseudoRequest session for clearing it out
									let pseudoRequest = {
										session: {
											id: thatSessionId
										},
										cookie: {},
										updateSession: {
											playerId: null,
											roomId: null
										}
									}

								// update and callback (redirect)
									SESSION.updateOne(pseudoRequest, null, function() {
										callback({success: true, roomId: room.id, message: "the host closed the room", recipients: [thatSessionId], location: "../../../../"})
									})
							}

						// delete room
							deleteOne(REQUEST, function(results) {})
							return
					}

				// other --> remove player
					let name = player.name
					delete room.players[player.id]

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = {players: room.players}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// for this player
							callback({roomId: room.id, success: true, message: "leaving the room", playerId: null, recipients: [REQUEST.session.id], location: "../../../../"})

						// for all other players
							for (let i in room.players) {
								callback({roomId: room.id, success: true, message: name + " left the room", room: room, recipients: [room.players[i].sessionId]})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* disconnectPlayer */
		module.exports.disconnectPlayer = disconnectPlayer
		function disconnectPlayer(REQUEST, room, player, callback) {
			try {
				// update this player
					room.players[player.id].connected = false
					let name = room.players[player.id].name

				// query
					let query = CORE.getSchema("query")
						query.collection = "rooms"
						query.command = "update"
						query.filters = {id: room.id}
						query.document = {players: room.players}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.roomId = REQUEST.path[REQUEST.path.length - 1]
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// updated room
							let room = results.documents[0]

						// let players know
							for (let i in room.players) {
								callback({roomId: room.id, success: true, message: name + " disconnected", room: room, recipients: [room.players[i].sessionId]})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({roomId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

/*** tools ***/
	/* generateBoard */
		module.exports.generateBoard = generateBoard
		function generateBoard(room) {
			try {
				// generate objects
					let objects = []
					while (objects.length < room.configuration.objects.count + room.configuration.objects.unused) {
						let attempts = CONSTANTS.attempts
						let object = null
						
						do {
							object = generateObject(room.configuration)
							attempts--
						} while (hasExactCopy(object, objects) && attempts)

						if (!attempts) {
							return false
						}

						objects.push(object)
					}


				// set z
					let z = 1
					for (let i in objects) {
						objects[i].position.z = z
						z++
					}

				// target position
					let positionedCount = 0
					while (positionedCount < room.configuration.objects.count) {
						let attempts = CONSTANTS.attempts
						let object = objects[positionedCount]

						do {
							object.target.x = Math.floor(Math.random() * room.configuration.board.x)
							object.target.y = Math.floor(Math.random() * room.configuration.board.y)
							attempts--
						} while (attempts && (hangsOff(room.configuration.board, object) || (!room.configuration.objects.overlap && hasOverlap(object, objects))))

						if (!attempts) {
							return false
						}

						positionedCount++
					}


				// shuffle
					objects = CORE.sortRandom(objects)

				// turn into an object
					let objectObjects = {}
					for (let i in objects) {
						objectObjects[objects[i].id] = objects[i]
					}

				// copy for each player
					for (let i in room.players) {
						if (room.players[i].role == "spectator") {
							room.players[i].objects = {}
						}
						if (room.players[i].role == "actor") {
							room.players[i].objects = CORE.duplicateObject(objectObjects)
							continue
						}
						if (room.players[i].role == "speaker") {
							room.players[i].objects = CORE.duplicateObject(objectObjects)
							for (let j in room.players[i].objects) {
								room.players[i].objects[j].position.x = room.players[i].objects[j].target.x
								room.players[i].objects[j].position.y = room.players[i].objects[j].target.y
							}
						}
					}


				// return room
					return room
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

	/* generateObject */
		module.exports.generateObject = generateObject
		function generateObject(configuration) {
			try {
				// shell
					let object = CORE.getSchema("object")

				// size
					object.size = CONFIGURATIONS.objects.sizes[CORE.chooseRandom(configuration.objects.sizes)]

				// shape
					object.shape = CORE.chooseRandom(configuration.objects.shapes)

				// color
					object.color = CORE.chooseRandom(configuration.objects.colors)

				// border
					if (configuration.objects.borders && Math.random() < CONSTANTS.borderProbability) {
						object.border = CORE.chooseRandom(configuration.objects.colors)
					}

				// label
					if (configuration.objects.labels && Math.random() < CONSTANTS.labelProbability) {
						object.label = CORE.generateRandom(null, 1)
					}

				// return
					return object
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

	/* hasExactCopy */
		module.exports.hasExactCopy = hasExactCopy
		function hasExactCopy(object, objects) {
			try {
				// loop through objects
					for (let i in objects) {
						if (objects[i].size.x      !== object.size.x)      { continue }
						if (objects[i].size.y      !== object.size.y)      { continue }
						if (objects[i].shape       !== object.shape)       { continue }
						if (objects[i].color       !== object.color)       { continue }
						if (objects[i].border      !== object.border)      { continue }
						if (objects[i].label       !== object.label)       { continue }

						return true
					}

				// still here
					return false
			}
			catch (error) {
				CORE.logError(error)
				return false
			}
		}

	/* hangsOff */
		module.exports.hangsOff = hangsOff
		function hangsOff(board, object) {
			try {
				// cells
					let diffX = Math.floor(object.size.x / 2)
					let diffY = Math.floor(object.size.y / 2)

					for (let x = 0; x < object.size.x; x++) {
						for (let y = 0; y < object.size.y; y++) {
							// get this cell
								let thisCellX = (object.target.x + x - diffX)
								let thisCellY = (object.target.y + y - diffY)

							// hanging off board
								if ((thisCellX < 0 || thisCellX >= board.x)
								 || (thisCellY < 0 || thisCellY >= board.y)) {
									return true
								}
						}
					}

				// still here
					return false
			}
			catch (error) {
				CORE.logError(error)
				return false
			}
		}

	/* hasOverlap */
		module.exports.hasOverlap = hasOverlap
		function hasOverlap(object, objects) {
			try {
				// cells
					let theseCells = []
					let diffX = Math.floor(object.size.x / 2)
					let diffY = Math.floor(object.size.y / 2)

					for (let x = 0; x < object.size.x; x++) {
						for (let y = 0; y < object.size.y; y++) {
							// get this cell
								let thisCellX = (object.target.x + x - diffX)
								let thisCellY = (object.target.y + y - diffY)

							// add to list of cells
								theseCells.push(thisCellX + "," + thisCellY)
						}
					}

				// loop through objects
					for (let i in objects) {
						// skip self
							if (objects[i].id == object.id) {
								continue
							}

						// check for overlapping cells
							let diffX = Math.floor(objects[i].size.x / 2)
							let diffY = Math.floor(objects[i].size.y / 2)

							for (let x = 0; x < objects[i].size.x; x++) {
								for (let y = 0; y < objects[i].size.y; y++) {
									if (theseCells.includes((objects[i].target.x + x - diffX) + "," + (objects[i].target.y + y - diffY))) {
										return true
									}
								}
							}
					}

				// still here
					return false
			}
			catch (error) {
				CORE.logError(error)
				return false
			}
		}

	/* isVictory */
		module.exports.isVictory = isVictory
		function isVictory(room, player) {
			try {
				// board size
					let boardMaxX = room.configuration.board.x
					let boardMaxY = room.configuration.board.y

				// loop through objects
					for (let i in player.objects) {
						let object = player.objects[i]

						// should be on board
							if ((object.target.x !== null && object.target.y !== null)
							 && (object.position.x !== object.target.x || object.position.y !== object.target.y)) {
								return false
							}

						// should be in drawer --> check if on board
							if (object.target.x == null && object.target.y == null) {
								if (object.position.x == null && object.position.y == null) {
									continue
								}

								let objectMinX = object.position.x - Math.floor(object.size.x / 2)
								let objectMaxX = object.position.x + Math.floor(object.size.x / 2)
								let objectMinY = object.position.y - Math.floor(object.size.y / 2)
								let objectMaxY = object.position.y + Math.floor(object.size.y / 2)
							
								if ((objectMaxX >= 0 && objectMinX <= boardMaxX)
								 && (objectMaxY >= 0 && objectMinY <= boardMaxY)) {
									return false
								}
							}
					}

				// still here
					return true
			}
			catch (error) {
				CORE.logError(error)
				return false
			}
		}
