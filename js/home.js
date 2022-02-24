/*** globals ***/
	/* triggers */
		const TRIGGERS = {
			submit: "submit"
		}

	/* constants */
		const CONSTANTS = {
			minimumNameLength: 3,
			maximumNameLength: 16,
			roomIdLength: 4,
		}

	/* elements */
		const ELEMENTS = {
			newRoomForm: document.querySelector("#new-room-form"),
			joinRoomForm: document.querySelector("#join-room-form"),
			roomIdInput: document.querySelector("#room-id-input"),
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

	/* preloadValues */
		preloadValues()
		function preloadValues(event) {
			try {
				// get
					let search = window.location.search.slice(1)
					if (!search || !search.length) {
						return
					}
					
					let sets = search.split("&") || []
					if (!sets || !sets.length) {
						return
					}

					let get = {}
					for (let i in sets) {
						let pair = sets[i].split("=")
						get[pair[0].toLowerCase().trim()] = pair[1].trim()
					}

				// room id
					if (get.roomid) {
						ELEMENTS.roomIdInput.value = get.roomid
					}

				// name
					if (get.name) {
						ELEMENTS.nameInput.value = get.name
					}

				// both
					setTimeout(function() {
						if (get.roomid && get.name) {
							submitJoinRoom()
						}
					}, 0)
			} catch (error) {console.log(error)}
		}

/*** interactive ***/
	/* createRoom */
		ELEMENTS.newRoomForm.addEventListener(TRIGGERS.submit, createRoom)
		function createRoom(event) {
			try {
				// name
					let name = (ELEMENTS.nameInput.value || "").trim()
					if (!name || CONSTANTS.minimumNameLength > name.length || name.length > CONSTANTS.maximumNameLength || !isNumLet(name)) {
						showToast({success: false, message: "name must be " + CONSTANTS.minimumNameLength + " to " + CONSTANTS.maximumNameLength + " letters and numbers"})
						return
					}

				// post
					sendPost({
						action: "createRoom",
						name: name
					}, receivePost)
			} catch (error) {console.log(error)}
		}

	/* joinRoom */
		ELEMENTS.joinRoomForm.addEventListener(TRIGGERS.submit, joinRoom)
		function joinRoom(event) {
			try {
				// room id
					let roomId = ELEMENTS.roomIdInput.value || null
					if (!roomId || roomId.length !== CONSTANTS.roomIdLength || !isNumLet(roomId)) {
						showToast({success: false, message: "room id must be " + CONSTANTS.roomIdLength + " letters & numbers"})
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
						action: "joinRoom",
						roomId: roomId,
						name: name
					}, receivePost)
			} catch (error) {console.log(error)}
		}
