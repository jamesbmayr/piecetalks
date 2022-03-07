/*** globals ***/
	/* triggers */
		const TRIGGERS = {
			change: "change",
			click: "click",
			submit: "submit"
		}

		setTriggers()
		function setTriggers(override) {
			try {
				// get mobile right now
					let ISMOBILE = override || (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i).test(navigator.userAgent)
					TRIGGERS.mousedown = ISMOBILE ? "touchstart" : "mousedown"
					TRIGGERS.mouseup   = ISMOBILE ? "touchend" : "mouseup"
					TRIGGERS.mousemove = ISMOBILE ? "touchmove" : "mousemove"

				// listen for move/drop
					window.addEventListener(TRIGGERS.mousemove, moveObject)
					window.addEventListener(TRIGGERS.mouseup, dropObject)

				// override mobile later
					if (TRIGGERS.mousedown == "mousedown") {
						window.addEventListener("touchstart", setTriggers)
						return
					}
				
				// overriding --> reset listeners
					if (override) {
						window.removeEventListener("touchstart", setTriggers)
						window.removeEventListener("mousemove", moveObject)
						window.removeEventListener("mouseup", dropObject)
					}
			} catch (error) {console.log(error)}
		}

	/* double click / right-click */
		document.addEventListener("dblclick", preventDefault)
		document.addEventListener("contextmenu", preventDefault)
		function preventDefault(event) {
			event.preventDefault()
		}

	/* constants */
		const CONSTANTS = {
			boardSize: 500,
			alphabet: "abcdefghijklmnopqrstuvwxyz",
			minimumPlayerNameLength: 3,
			maximumPlayerNameLength: 20,
			second: 1000,
			roles: ["speaker", "actor", "spectator"],
			sizeWeights: {"1x1": 7, "3x3": 2, "5x5": 1},
			objectOffset: 0.5,
			attempts: 100,
			drawerExtra: 25
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
				actualX: null,
				actualY: null,
				x: null,
				y: null
			},
			grabbed: null,
			timerLoop: null,
			room: null
		}

	/* elements */
		const ELEMENTS = {
			body: document.body,
			cssVariables: {
				cells: document.querySelector("#css-variables-cells"),
				screens: document.querySelector("#css-variables-screens")
			},
			configuration: {
				element: document.querySelector("#configuration"),
				button: document.querySelector("#configuration-button"),
				overlay: document.querySelector("#configuration-overlay"),
				close: document.querySelector("#configuration-close"),
				room: {
					id: document.querySelector("#configuration-room-id"),
					leave: document.querySelector("#configuration-room-leave"),
					darkness: document.querySelector("#configuration-room-darkness")
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
				preview: {
					element: document.querySelector("#configuration-preview"),
					board: document.querySelector("#configuration-preview-board")
				},
				game: {
					preset: document.querySelector("#configuration-game-preset"),
					timer: {
						active: document.querySelector("#configuration-game-timer-active"),
						seconds: document.querySelector("#configuration-game-timer-seconds")
					},
					advanced: document.querySelector("#configuration-game-advanced"),
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
						borders: document.querySelector("#configuration-game-objects-borders"),
						labels: document.querySelector("#configuration-game-objects-labels"),
						sizes: Array.from(document.querySelectorAll("input[property='objects-sizes']")),
						shapes: Array.from(document.querySelectorAll("input[property='objects-shapes']")),
						colors: Array.from(document.querySelectorAll("input[property='objects-colors']"))
					},
					status: {
						current: document.querySelector("#configuration-game-status-current"),
						start: document.querySelector("#configuration-game-status-start"),
						end: document.querySelector("#configuration-game-status-end")
					}
				},
				backToTop: document.querySelector("#configuration-back-to-top")
			},
			container: {
				timer: document.querySelector("#timer"),
				screensContainer: document.querySelector("#screens"),
				screens: {}
			}
		}

/*** tools ***/
	/* isEmail */
		function isEmail(string) {
			try {
				return (/[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/).test(string)
			} catch (error) {console.log(error)}
		}

	/* chooseRandom */
		function chooseRandom(options) {
			try {
				if (!Array.isArray(options)) {
					return false
				}

				return options[Math.floor(Math.random() * options.length)]
			}
			catch (error) {console.log(error)}
		}

	/* hangsOff */
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
			catch (error) {console.log(error)}
		}

	/* hasOverlap */
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
			catch (error) {console.log(error)}
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
				let url = location.href.replace("http","ws")
					url = url.slice(0, url.includes("#") ? url.indexOf("#") : url.length)
				STATE.socket = new WebSocket(url)
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
				console.log(data) // ???
				debugger
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

					// launch
						if (data.launch) {
							closeConfiguration()
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

				// game status
					displayStatus(STATE.room.status)

				// players
					displayPlayers(STATE.room.status, STATE.room.players)

				// game configurations
					displayConfiguration(STATE.room.status, STATE.room.configuration)

				// screens
					displayScreens(STATE.room.players)
			} catch (error) {console.log(error)}
		}

	/* updateRoomDarkness */
		ELEMENTS.configuration.room.darkness.addEventListener(TRIGGERS.change, updateRoomDarkness)
		function updateRoomDarkness(event) {
			try {
				// not the host
					if (!STATE.isHost) {
						showToast({success: false, message: "not the host"})
						return
					}

				// get value
					let value = ELEMENTS.configuration.room.darkness.checked || false

				// update
					STATE.socket.send(JSON.stringify({
						action: "updateRoom",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						darkness: value
					}))
			} catch (error) {console.log(error)}
		}

	/* leaveRoom */
		ELEMENTS.configuration.room.leave.addEventListener(TRIGGERS.click, leaveRoom)
		function leaveRoom(event) {
			try {
				// prompt
					let confirmed = window.confirm(STATE.isHost ? "Are you sure you want to close the room?" : "Are you sure you want to leave?")

				// cancel
					if (!confirmed) {
						return
					}

				// send command to server
					STATE.socket.send(JSON.stringify({
						action: "leaveRoom",
						playerId: STATE.playerId,
						roomId: STATE.roomId
					}))
			} catch (error) {console.log(error)}
		}

