/*** globals ***/
	/* triggers */
		const ISMOBILE = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i).test(navigator.userAgent)
		const TRIGGERS = {
			change: "change",
			click: "click",
			submit: "submit",
			mousedown: ISMOBILE ? "touchstart" : "mousedown",
			mouseup: ISMOBILE ? "touchend" : "mouseup",
			mousemove: ISMOBILE ? "touchmove" : "mousemove"
		}

		document.addEventListener("dblclick", preventDefault)
		document.addEventListener("contextmenu", preventDefault)
		function preventDefault(event) {
			event.preventDefault()
		}

	/* constants */
		const CONSTANTS = {
			alphabet: "abcdefghijklmnopqrstuvwxyz",
			translucentOpacity: 0.5,
			minimumNameLength: 3,
			maximumNameLength: 16,
			second: 1000,
			roles: ["informer", "actor", "spectator"]
		}

	/* state */
		const STATE = {
			socket: null,
			socketCheck: null,
			playerId: null,
			roomId: null,
			isHost: false,
			role: "spectator",
			cursor: {
				x: null,
				y: null
			},
			grabbed: null,
			timerLoop: null,
			room: null
		}

	/* elements */
		const ELEMENTS = {
			configuration: {
				button: document.querySelector("#configuration-button"),
				overlay: document.querySelector("#configuration-overlay"),
				room: {
					id: document.querySelector("#configuration-room-id"),
					name: document.querySelector("#configuration-room-name"),
					leave: document.querySelector("#configuration-room-leave")
				},
				players: {
					list: document.querySelector("#configuration-players-list"),
					invite: {
						link: document.querySelector("#configuration-players-invite-link"),
						name: document.querySelector("#configuration-players-invite-name"),
						email: document.querySelector("#configuration-players-invite-email"),
						mailto: document.querySelector("#configuration-players-invite-mailto")
					},
					rows: {}
				},
				game: {
					preset: document.querySelector("#configuration-game-preset"),
					timer: {
						active: document.querySelector("#configuration-game-timer-active"),
						seconds: document.querySelector("#configuration-game-timer-seconds")
					},
					board: {
						x: document.querySelector("#configuration-game-board-x"),
						y: document.querySelector("#configuration-game-board-y"),
						grid: document.querySelector("#configuration-game-board-grid"),
						coordinates: document.querySelector("#configuration-game-board-coordinates"),
						background: document.querySelector("#configuration-game-board-background")
					},
					objects: {
						count: document.querySelector("#configuration-game-objects-count"),
						unused: document.querySelector("#configuration-game-objects-unused"),
						overlap: document.querySelector("#configuration-game-objects-overlap"),
						translucent: document.querySelector("#configuration-game-objects-translucent"),
						borders: document.querySelector("#configuration-game-objects-borders"),
						labels: document.querySelector("#configuration-game-objects-labels"),
						sizes: Array.from(document.querySelectorAll("input[property='configuration-game-objects-sizes']")),
						shapes: Array.from(document.querySelectorAll("input[property='configuration-game-objects-shapes']")),
						colors: Array.from(document.querySelectorAll("input[property='configuration-game-objects-colors']"))
					},
					status: {
						current: document.querySelector("#configuration-game-status-current"),
						start: document.querySelector("#configuration-game-status-start"),
						end: document.querySelector("#configuration-game-status-end")
					}
				}
			},
			container: {
				timer: document.querySelector("#timer"),
				screensContainer: document.querySelector("#screens"),
				screens: {}
			}
		}

/*** tools ***/
	/* isNumLet */
		function isNumLet(string) {
			try {
				return (/^[a-zA-Z0-9]+$/).test(string)
			} catch (error) {console.log(error)}
		}

	/* showToast */
		window.TOASTTIME = null
		function showToast(data) {
			try {
				// clear existing countdowns
					if (window.TOASTTIME) {
						clearTimeout(window.TOASTTIME)
						window.TOASTTIME = null
					}

				// append
					if (!window.TOAST) {
						window.TOAST = document.createElement("div")
						window.TOAST.id = "toast"
						window.TOAST.setAttribute("visibility", false)
						window.TOAST.setAttribute("success", false)
						document.body.appendChild(window.TOAST)
					}

				// show
					setTimeout(function() {
						window.TOAST.innerHTML = data.message
						window.TOAST.setAttribute("success", data.success || false)
						window.TOAST.setAttribute("visibility", true)
					}, 200)

				// hide
					window.TOASTTIME = setTimeout(function() {
						window.TOAST.setAttribute("visibility", false)
					}, 5000)
			} catch (error) {console.log(error)}
		}

