/*** globals ***/
	/* triggers */
		window.TRIGGERS = {
			submit: "submit"
		}

	/* constants */
		const CONSTANTS = {
			minimumNameLength: 3,
			maximumNameLength: 16,
			gameIdLength: 4,
		}

	/* elements */
		const ELEMENTS = {
			newGameForm: document.querySelector("#new-game-form"),
			joinGameForm: document.querySelector("#join-game-form"),
			gameIdInput: document.querySelector("#game-id-input"),
			nameInput: document.querySelector("#name-input")
		}

/*** tools ***/
	/* sendPost */
		function sendPost(options, callback) {
			try {
				// create request object and send to server
					let request = new XMLHttpRequest()
						request.open("POST", location.pathname, true)
						request.onload = function() {
							if (request.readyState !== XMLHttpRequest.DONE || request.status !== 200) {
								callback({success: false, readyState: request.readyState, message: request.status})
								return
							}

							callback(JSON.parse(request.responseText) || {success: false, message: "unknown error"})
						}
						request.send(JSON.stringify(options))
			} catch (error) {console.log(error)}
		}

	/* receivePost */
		function receivePost(data) {
			try {
				// redirect
					if (data.location) {
						window.location = data.location
						return
					}

				// message
					if (data.message) {
						showToast(data)
					}
			} catch (error) {console.log(error)}
		}

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

/*** submits ***/
	/* submitNewGame */
		ELEMENTS.newGameForm.addEventListener(window.TRIGGERS.submit, submitNewGame)
		function submitNewGame(event) {
			try {
				// post
					sendPost({
						action: "createGame"
					}, receivePost)
			} catch (error) {console.log(error)}
		}

	/* submitJoinGame */
		ELEMENTS.joinGameForm.addEventListener(window.TRIGGERS.submit, submitJoinGame)
		function submitJoinGame(event) {
			try {
				// game id
					let gameId = ELEMENTS.gameIdInput.value || null
					if (!gameId || gameId.length !== CONSTANTS.gameIdLength || !isNumLet(gameId)) {
						showToast({success: false, message: "game id must be " + CONSTANTS.gameIdLength + " letters & numbers"})
						return
					}

				// name
					let name = (ELEMENTS.nameInput.value || "").trim()
					if (!name || CONSTANTS.minimumNameLength > name.length || name.length > CONSTANTS.maximumNameLength || !isNumLet(name)) {
						showToast({success: false, message: "name must be " + CONSTANTS.minimumNameLength + " to " + CONSTANTS.maximumNameLength + " letters and numbers"})
						return
					}

				// post
					sendPost({
						action: "joinGame",
						gameId: gameId,
						name: name
					}, receivePost)
			} catch (error) {console.log(error)}
		}