/*** status ***/
	/* displayStatus */
		function displayStatus(status) {
			try {
				// darkness
					if (status.darkness) {
						ELEMENTS.body.setAttribute("darkness", true)
					}
					else {
						ELEMENTS.body.removeAttribute("darkness")
					}

				// darkness
					if (document.activeElement !== ELEMENTS.configuration.room.darkness) {
						ELEMENTS.configuration.room.darkness.checked = status.darkness
					}

				// status
					if (status.play) {
						ELEMENTS.configuration.game.status.current.value = "in play"
						ELEMENTS.configuration.game.status.start.setAttribute("visibility", false)
						ELEMENTS.configuration.game.status.end.setAttribute("visibility", true)
					}
					else {
						ELEMENTS.configuration.game.status.current.value = "setup"
						ELEMENTS.configuration.game.status.start.setAttribute("visibility", true)
						ELEMENTS.configuration.game.status.end.setAttribute("visibility", false)
					}

				// host
					if (STATE.isHost) {
						if (status.play) {
							ELEMENTS.configuration.game.status.end.removeAttribute("disabled")
							ELEMENTS.configuration.game.status.start.setAttribute("disabled", true)
						}
						else {
							ELEMENTS.configuration.game.status.start.removeAttribute("disabled")
							ELEMENTS.configuration.game.status.end.setAttribute("disabled", true)
						}
						ELEMENTS.configuration.room.darkness.removeAttribute("disabled")
					}
					else {
						ELEMENTS.configuration.game.status.start.setAttribute("disabled", true)
						ELEMENTS.configuration.game.status.end.setAttribute("disabled", true)
						ELEMENTS.configuration.room.darkness.setAttribute("disabled", true)
					}

				// timer
					if (status.play && status.timeRemaining !== null) {
						clearInterval(STATE.timerLoop)
						let timeRemaining = Math.max(0, status.timeRemaining)
						ELEMENTS.container.timer.innerText = Math.floor(timeRemaining / 60) + ":" + ("0" + String(timeRemaining % 60)).slice(-2)
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

				// over
					if (totalTime <= 0 && STATE.isHost) {
						STATE.socket.send(JSON.stringify({
							action: "endGame",
							playerId: STATE.playerId,
							roomId: STATE.roomId
						}))
						return
					}

				// set time
					totalTime = Math.max(0, totalTime - 1)
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
					STATE.socket.send(JSON.stringify({
						action: "startGame",
						playerId: STATE.playerId,
						roomId: STATE.roomId
					}))
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
					STATE.socket.send(JSON.stringify({
						action: "endGame",
						playerId: STATE.playerId,
						roomId: STATE.roomId
					}))
			} catch (error) {console.log(error)}
		}

/*** players ***/
	/* displayPlayers */
		function displayPlayers(status, players) {
			try {
				// get ids
					let ids = Object.keys(players)

				// get existing players
					for (let i in ELEMENTS.configuration.players.rows) {
						// no longer present
							if (!ids.includes(i)) {
								ELEMENTS.configuration.players.rows[i].remove()
								delete ELEMENTS.configuration.players.rows[i]
								continue
							}

						// update
							displayPlayer(status, ELEMENTS.configuration.players.rows[i], players[i])
							ids = ids.filter(function(j) { return j !== i })
					}

				// remaining ids
					for (let i in ids) {
						let playerElement = createPlayer(players[ids[i]])
						displayPlayer(status, playerElement, players[ids[i]])
					}
			} catch (error) {console.log(error)}
		}

	/* displayPlayer */
		function displayPlayer(status, element, player) {
			try {
				// name
					let nameInput = element.querySelector(".player-name")
					if (document.activeElement !== nameInput) {
						nameInput.value = player.name
					}

				// role
					let roleSelect = element.querySelector(".player-role")
					if (document.activeElement !== roleSelect) {
						roleSelect.value = player.role
					}

				// permissions
					if (STATE.isHost || player.id == STATE.playerId) {
						nameInput.removeAttribute("disabled")
					}
					else {
						nameInput.setAttribute("disabled", true)
					}

					if (STATE.isHost && !status.play) {
						roleSelect.removeAttribute("disabled")
					}
					else {
						roleSelect.setAttribute("disabled", true)
					}
			} catch (error) {console.log(error)}
		}

	/* createPlayer */
		function createPlayer(player) {
			try {
				// element
					let element = document.createElement("div")
						element.id = "player-" + player.id
						element.className = "player-row form-row"
					ELEMENTS.configuration.players.rows[player.id] = element
					ELEMENTS.configuration.players.list.appendChild(element)

				// label
					let label = document.createElement("label")
					element.appendChild(label)

					let span = document.createElement("span")
						span.innerText = "name"
					label.appendChild(span)

				// name
					let nameInput = document.createElement("input")
						nameInput.className = "player-name"
						nameInput.type = "text"
						nameInput.placeholder = "name"
						nameInput.autocomplete = "off"
						nameInput.spellcheck = false
						nameInput.title = "player name input"
						nameInput.addEventListener(TRIGGERS.change, updatePlayer)
					label.appendChild(nameInput)

				// role
					let roleSelect = document.createElement("select")
						roleSelect.className = "player-role"
						roleSelect.addEventListener(TRIGGERS.change, updatePlayer)
						roleSelect.title = "player role selection"
					label.appendChild(roleSelect)

					for (let i in CONSTANTS.roles) {
						let option = document.createElement("option")
							option.value = option.innerText = CONSTANTS.roles[i]
						roleSelect.appendChild(option)
					}

				// host
					if (STATE.isHost && player.id !== STATE.playerId) {
						let removeButton = document.createElement("button")
							removeButton.className = "player-remove"
							removeButton.innerHTML = "&#x1F6AB;"
							removeButton.title = "remove player button"
							removeButton.addEventListener(TRIGGERS.click, removePlayer)
						label.appendChild(removeButton)
					}

				// help text
					let helpText = document.createElement("details")
						helpText.className = "help-text"
					label.appendChild(helpText)

					let summary = document.createElement("summary")
						summary.className = "help-text-button pseudo-button"
						summary.innerText = "?"
						summary.title = "learn more"
					helpText.appendChild(summary)

					let description = document.createElement("description")
						description.className = "help-text-description"
						description.innerText = (STATE.isHost && player.id !== STATE.playerId) ? "remove player" : "actors move objects | speakers see solution"
					helpText.appendChild(description)

				// return
					return element
			} catch (error) {console.log(error)}
		}

	/* updatePlayer */
		function updatePlayer(event) {
			try {
				// assume no error
					event.target.removeAttribute("error")

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
					if (!name || !name.length || CONSTANTS.minimumPlayerNameLength > name.length || name.length > CONSTANTS.maximumPlayerNameLength) {
						event.target.setAttribute("error", true)
						showToast({success: false, message: "name must be " + CONSTANTS.minimumPlayerNameLength + " - " + CONSTANTS.maximumPlayerNameLength + " characters"})
						return
					}

				// send command to server
					STATE.socket.send(JSON.stringify({
						action: "updatePlayer",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						targetId: id,
						name: name,
						role: role
					}))
			} catch (error) {console.log(error)}
		}

	/* removePlayer */
		function removePlayer(event) {
			try {
				// get player
					let targetId = event.target.closest(".player-row").id.split("-")
						targetId = targetId[targetId.length - 1]

				// send command to server
					STATE.socket.send(JSON.stringify({
						action: "removePlayer",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						targetId: targetId,
					}))
			} catch (error) {console.log(error)}
		}

/*** invite ***/
	/* updateInviteName */
		ELEMENTS.configuration.players.invite.name.addEventListener(TRIGGERS.change, updateInviteName)
		function updateInviteName(event) {
			try {
				// assume no error
					ELEMENTS.configuration.players.invite.name.removeAttribute("error")

				// get name
					let name = ELEMENTS.configuration.players.invite.name.value.trim() || "anonymous"
					let email = ELEMENTS.configuration.players.invite.email.value.trim() || null

				// invalid name
					if (!name || !name.length || CONSTANTS.minimumPlayerNameLength > name.length || name.length > CONSTANTS.maximumPlayerNameLength) {
						ELEMENTS.configuration.players.invite.name.setAttribute("error", true)
						ELEMENTS.configuration.players.invite.link.setAttribute("disabled", true)
						return
					}
					ELEMENTS.configuration.players.invite.link.removeAttribute("disabled")

				// no email
					if (!email || !email.length || !isEmail(email)) {
						ELEMENTS.configuration.players.invite.mailto.setAttribute("disabled", true)
						ELEMENTS.configuration.players.invite.mailto.removeAttribute("href")
						return
					}

				// update invite mailto
					let url = window.location.protocol + "//" + window.location.host + "?roomid=" + STATE.roomId + "&name=" + name
					ELEMENTS.configuration.players.invite.mailto.href = "mailto:" + email + "?subject=Invite&body=Join the Game! " + encodeURIComponent(url)
					ELEMENTS.configuration.players.invite.mailto.removeAttribute("disabled")
			} catch (error) {console.log(error)}
		}

	/* updateInviteEmail */
		ELEMENTS.configuration.players.invite.email.addEventListener(TRIGGERS.change, updateInviteEmail)
		function updateInviteEmail(event) {
			try {
				// assume no error
					ELEMENTS.configuration.players.invite.email.removeAttribute("error")

				// get email
					let name = ELEMENTS.configuration.players.invite.name.value.trim() || "anonymous"
					let email = ELEMENTS.configuration.players.invite.email.value.trim() || null

				// invalid name
					if (!name || !name.length || CONSTANTS.minimumPlayerNameLength > name.length || name.length > CONSTANTS.maximumPlayerNameLength) {
						ELEMENTS.configuration.players.invite.name.setAttribute("error", true)
						ELEMENTS.configuration.players.invite.link.setAttribute("disabled", true)
						name = "anonymous"
					}

				// no email
					if (!email || !email.length || !isEmail(email)) {
						ELEMENTS.configuration.players.invite.email.setAttribute("error", true)
						ELEMENTS.configuration.players.invite.mailto.setAttribute("disabled", true)
						ELEMENTS.configuration.players.invite.mailto.removeAttribute("href")
						return
					}

				// update invite mailto
					let url = window.location.protocol + "//" + window.location.host + "?roomid=" + STATE.roomId + "&name=" + name
					ELEMENTS.configuration.players.invite.mailto.href = "mailto:" + email + "?subject=Invite&body=Join the Game! " + encodeURIComponent(url)
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
					if (false && navigator.clipboard) {
						navigator.clipboard.writeText(url)
						showToast({success: true, message: "link copied to clipboard"})
					}

				// not allowed to use clipboard directly
					else {
						let textarea = document.createElement("textarea")
							textarea.id = "temp-text"
							textarea.value = url
						ELEMENTS.body.appendChild(textarea)
							textarea.focus()
							textarea.select()

						try {
							document.execCommand("copy")
							showToast({success: true, message: "link copied to clipboard"})
						} catch (err) {
							showToast({success: false, message: "unable to copy link"})
						}

						textarea.remove()
					}					

				// blur
					ELEMENTS.configuration.players.invite.link.blur()
			} catch (error) {console.log(error)}
		}

	/* clickInviteEmail */
		ELEMENTS.configuration.players.invite.mailto.onclick = clickInviteEmail
		function clickInviteEmail(event) {
			try {
				// prevent default
					window.open(ELEMENTS.configuration.players.invite.mailto.href, "popup", "width=500,height=500")
					event.preventDefault()

				// regular link click first
					setTimeout(function() {
						// blur
							ELEMENTS.configuration.players.invite.mailto.blur()
					}, 0)
			} catch (error) {console.log(error)}
		}

/*** configuration ***/
	/* openConfiguration */
		ELEMENTS.configuration.button.addEventListener(TRIGGERS.click, openConfiguration)
		function openConfiguration(event) {
			try {
				// scroll to top
					setTimeout(function() {
						ELEMENTS.configuration.overlay.scrollTop = 0
					}, 0)
			} catch (error) {console.log(error)}
		}

	/* closeConfiguration */
		ELEMENTS.configuration.close.addEventListener(TRIGGERS.click, closeConfiguration)
		function closeConfiguration(event) {
			try {
				// close
					ELEMENTS.configuration.element.open = false
			} catch (error) {console.log(error)}
		}

	/* jumpToTopConfiguration */
		ELEMENTS.configuration.backToTop.addEventListener(TRIGGERS.click, jumpToTopConfiguration)
		function jumpToTopConfiguration(event) {
			try {
				// scrolltop
					ELEMENTS.configuration.overlay.scrollTop = 0
					ELEMENTS.configuration.backToTop.blur()
			} catch (error) {console.log(error)}
		}

	/* displayConfiguration */
		function displayConfiguration(status, configuration) {
			try {
				// host
					let configurationInputs = Array.from(document.querySelectorAll("[configuration='true']"))
					if (STATE.isHost && !status.play) {
						configurationInputs.forEach(function(element) {
							element.removeAttribute("readonly")
							element.removeAttribute("disabled")
						})
					}
					else {
						configurationInputs.forEach(function(element) {
							element.setAttribute("readonly", true)
							element.setAttribute("disabled", true)
						})
					}

				// preset
					if (document.activeElement !== ELEMENTS.configuration.game.preset) {
						ELEMENTS.configuration.game.preset.value = configuration.preset || "custom"
					}

				// timer
					if (document.activeElement !== ELEMENTS.configuration.game.timer.active) {
						ELEMENTS.configuration.game.timer.active.checked = configuration.timer.active || false
					}
					if (document.activeElement !== ELEMENTS.configuration.game.timer.seconds) {
						ELEMENTS.configuration.game.timer.seconds.value = Number(configuration.timer.seconds) || 0
					}

				// board
					if (document.activeElement !== ELEMENTS.configuration.game.board.x) {
						ELEMENTS.configuration.game.board.x.value = Number(configuration.board.x) || 2
					}
					if (document.activeElement !== ELEMENTS.configuration.game.board.y) {
						ELEMENTS.configuration.game.board.y.value = Number(configuration.board.y) || 2
					}
					if (document.activeElement !== ELEMENTS.configuration.game.board.grid) {
						ELEMENTS.configuration.game.board.grid.checked = configuration.board.grid || false
					}
					if (document.activeElement !== ELEMENTS.configuration.game.board.coordinates) {
						ELEMENTS.configuration.game.board.coordinates.checked = configuration.board.coordinates || false
					}
					if (document.activeElement !== ELEMENTS.configuration.game.board.background) {
						ELEMENTS.configuration.game.board.background.value = configuration.board.background.name || "blank"
					}

				// objects
					if (document.activeElement !== ELEMENTS.configuration.game.objects.count) {
						ELEMENTS.configuration.game.objects.count.value = Number(configuration.objects.count) || 1
					}
					if (document.activeElement !== ELEMENTS.configuration.game.objects.unused) {
						ELEMENTS.configuration.game.objects.unused.value = Number(configuration.objects.unused) || 0
					}
					if (document.activeElement !== ELEMENTS.configuration.game.objects.overlap) {
						ELEMENTS.configuration.game.objects.overlap.checked = configuration.objects.overlap || false
					}
					if (document.activeElement !== ELEMENTS.configuration.game.objects.borders) {
						ELEMENTS.configuration.game.objects.borders.checked = configuration.objects.borders || false
					}
					if (document.activeElement !== ELEMENTS.configuration.game.objects.labels) {
						ELEMENTS.configuration.game.objects.labels.checked = configuration.objects.labels || false
					}

				// sizes
					for (let i in ELEMENTS.configuration.game.objects.sizes) {
						let element = ELEMENTS.configuration.game.objects.sizes[i]
						if (document.activeElement !== element) {
							let value = element.id.split("-")
								value = value[value.length - 1]
							element.checked = configuration.objects.sizes.includes(value) || false
						}
					}

				// shapes
					for (let i in ELEMENTS.configuration.game.objects.shapes) {
						let element = ELEMENTS.configuration.game.objects.shapes[i]
						if (document.activeElement !== element) {
							let value = element.id.split("-")
								value = value[value.length - 1].replace(/_/g, "-")
							element.checked = configuration.objects.shapes.includes(value) || false
						}
					}

				// colors
					for (let i in ELEMENTS.configuration.game.objects.colors) {
						let element = ELEMENTS.configuration.game.objects.colors[i]
						if (document.activeElement !== element) {
							let value = element.id.split("-")
								value = value[value.length - 1].replace(/_/g, "-")
							element.checked = configuration.objects.colors.includes(value) || false
						}
					}

				// cell-size
					ELEMENTS.cssVariables.cells.innerText = ":root {" +
						"--cell-size: " + (CONSTANTS.boardSize / Math.max(configuration.board.x, configuration.board.y)) + "px; " +
						"--board-size-x: " + configuration.board.x + "; " +
						"--board-size-y: " + configuration.board.y + "; " +
					"}"

				// preview
					displayPreview(status, configuration)
			} catch (error) {console.log(error)}
		}

	/* updateConfiguration */
		Array.from(document.querySelectorAll("[configuration='true']")).forEach(function(element) {
			element.addEventListener(TRIGGERS.change, updateConfiguration)
		})
		function updateConfiguration(event) {
			try {
				// assume no error
					event.target.removeAttribute("error")

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
						value = id[id.length - 1].split("_").join("-")
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

							let max = event.target.getAttribute("max")
							let min = event.target.getAttribute("min")
							if (max !== null && value > Number(max)) {
								event.target.setAttribute("error", true)
								return
							}
							if (min !== null && value < Number(min)) {
								event.target.setAttribute("error", true)
								return
							}
						}
						else {
							value = event.target.value
						}
					}

				// preset
					if (category == "preset") {
						configuration = null
						if (value == "custom") {
							ELEMENTS.configuration.game.advanced.open = true
							return
						}
					}

				// send configuration
					STATE.socket.send(JSON.stringify({
						action: "updateConfiguration",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						category: category,
						configuration: configuration,
						value: value,
						include: include
					}))
			} catch (error) {console.log(error)}
		}