/*** socket ***/
	/* checkSocket */
		checkSocket()
		function checkSocket() {
			createSocket()
			STATE.socketCheck = setInterval(function() {
				try {
					if (!STATE.socket) {
						try {
							createSocket()
						}
						catch (error) {console.log(error)}
					}
					else {
						clearInterval(STATE.socketCheck)
					}
				}
				catch (error) {console.log(error)}
			}, 5000)
		}

	/* createSocket */
		function createSocket() {
			try {
				STATE.socket = new WebSocket(location.href.replace("http","ws"))
				STATE.socket.onopen = function() {
					STATE.socket.send(null)
				}
				STATE.socket.onerror = function(error) {
					showToast({success: false, message: error})
				}
				STATE.socket.onclose = function() {
					showToast({success: false, message: "disconnected"})
					STATE.socket = null
					checkSocket()
				}
				STATE.socket.onmessage = function(message) {
					try {
						let post = JSON.parse(message.data)
						if (post && (typeof post == "object")) {
							receiveSocket(post)
						}
					}
					catch (error) {console.log(error)}
				}
			}
			catch (error) {console.log(error)}
		}

	/* receiveSocket */
		function receiveSocket(data) {
			try {
				// meta
					// redirect
						if (data.location) {
							window.location = data.location
							return
						}
						
					// failure
						if (!data || !data.success) {
							showToast({success: false, message: data.message || "unknown websocket error"})
							return
						}

					// toast
						if (data.message) {
							showToast(data)
						}

				// data
					// player id
						if (data.playerId !== undefined) {
							STATE.playerId = data.playerId
						}

					// room id
						if (data.roomId !== undefined) {
							STATE.roomId = data.roomId
							ELEMENTS.configuration.room.id.value = STATE.roomId
						}

					// room data
						if (data.room) {
							STATE.isHost = data.room.players[STATE.playerId].isHost
							STATE.role = data.room.players[STATE.playerId].role
							receiveRoom(data.room)
						}
			} catch (error) {console.log(error)}
		}

/*** room ***/
	/* receiveRoom */
		function receiveRoom(room) {
			try {
				// set state
					STATE.room = room

				// room name
					displayRoomName(STATE.room.status.name)

				// players
					displayPlayers(STATE.room.players)

				// game configurations
					displayConfiguration(STATE.room.configuration)

				// game status
					displayStatus(STATE.room.status)

				// screens
					displayScreens(STATE.room.players)
			} catch (error) {console.log(error)}
		}

	/* displayRoomName */
		function displayRoomName(name) {
			try {
				// update name
					ELEMENTS.configuration.room.name.value = name
					ELEMENTS.configuration.room.name.readonly = STATE.isHost ? false : true
			} catch (error) {console.log(error)}
		}

	/* updateRoomName */
		ELEMENTS.configuration.room.name.addEventListener(TRIGGERS.change, updateRoomName)
		function updateRoomName(event) {
			try {
				// not the host
					if (!STATE.isHost) {
						showToast({success: false, message: "not the host"})
						return
					}

				// get value
					let name = ELEMENTS.configuration.room.name.value.trim() || ""
					if (!name || !name.length || !isNumLet(name.replace(/\s/g, "")) || CONSTANTS.minimumNameLength > name.length || name.length > CONSTANTS.maximumNameLength) {
						showToast({success: false, message: "room name must be " + CONSTANTS.minimumNameLength + " - " + CONSTANTS.maximumNameLength + " letters, numbers, and spaces only"})
						return
					}

				// update
					STATE.socket.send({
						action: "updateRoom",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						name: name
					})
			} catch (error) {console.log(error)}
		}

	/* leaveRoom */
		ELEMENTS.configuration.room.leave.addEventListener(TRIGGERS.click, leaveRoom)
		function leaveRoom(event) {
			try {
				// prompt
					let confirmed = window.prompt(STATE.isHost ? "Are you sure you want to close the room?" : "Are you sure you want to leave?")

				// cancel
					if (!confirmed) {
						return
					}

				// send command to server
					STATE.socket.send({
						action: "leaveRoom",
						playerId: STATE.playerId,
						roomId: STATE.roomId
					})
			} catch (error) {console.log(error)}
		}