/*** screens ***/
	/* displayScreens */
		function displayScreens(players) {
			try {
				// count
					let activeScreens = 0

				// spectator
					if (STATE.role == "spectator") {
						for (let i in ELEMENTS.container.screens) {
							if (!STATE.room.players[i] || !Object.keys(STATE.room.players[i].objects).length) {
								ELEMENTS.container.screens[i].remove()
								delete ELEMENTS.container.screens[i]
							}
						}

						for (let i in STATE.room.players) {
							if (!Object.keys(STATE.room.players[i].objects).length) {
								continue
							}
							activeScreens++
							displayScreen(STATE.room.configuration, STATE.room.players[i])
						}
					}

				// speaker / actor
					else {
						activeScreens = 1

						for (let i in ELEMENTS.container.screens) {
							if (i !== STATE.playerId) {
								ELEMENTS.container.screens[i].remove()
								delete ELEMENTS.container.screens[i]
							}
						}

						displayScreen(STATE.room.configuration, STATE.room.players[STATE.playerId])
					}

				// css variable
					ELEMENTS.container.screensContainer.setAttribute("count", activeScreens)
					ELEMENTS.cssVariables.screens.innerText = ":root {" +
						"--screen-count: "   + (activeScreens == 1 ? 1 : activeScreens <= 4 ? 2 : 3) + "; " +
						"--screen-count-y: " + (activeScreens <= 2 ? 1 : activeScreens <= 6 ? 2 : 3) + "; " +
					"}"
			} catch (error) {console.log(error)}
		}

	/* displayScreen */
		function displayScreen(configuration, player) {
			try {
				// no screen yet
					let screen = ELEMENTS.container.screens[player.id] || createScreen(player.id)
						screen.setAttribute("player-role", player.role)

				// name + role + active
					screen.querySelector(".screen-name").value = player.name || ""
					screen.querySelector(".screen-role").value = player.role || ""
					screen.querySelector(".screen-connected").checked = player.connected || false

				// display board
					let board = screen.querySelector(".board")
					displayBoard(board, configuration)

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

				// name
					let name = document.createElement("output")
						name.className = "screen-name"
					screen.appendChild(name)

				// role
					let role = document.createElement("output")
						role.className = "screen-role"
					screen.appendChild(role)

				// connected
					let connected = document.createElement("input")
						connected.type = "checkbox"
						connected.readonly = true
						connected.className = "screen-connected"
					screen.appendChild(connected)

				// grabzone
					let grabzone = document.createElement("div")
						grabzone.className = "grabzone"
					screen.appendChild(grabzone)

				// drawer
					let drawer = document.createElement("div")
						drawer.className = "drawer"
					screen.appendChild(drawer)

				// board
					createBoard(screen)

				// objects
					screen.objectElements = {}

				// return
					return screen
			} catch (error) {console.log(error)}
		}

	/* createBoard */
		function createBoard(container) {
			try {
				// board
					let board = document.createElement("div")
						board.className = "board"
					container.appendChild(board)

				// grid
					let grid = document.createElement("div")
						grid.className = "board-grid"
					board.appendChild(grid)

				// coordinates
					let coordinates = document.createElement("div")
						coordinates.className = "board-coordinates"
					board.appendChild(coordinates)
			} catch (error) {console.log(error)}
		}

	/* displayBoard */
		function displayBoard(board, configuration) {
			try {
				// background
					board.style.background = "var(--" + (configuration.board.background || "blank") + ")"

				// grid
					if (configuration.board.grid) {
						let count = configuration.board.x * configuration.board.y
						if (Array.from(board.querySelectorAll(".board-grid-cell")).length !== count) {
							displayGrid(board.querySelector(".board-grid"), configuration.board.x, configuration.board.y)
						}
					}
					else {
						board.querySelector(".board-grid").innerHTML = ""
					}

				// coordinates
					if (configuration.board.coordinates) {
						let count = configuration.board.x + configuration.board.y
						if (Array.from(board.querySelectorAll(".board-coordinate")).length !== count) {
							displayCoordinates(board.querySelector(".board-coordinates"), configuration.board.x, configuration.board.y)
						}
					}
					else {
						board.querySelector(".board-coordinates").innerHTML = ""
					}
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
								element.className = "board-grid-cell"
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
							element.className = "board-coordinate board-coordinate-x"
							element.innerText = column + 1
						container.appendChild(element)
					}

				// down the side
					for (let row = 0; row < y; row++) {
						let element = document.createElement("div")
							element.className = "board-coordinate board-coordinate-y"
							element.innerText = CONSTANTS.alphabet[row]
						container.appendChild(element)
					}
			} catch (error) {console.log(error)}
		}