/*** players ***/
	/* displayPlayers */
		function displayPlayers(players) {
			try {
				// get ids
					let ids = Object.keys(players)

				// get existing players
					for (let i in ELEMENTS.configuration.players.rows) {
						// no longer present
							if (!ids.includes(i)) {
								ELEMENTS.configuration.players.rows[i].remove()
								delete ELEMENTS.configuration.players.rows[i]
							}

						// update
							displayPlayer(ELEMENTS.configuration.players.rows[i], players[i])
							ids = ids.splice(ids.indexOf(i), 1)
					}

				// remaining ids
					for (let i in ids) {
						createPlayer(players[ids[i]])
					}
			} catch (error) {console.log(error)}
		}

	/* displayPlayer */
		function displayPlayer(element, player) {
			try {
				// name
					let nameInput = element.querySelector(".player-name")
						nameInput.value = player.name

				// role
					let roleSelect = element.querySelector(".player-role")
						roleSelect.value = player.role
						if (!STATE.isHost) {
							roleSelect.setAttribute("readonly", true)
						}
						else {
							roleSelect.removeAttribute("readonly")
						}
			} catch (error) {console.log(error)}
		}

	/* createPlayer */
		function createPlayer(player) {
			try {
				// element
					let element = document.createElement("div")
						element.id = "player-" + player.id
						element.className = "player-row"
					ELEMENTS.configuration.players.rows[player.id] = element
					ELEMENTS.configuration.players.list.appendChild(element)

				// name
					let nameInput = document.createElement("input")
						nameInput.className = "player-name"
						nameInput.type = "text"
						nameInput.value = player.name
						nameInput.placeholder = "name"
						nameInput.addEventListener(TRIGGERS.change, updatePlayer)
					element.appendChild(nameInput)

				// role
					let roleSelect = document.createElement("select")
						roleSelect.className = "player-role"
						roleSelect.addEventListener(TRIGGERS.change, updatePlayer)
					element.appendChild(roleSelect)

						for (let i in CONSTANTS.roles) {
							let option = document.createElement("option")
								option.value = option.innerText = CONSTANTS.roles[i]
							roleSelect.appendChild(option)
						}

					roleSelect.value = player.role

					if (!STATE.isHost) {
						roleSelect.setAttribute("readonly", true)
					}
					else {
						roleSelect.removeAttribute("readonly")
					}
			} catch (error) {console.log(error)}
		}

	/* updatePlayer */
		function updatePlayer(event) {
			try {
				// get player
					let player = event.target.closest(".player-row")
					let id = player.id.split("-")
						id = id[id.length - 1]

				// not that player
					if (!STATE.isHost && STATE.playerId !== id) {
						showToast({success: false, message: "not your name"})
						return
					}

				// role (not host)
					if (event.target.className.includes("player-role") && !STATE.isHost) {
						showToast({success: false, message: "not the host"})
						return
					}

					let name = player.querySelector(".player-name").value.trim() || null
					let role = player.querySelector(".player-role").value || null

				// invalid name
					if (!name || !name.length || !isNumLet(name) || CONSTANTS.minimumNameLength > name.length || name.length > CONSTANTS.maximumNameLength) {
						showToast({success: false, message: "name must be " + CONSTANTS.minimumNameLength + " - " + CONSTANTS.maximumNameLength + " letters & numbers only"})
						return
					}

				// send command to server
					STATE.socket.send({
						action: "updatePlayer",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						targetId: id,
						name: name,
						role: role
					})
			} catch (error) {console.log(error)}
		}