/*** preview ***/
	/* displayPreview */
		function displayPreview(status, configuration) {
			try {
				// in play
					if (status.play) {
						ELEMENTS.configuration.preview.element.setAttribute("visibility", false)
						return
					}
					
					ELEMENTS.configuration.preview.element.setAttribute("visibility", true)

				// board
					displayBoard(ELEMENTS.configuration.preview.board, configuration)

				// clear out objects
					Array.from(ELEMENTS.configuration.preview.board.querySelectorAll(".object")).forEach(function(element) {
						element.remove()
					})

				// no count / sizes / shapes / colors
					if (!configuration.objects.count || !configuration.objects.sizes.length || !configuration.objects.shapes.length || !configuration.objects.colors.length) {
						return
					}

				// display samples
					displayPreviewObjects(ELEMENTS.configuration.preview.board, configuration)
			} catch (error) {console.log(error)}
		}

	/* displayPreviewObjects */
		function displayPreviewObjects(board, configuration) {
			try {
				// build objects
					let objects = []
					for (let i = 0; i < configuration.objects.count; i++) {
						// object
							let attempts = CONSTANTS.attempts
							let object = {
								id: i,
								preview: true
							}

						// weighted sizes
							let weightedSizes = []
							for (let i in configuration.objects.sizes) {
								let size = configuration.objects.sizes[i]
								for (let j = 0; j < CONSTANTS.sizeWeights[size]; j++) {
									weightedSizes.push(size)
								}
							}

						// random parameters
							do {
								object.shape = chooseRandom(configuration.objects.shapes)
								object.color = chooseRandom(configuration.objects.colors)
								object.size = chooseRandom(weightedSizes)
								object.label = configuration.objects.labels ? CONSTANTS.alphabet[i] : null
								object.border = configuration.objects.borders ? chooseRandom(configuration.objects.colors) : null
								attempts--
							} while (attempts && objects.find(function(o) {
								return o.shape == object.shape && o.color == object.color && o.size == object.size && o.label == object.label && o.border == object.border
							}))

						// escape
							if (!attempts) {
								showToast({success: false, message: "unable to generate sample"})
								return
							}

						// size
							object.size = {x: Number(object.size.split("x")[0]), y: Number(object.size.split("x")[1])}

						// random position (no overlap)
							attempts = CONSTANTS.attempts
							object.target = {x: null, y: null, z: i}
							do {
								object.target.x = Math.floor(Math.random() * configuration.board.x)
								object.target.y = Math.floor(Math.random() * configuration.board.x)
								attempts--
							} while (attempts && (hangsOff(configuration.board, object) || (!configuration.objects.overlap && hasOverlap(object, objects))))

						// escape
							if (!attempts) {
								showToast({success: false, message: "unable to generate sample"})
								return
							}

						// add object
							object.position = {
								x: object.target.x,
								y: object.target.y
							}
							objects.push(object)
					}

				// display
					for (let i in objects) {
						let element = createObject(ELEMENTS.configuration.preview.board, ELEMENTS.configuration.preview.board, objects[i])
						displayObject(ELEMENTS.configuration.preview.board, null, element, objects[i])
					}
			} catch (error) {console.log(error)}
		}

/*** objects ***/
	/* displayObjects */
		function displayObjects(screen, objects) {
			try {
				// get ids
					let ids = Object.keys(objects)

				// get board & drawer
					let board = screen.querySelector(".board")
					let drawer = screen.querySelector(".drawer")

				// get existing objects
					for (let i in screen.objectElements) {
						// no longer present
							if (!ids.includes(i)) {
								screen.objectElements[i].remove()
								delete screen.objectElements[i]
								continue
							}

						// update
							displayObject(board, drawer, screen.objectElements[i], objects[i])
							ids = ids.filter(function(j) { return j !== i }) || []
					}

				// remaining ids
					for (let i in ids) {
						let element = createObject(screen, drawer, objects[ids[i]])
						displayObject(board, drawer, element, objects[ids[i]])
					}
			} catch (error) {console.log(error)}
		}

	/* displayObject */
		function displayObject(board, drawer, element, object) {
			try {
				// active
					if (STATE.grabbed) {
						let id = STATE.grabbed.id.split("-")
						if (id[id.length - 1] == object.id) {
							return
						}
					}

				// in drawer
					if (object.position.x === null || object.position.y === null) {
						drawer.appendChild(element)
						return
					}

				// not in drawer
					board.appendChild(element)
					element.style.left = "calc(var(--cell-size) * " + (object.position.x + CONSTANTS.objectOffset) + (object.preview ? " / 2) " : " / var(--screen-count) * var(--multiplier))")
					element.style.top  = "calc(var(--cell-size) * " + (object.position.y + CONSTANTS.objectOffset) + (object.preview ? " / 2) " : " / var(--screen-count) * var(--multiplier))")
			} catch (error) {console.log(error)}
		}

	/* createObject */
		function createObject(screen, drawer, object) {
			try {
				// object
					let element = document.createElement("div")
						element.className = "object"
						element.id = screen.id + "-object-" + object.id
						element.style.width  = "calc(var(--cell-size) * " + object.size.x + (object.preview ? " / 2) " : " / var(--screen-count) * var(--multiplier))")
						element.style.height = "calc(var(--cell-size) * " + object.size.y + (object.preview ? " / 2) " : " / var(--screen-count) * var(--multiplier))")
						element.style.zIndex = object.position.z
					if (!object.preview) {
						screen.objectElements[object.id] = element
					}
					drawer.appendChild(element)

				// shape
					let shape = document.createElement("div")
						shape.className = "object-shape"
						shape.style.clipPath = "var(--" + object.shape + ")"
						shape.style.background = "var(--" + (object.border || object.color) + ")"
						shape.addEventListener("mousedown", grabObject)
						shape.addEventListener("touchstart", grabObject)
					element.appendChild(shape)

				// border
					let inner = null
					if (object.border) {
						inner = document.createElement("div")
						inner.className = "object-inner"
						inner.style.clipPath = "var(--border-" + object.shape + ")"
						inner.style.background = "var(--" + object.color + ")"
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
						return
					}

				// not in play
					if (!STATE.room.status.play) {
						screen.removeAttribute("grabbing")
						return
					}

				// prevent default
					event.preventDefault()

				// grab
					STATE.grabbed = event.target.closest(".object")
					STATE.grabbed.setAttribute("grabbing", true)
					screen.setAttribute("grabbing", true)

				// move to grabzone
					screen.querySelector(".grabzone").appendChild(STATE.grabbed)

				// trigger move
					moveObject(event)
			} catch (error) {console.log(error)}
		}

	/* moveObject */
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
					STATE.cursor.actualX = event.touches && event.touches.length ? event.touches[0].clientX : event.clientX
					STATE.cursor.actualY = event.touches && event.touches.length ? event.touches[0].clientY : event.clientY

				// outside of screen
					if ((STATE.cursor.actualX < 0 || STATE.cursor.actualX > window.innerWidth)
					 || (STATE.cursor.actualY < 0 || STATE.cursor.actualY > window.innerHeight)) {
						return
					}

					let boardRect = screen.querySelector(".grabzone").getBoundingClientRect()
					STATE.cursor.x = (STATE.cursor.actualX - boardRect.left) / boardRect.width  * STATE.room.configuration.board.x
					STATE.cursor.y = (STATE.cursor.actualY - boardRect.top ) / boardRect.height * STATE.room.configuration.board.y

				// move element
					STATE.grabbed.style.left = "calc(var(--cell-size) * " + STATE.cursor.x + " / var(--screen-count) * var(--multiplier))"
					STATE.grabbed.style.top  = "calc(var(--cell-size) * " + STATE.cursor.y + " / var(--screen-count) * var(--multiplier))"
			} catch (error) {console.log(error)}
		}

	/* dropObject */
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
					let x = event.touches && event.touches.length ? event.touches[0].clientX : event.clientX
					let y = event.touches && event.touches.length ? event.touches[0].clientY : event.clientY

					if (x !== undefined && y !== undefined) {
						STATE.cursor.actualX = x
						STATE.cursor.actualY = y
					}

				// outside of screen
					if ((STATE.cursor.actualX < 0 || STATE.cursor.actualX > window.innerWidth)
					 || (STATE.cursor.actualY < 0 || STATE.cursor.actualY > window.innerHeight)) {
						return
					}

				// in drawer
					let drawer = screen.querySelector(".drawer")
					let drawerRect = drawer.getBoundingClientRect()
					let setupRect = ELEMENTS.configuration.button.getBoundingClientRect()

					if (((drawerRect.left - CONSTANTS.drawerExtra <= STATE.cursor.actualX && STATE.cursor.actualX <= drawerRect.right  + CONSTANTS.drawerExtra)
					  && (drawerRect.top  - CONSTANTS.drawerExtra <= STATE.cursor.actualY && STATE.cursor.actualY <= drawerRect.bottom + CONSTANTS.drawerExtra))
					 || ((setupRect.left - CONSTANTS.drawerExtra <= STATE.cursor.actualX && STATE.cursor.actualX <= setupRect.right  + CONSTANTS.drawerExtra)
					  && (setupRect.top  - CONSTANTS.drawerExtra <= STATE.cursor.actualY && STATE.cursor.actualY <= setupRect.bottom + CONSTANTS.drawerExtra))) {
						STATE.cursor.x = null
						STATE.cursor.y = null

						drawer.appendChild(STATE.grabbed)
						STATE.grabbed.style.left = "0"
						STATE.grabbed.style.top = "0"
					}

				// snap to grid
					else {
						let board = screen.querySelector(".board")
						let boardRect = board.getBoundingClientRect()
						STATE.cursor.x = Math.floor((STATE.cursor.actualX - boardRect.left) / boardRect.width  * STATE.room.configuration.board.x)
						STATE.cursor.y = Math.floor((STATE.cursor.actualY - boardRect.top ) / boardRect.height * STATE.room.configuration.board.y)

						board.appendChild(STATE.grabbed)
						STATE.grabbed.style.left = "calc(var(--cell-size) * " + (STATE.cursor.x + CONSTANTS.objectOffset) + " / var(--screen-count) * var(--multiplier))"
						STATE.grabbed.style.top  = "calc(var(--cell-size) * " + (STATE.cursor.y + CONSTANTS.objectOffset) + " / var(--screen-count) * var(--multiplier))"
					}

				// send to server
					let objectId = STATE.grabbed.id.split("-")
						objectId = objectId[objectId.length - 1]

					STATE.socket.send(JSON.stringify({
						action: "updateObject",
						playerId: STATE.playerId,
						roomId: STATE.roomId,
						objectId: objectId,
						x: STATE.cursor.x,
						y: STATE.cursor.y
					}))

				// ungrab
					STATE.grabbed.removeAttribute("grabbing")
					STATE.grabbed = null
					screen.removeAttribute("grabbing")
			} catch (error) {console.log(error)}
		}