/*** invite ***/
	/* updateInvite */
		ELEMENTS.configuration.players.invite.name.addEventListener(TRIGGERS.change, updateInvite)
		ELEMENTS.configuration.players.invite.email.addEventListener(TRIGGERS.change, updateInvite)
		function updateInvite(event) {
			try {
				// get name
					let name = ELEMENTS.configuration.players.invite.name.value.trim() || "anonymous"
					let email = ELEMENTS.configuration.players.invite.email.value.trim() || null

				// invalid name
					if (!name || !name.length || !isNumLet(name) || CONSTANTS.minimumNameLength > name.length || name.length > CONSTANTS.maximumNameLength) {
						ELEMENTS.configuration.players.invite.mailto.setAttribute("disabled", true)
						ELEMENTS.configuration.players.invite.link.setAttribute("disabled", true)
						return
					}
					ELEMENTS.configuration.players.invite.link.removeAttribute("disabled")

				// no email
					if (!email || !email.length) {
						ELEMENTS.configuration.players.invite.mailto.setAttribute("disabled", true)
						return
					}

				// update invite mailto
					let url = window.location.protocol + "//" + window.location.host + "?roomid=" + STATE.roomId + "&name=" + name
					ELEMENTS.configuration.players.invite.mailto.href = "mailto:" + email + "&subject=Invite&body=Join the Game!" + encodeURIComponent(url)
					ELEMENTS.configuration.players.invite.mailto.removeAttribute("disabled")
			} catch (error) {console.log(error)}
		}

	/* copyInviteLink */
		ELEMENTS.configuration.players.invite.link.addEventListener(TRIGGERS.click, copyInviteLink)
		function copyInviteLink(event) {
			try {
				// get player name and id
					let name = ELEMENTS.configuration.players.invite.name.value.trim() || "anonymous"

				// create link
					let url = window.location.protocol + "//" + window.location.host + "?roomid=" + STATE.roomId + "&name=" + name
					navigator.clipboard.writeText(url)

				// toast
					showToast({success: true, message: "link copied to clipboard"})

				// clear
					ELEMENTS.configuration.players.invite.name.value = ""
					ELEMENTS.configuration.players.invite.email.value = ""
					ELEMENTS.configuration.players.invite.mailto.href = "#"
			} catch (error) {console.log(error)}
		}

	/* clickInviteEmail */
		ELEMENTS.configuration.players.invite.mailto.addEventListener(TRIGGERS.click, clickInviteEmail)
		function clickInviteEmail(event) {
			try {
				// disable
					ELEMENTS.configuration.players.invite.link.setAttribute("disabled", true)
					ELEMENTS.configuration.players.invite.mailto.setAttribute("disabled", true)

				// clear
					ELEMENTS.configuration.players.invite.name.value = ""
					ELEMENTS.configuration.players.invite.email.value = ""
					ELEMENTS.configuration.players.invite.mailto.href = "#"
			} catch (error) {console.log(error)}
		}

/*** configuration ***/
	/* displayConfiguration */
		function displayConfiguration(configuration) {
			try {
				// preset
					ELEMENTS.configuration.game.preset.value = configuration.preset || "custom"

				// timer
					ELEMENTS.configuration.game.timer.active.checked = configuration.timer.active || false
					ELEMENTS.configuration.game.timer.seconds.value = Number(configuration.timer.seconds) || 0

				// board
					ELEMENTS.configuration.game.board.x.value = Number(configuration.board.x) || 2
					ELEMENTS.configuration.game.board.y.value = Number(configuration.board.y) || 2
					ELEMENTS.configuration.game.board.grid.checked = configuration.board.grid || false
					ELEMENTS.configuration.game.board.coordinates.checked = configuration.board.coordinates || false
					ELEMENTS.configuration.game.board.background.value = configuration.board.background.name || "none"

				// objects
					ELEMENTS.configuration.game.objects.count = Number(configuration.objects.count) || 1
					ELEMENTS.configuration.game.objects.unused = Number(configuration.objects.unused) || 0
					ELEMENTS.configuration.game.objects.overlap.checked = configuration.objects.overlap || false
					ELEMENTS.configuration.game.objects.translucent.checked = configuration.objects.translucent || false
					ELEMENTS.configuration.game.objects.borders.checked = configuration.objects.borders || false
					ELEMENTS.configuration.game.objects.labels.checked = configuration.objects.labels || false

				// sizes
					for (let i in ELEMENTS.configuration.game.objects.sizes) {
						let element = ELEMENTS.configuration.game.objects.sizes[i]
						let value = element.id.split("-")
							value = value[value.length - 1]
						element.checked = configuration.objects.sizes.includes(value) || false
					}

				// shapes
					for (let i in ELEMENTS.configuration.game.objects.shapes) {
						let element = ELEMENTS.configuration.game.objects.shapes[i]
						let value = element.id.split("-")
							value = value[value.length - 1].replace(/_/g, " ")
						element.checked = configuration.objects.shapes.includes(value) || false
					}

				// colors
					for (let i in ELEMENTS.configuration.game.objects.colors) {
						let element = ELEMENTS.configuration.game.objects.colors[i]
						let value = element.id.split("-")
							value = value[value.length - 1].replace(/_/g, "-")
						element.checked = configuration.objects.colors.includes(value) || false
					}
			} catch (error) {console.log(error)}
		}

	/* updateConfiguration */
		Array.from(document.querySelectorAll("[configuration='true']")).forEach(function(element) {
			element.addEventListener(TRIGGERS.change, updateConfiguration)
		})
		function updateConfiguration(event) {
			try {
				// not the host
					if (!STATE.isHost) {
						showToast({success: false, message: "not the host"})
						return
					}

				// get input
					let id = event.target.id.split("-")
					let property = event.target.getAttribute("property") || null

				// get configuration
					let category = null
					let configuration = null
					let value = null
					let include = null
				
				// array fields
					if (property) {
						category = property.split("-")[0]
						configuration = property.split("-")[1]
						value = id[id.length - 1]
						include = event.target.checked || false
					}

				// all others
					else {
						category = id[2]
						configuration = id[3]
						
						if (event.target.type == "checkbox") {
							value = event.target.checked || false
						}
						else if (event.target.type == "number") {
							value = Number(event.target.value)
						}
						else {
							value = event.target.value
						}
					}

				// preset
					if (category == "preset") {
						if (value == "custom") {
							return
						}
					}

				// send configuration
					STATE.socket.send({
						action: "updateConfiguration",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						category: category,
						configuration: configuration,
						value: value,
						include: include
					})
			} catch (error) {console.log(error)}
		}

	/* displayStatus */
		function displayStatus(status) {
			try {
				// status
					if (status.play) {
						ELEMENTS.configuration.game.status.current.value = "in play"
						ELEMENTS.configuration.game.status.start.setAttribute("visibility", false)
						ELEMENTS.configuration.game.status.end.setAttribute("visibility", true)
					}
					else {
						ELEMENTS.configuration.game.status.current.value = "..."
						ELEMENTS.configuration.game.status.start.setAttribute("visibility", true)
						ELEMENTS.configuration.game.status.end.setAttribute("visibility", false)
					}

				// timer
					if (status.timeRemaining !== null) {
						clearInterval(STATE.timerLoop)
						ELEMENTS.container.timer.innerText = Math.floor(status.timeRemaining / 60) + ":" + ("0" + String(status.timeRemaining % 60)).slice(-2)
						ELEMENTS.container.timer.setAttribute("visibility", true)
						STATE.timerLoop = setInterval(updateTimer, CONSTANTS.second)
					}
					else {
						ELEMENTS.container.timer.setAttribute("visibility", false)
						clearInterval(STATE.timerLoop)
					}
			} catch (error) {console.log(error)}
		}

	/* updateTimer */
		function updateTimer() {
			try {
				// no timer?
					if (!STATE.room || !STATE.room.status.play || !STATE.room.status.timeRemaining || !STATE.room.configuration.timer.active) {
						ELEMENTS.container.timer.setAttribute("visibility", false)
						clearInterval(STATE.timerLoop)
						return
					}

				// get time
					let time = ELEMENTS.container.timer.innerText || ""
						time = time.split(":")
					let minutes = Number(time[0])
					let seconds = Number(time[1])
					let totalTime = minutes * 60 + seconds
						totalTime = Math.ceil(0, totalTime - 1)

				// set time
					ELEMENTS.container.timer.innerText = Math.floor(totalTime / 60) + ":" + ("0" + String(totalTime % 60)).slice(-2)
			} catch (error) {console.log(error)}
		}

	/* startGame */
		ELEMENTS.configuration.game.status.start.addEventListener(TRIGGERS.click, startGame)
		function startGame(event) {
			try {
				// not the host
					if (!STATE.isHost) {
						showToast({success: false, message: "not the host"})
						return
					}

				// send command to server
					STATE.socket.send({
						action: "startGame",
						playerId: STATE.playerId,
						roomId: STATE.roomId
					})
			} catch (error) {console.log(error)}
		}

	/* endGame */
		ELEMENTS.configuration.game.status.end.addEventListener(TRIGGERS.click, endGame)
		function endGame(event) {
			try {
				// not the host
					if (!STATE.isHost) {
						showToast({success: false, message: "not the host"})
						return
					}

				// send command to server
					STATE.socket.send({
						action: "endGame",
						playerId: STATE.playerId,
						roomId: STATE.roomId
					})
			} catch (error) {console.log(error)}
		}

/*** screens ***/
	/* displayScreens */
		function displayScreens(players) {
			try {
				// spectator
					if (STATE.role == "spectator") {
						for (let i in ELEMENTS.container.screens) {
							if (!STATE.room.players[i]) {
								ELEMENTS.container.screens[i].remove()
								delete ELEMENTS.container.screens[i]
							}
						}

						for (let i in STATE.room.players) {
							displayScreen(STATE.room.configuration, STATE.room.players[i])
						}
					}

				// informer / actor
					else {
						for (let i in ELEMENTS.container.screens) {
							if (i !== STATE.playerId) {
								ELEMENTS.container.screens[i].remove()
								delete ELEMENTS.container.screens[i]
							}
						}

						displayScreen(STATE.room.configuration, STATE.room.players[STATE.playerId])
					}
			} catch (error) {console.log(error)}
		}

	/* displayScreen */
		function displayScreen(configuration, player) {
			try {
				// spectator --> no screen
					if (player.role == "spectator") {
						return
					}

				// no screen yet
					let screen = ELEMENTS.container.screens[player.id] || createScreen(player.id)

				// name + role + active
					screen.querySelector(".screen-name").value = player.name || ""
					screen.querySelector(".screen-role").value = player.role || ""
					screen.querySelector(".screen-connected").checked = player.connected || false

				// background
					screen.querySelector(".board").style.background = configuration.grid.background.value

				// grid
					if (configuration.board.grid) {
						let count = configuration.board.x * configuration.board.y
						if (Array.from(screen.querySelector(".grid-cell")).length !== count) {
							displayGrid(screen.querySelector(".board-grid"), configuration.board.x, configuration.board.y)
						}
					}
					else {
						screen.querySelector(".board-grid").innerHTML = ""
					}

				// coordinates
					if (configuration.board.coordinates) {
						let count = configuration.coordinates.x + configuration.coordinates.y
						if (Array.from(screen.querySelector(".coordinate")).length !== count) {
							displayCoordinates(screen.querySelector(".board-coordinates"), configuration.board.x, configuration.board.y)
						}
					}
					else {
						screen.querySelector(".board-coordinates").innerHTML = ""	
					}

				// display objects
					displayObjects(screen, player.objects)
			} catch (error) {console.log(error)}
		}

	/* createScreen */
		function createScreen(playerId) {
			try {
				// create screen
					let screen = document.createElement("div")
						screen.id = "screen-" + playerId
						screen.className = "screen"
					ELEMENTS.container.screensContainer.appendChild(screen)
					ELEMENTS.container.screens[playerId] = screen

				// board
					let board = document.createElement("div")
						board.className = "board"
					screen.appendChild(board)

				// name
					let name = document.createElement("output")
						name.className = "screen-name"
					board.appendChild(name)

				// role
					let role = document.createElement("output")
						role.className = "screen-role"
					board.appendChild(role)

				// connected
					let connected = document.createElement("input")
						connected.type = "checkbox"
						connected.readonly = true
						connected.className = "screen-connected"
					board.appendChild(connected)

				// grid
					let grid = document.createElement("div")
						grid.className = "board-grid"
					board.appendChild(grid)

				// coordinates
					let coordinates = document.createElement("div")
						coordinates.className = "board-coordinates"
					board.appendChild(coordinates)

				// objects
					screen.objectElements = {}

				// return
					return screen
			} catch (error) {console.log(error)}
		}

	/* displayGrid */
		function displayGrid(container, x, y) {
			try {
				// clear out
					container.innerHTML = ""

				// loop through
					for (let column = 0; column < x; column++) {
						for (let row = 0; row < y; row++) {
							let element = document.createElement("div")
								element.className = "grid-cell"
								element.id = "grid-cell-" + x + "," + y
							container.appendChild(element)
						}
					}
			} catch (error) {console.log(error)}
		}

	/* displayCoordinates */
		function displayCoordinates(container, x, y) {
			try {
				// clear out
					container.innerHTML = ""

				// across the top
					for (let column = 0; column < x; column++) {
						let element = document.createElement("div")
							element.className = "coordinate coordinate-x"
							element.innerText = column + 1
						container.appendChild(element)
					}

				// down the side
					for (let row = 0; row < y; row++) {
						let element = document.createElement("div")
							element.className = "coordinate coordinate-y"
							element.innerText = CONSTANTS.alphabet[row]
						container.appendChild(element)
					}
			} catch (error) {console.log(error)}
		}

/*** objects ***/
	/* displayObjects */
		function displayObjects(screen, objects) {
			try {
				// get ids
					let ids = Object.keys(objects)

				// get existing objects
					for (let i in screen.objectElements) {
						// no longer present
							if (!ids.includes(i)) {
								screen.objectElements[i].remove()
								delete screen.objectElements[i]
							}

						// update
							displayObject(screen, screen.objectElements[i], objects[i])
							ids = ids.splice(ids.indexOf(i), 1)
					}

				// remaining ids
					for (let i in ids) {
						let element = createObject(screen, objects[i])
						displayObject(screen, element, objects[i])
					}
			} catch (error) {console.log(error)}
		}

	/* displayObject */
		function displayObject(screen, element, object) {
			try {
				// active
					if (STATE.grabbed && STATE.grabbed.id == screen.id + "-object-" + object.id) {
						return
					}

				// in drawer
					if (object.position.x === null || object.position.y === null) {
						screen.querySelector(".drawer").appendChild(element)
						return
					}

				// not in drawer
					screen.querySelector(".board").appendChild(element)
					element.style.left = "calc(var(--cell-size) * " + object.position.x + ")"
					element.style.top  = "calc(var(--cell-size) * " + object.position.y + ")"
			} catch (error) {console.log(error)}
		}

	/* createObject */
		function createObject(screen, object) {
			try {
				// create
					let element = document.createElement("div")
						element.className = "object"
						element.id = screen.id + "-object-" + object.id
						element.style.width  = "calc(var(--cell-size) * " + object.size.x + ")"
						element.style.height = "calc(var(--cell-size) * " + object.size.y + ")"
						element.style.clipPath = object.shape
						element.style.background = object.border ? object.border : object.color
						element.style.zIndex = object.position.z
						element.addEventListener(TRIGGERS.mousedown, grabObject)
					screen.objectElements[object.id] = object
					screen.querySelector(".drawer").appendChild(element)

				// translucent
					if (object.translucent) {
						element.style.opacity = CONSTANTS.translucentOpacity
					}

				// border
					let inner = null
					if (object.border) {
						inner = document.createElement("div")
						inner.className = "object-inner"
						inner.style.clipPath = object.shape
						inner.style.background = object.color
						element.appendChild(inner)
					}

				// label
					if (object.label) {
						let label = document.createElement("div")
							label.className = "object-label"
							label.innerText = object.label
						if (inner) {
							inner.appendChild(label)
						}
						else {
							element.appendChild(label)
						}
					}

				// return element
					return element
			} catch (error) {console.log(error)}
		}

	/* grabObject */
		function grabObject(event) {
			try {
				// get screen
					let screen = event.target.closest(".screen")

				// not an actor
					if (STATE.role !== "actor") {
						screen.removeAttribute("grabbing")
						showToast({success: false, message: "not an actor"})
						return
					}

				// not in play
					if (!STATE.room.status.play) {
						screen.removeAttribute("grabbing")
						return
					}

				// grab
					STATE.grabbed = event.target.closest(".object")
					screen.setAttribute("grabbing", true)

				// move to board
					screen.querySelector(".board").appendChild(STATE.grabbed)

				// trigger move
					moveObject(event)
			} catch (error) {console.log(error)}
		}

	/* moveObject */
		window.addEventListener(TRIGGERS.mousemove, moveObject)
		function moveObject(event) {
			try {
				// not a player
					if (STATE.role !== "actor") {
						if (ELEMENTS.container.screens[STATE.playerId]) {
							ELEMENTS.container.screens[STATE.playerId].removeAttribute("grabbing")
						}
						return
					}

				// not in play
					if (!STATE.room.status.play) {
						if (ELEMENTS.container.screens[STATE.playerId]) {
							ELEMENTS.container.screens[STATE.playerId].removeAttribute("grabbing")
						}
						return
					}

				// nothing grabbed
					if (!STATE.grabbed) {
						if (ELEMENTS.container.screens[STATE.playerId]) {
							ELEMENTS.container.screens[STATE.playerId].removeAttribute("grabbing")
						}
						return
					}

				// screen
					let screen = STATE.grabbed.closest(".screen")

				// cursor
					let x = event.touches ? event.touches[0].clientX : event.clientX
					let y = event.touches ? event.touches[0].clientY : event.clientY

					let boardRect = screen.querySelector(".board").getBoundingClientRect()
					CURSOR.x = (x - boardRect.left) / boardRect.width  * STATE.room.configuration.board.x
					CURSOR.y = (y - boardRect.top ) / boardRect.height * STATE.room.configuration.board.y

				// move element
					STATE.grabbed.style.left = "calc(var(--cell-size) * " + CURSOR.x + ")"
					STATE.grabbed.style.top  = "calc(var(--cell-size) * " + CURSOR.y + ")"
			} catch (error) {console.log(error)}
		}

	/* dropObject */
		window.addEventListener(TRIGGERS.mouseup, dropObject)
		function dropObject(event) {
			try {
				// not an actor
					if (STATE.role !== "actor") {
						if (ELEMENTS.container.screens[STATE.playerId]) {
							ELEMENTS.container.screens[STATE.playerId].removeAttribute("grabbing")
						}
						return
					}

				// not in play
					if (!STATE.room.status.play) {
						if (ELEMENTS.container.screens[STATE.playerId]) {
							ELEMENTS.container.screens[STATE.playerId].removeAttribute("grabbing")
						}
						return
					}

				// nothing grabbed
					if (!STATE.grabbed) {
						if (ELEMENTS.container.screens[STATE.playerId]) {
							ELEMENTS.container.screens[STATE.playerId].removeAttribute("grabbing")
						}
						return
					}

				// screen
					let screen = STATE.grabbed.closest(".screen")

				// get position
					let x = event.touches ? event.touches[0].clientX : event.clientX
					let y = event.touches ? event.touches[0].clientY : event.clientY

				// in drawer
					let drawer = screen.querySelector(".drawer")
					let drawerRect = drawer.getBoundingClientRect()

					if ((drawerRect.left <= x && x <= drawerRect.right)
					 && (drawerRect.top  <= y && y <= drawerRect.bottom)) {
						CURSOR.x = null
						CURSOR.y = null

						drawer.appendChild(STATE.grabbed)
						STATE.grabbed.style.left = "0"
						STATE.grabbed.style.top = "0"
					}

				// snap to grid
					else {
						let boardRect = screen.querySelector(".board").getBoundingClientRect()
						CURSOR.x = Math.round((x - boardRect.left) / boardRect.width  * STATE.room.configuration.board.x)
						CURSOR.y = Math.round((y - boardRect.top ) / boardRect.height * STATE.room.configuration.board.y)

						STATE.grabbed.style.left = "calc(var(--cell-size) * " + CURSOR.x + ")"
						STATE.grabbed.style.top  = "calc(var(--cell-size) * " + CURSOR.y + ")"
					}

				// send to server
					STATE.socket.send({
						action: "updateObject",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						objectId: STATE.grabbed.id,
						x: CURSOR.x,
						y: CURSOR.y
					})

				// ungrab
					STATE.grabbed = null
					screen.removeAttribute("grabbing")
			} catch (error) {console.log(error)}
		}
