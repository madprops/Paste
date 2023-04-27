const Paste = {}

Paste.ls_tokens = `tokens_v1`
Paste.ls_passwd = `passwd_v1`
Paste.max_content_length = 500000
Paste.max_comment_length = 200
Paste.is_loading = true
Paste.leaving = false
Paste.updated = false

Paste.default_comment = `Leave a comment here`

Paste.init = () => {
	Paste.main = document.getElementById(`paste_main`)
	Paste.textarea = document.getElementById(`paste_textarea`)
	Paste.footer = document.getElementById(`paste_footer`)
	Paste.comment_content = document.getElementById(`paste_comment_content`)
	Paste.loading = document.getElementById(`paste_loading`)
	Paste.toolbar_save = document.getElementById(`paste_toolbar_save`)
	Paste.toolbar_update = document.getElementById(`paste_toolbar_update`)
	Paste.toolbar_new = document.getElementById(`paste_toolbar_new`)

	Paste.check_save()
	Paste.create_editor()
	Paste.get_tokens()
	Paste.check_initial_token()
	Paste.remove_get_parameters_from_url()
	Paste.setup_comment()
	Paste.setup_window_load()
	Paste.check_ownership()
	Paste.stop_loading_mode()
	Paste.setup_click_events()

	Paste.editor.setOption(`mode`, `clike`)
	Paste.editor.refresh()
	Paste.editor.focus()
}

Paste.create_editor = () => {
	Paste.editor = CodeMirror.fromTextArea(Paste.textarea,
		{
			lineNumbers: true,
			theme: `nord`,
			indentWithTabs: true,
			tabSize: 4,
			lineWrapping: true,
			indentUnit: 4
		})

	Paste.document = Paste.editor.getDoc()
	Paste.set_content(Paste.initial_content)
}

Paste.update_paste = () => {
	Paste.save_paste(true)
}

Paste.paste_is_empty = () => {
	let content = Paste.get_content(true)
	let comment = Paste.get_comment()

	if (!content && !comment) {
		return true
	}

	return false
}

Paste.save_paste = (update = false) => {
	if (update && !Paste.owner) {
		return false
	}

	Paste.editor.focus()

	let content = Paste.get_content()
	content = Paste.untab_string(content)

	if (Paste.paste_is_empty()) {
		Paste.show_footer_message(`Can't Save An Empty Paste`, false)
		return false
	}

	if (content.length > Paste.max_content_length) {
		Paste.show_footer_message(`Paste Is Too Big`, false)
		return false
	}

	if (Paste.posting) {
		Paste.show_footer_message(`Paste Save Already In Progress`, false)
		return false
	}

	let token

	if (update) {
		token = Paste.get_token_by_url(Paste.code)
	}
	else {
		token = ``
	}

	let onsuccess = (response) => {
		let code = response[`code`]
		let token = response[`token`]

		if (code && token) {
			Paste.push_to_tokens(code, token)
		}

		if (code) {
			if (code === Paste.code) {
				Paste.after_update()
			}
			else {
				Paste.go_to_location(`?code=${code}&saved=true`)
			}
		}
	}

	let passwd = ``
	let passwdobj = Paste.get_local_storage(Paste.ls_passwd)

	if (passwdobj) {
		passwd = passwdobj.passwd
	}

	if (!passwd) {
		passwd = prompt(`Enter Password`)
		Paste.save_local_storage(Paste.ls_passwd, {passwd: passwd})
	}

	Paste.send_post(`save.php`,
		{
			content: content,
			comment: Paste.get_comment(),
			token: token,
			passwd: passwd
		}, onsuccess)
}

Paste.send_post = (target, data, onsuccess) => {
	Paste.posting = true

	let XHR = new XMLHttpRequest()
	let urlEncodedData = ``
	let urlEncodedDataPairs = []

	XHR.responseType = `json`

	// Turn the data object into an array of URL-encoded key/value pairs.
	for (let name in data) {
		urlEncodedDataPairs.push(encodeURIComponent(name) + `=` + encodeURIComponent(data[name]))
	}

	// Combine the pairs into a single string and replace all %-encoded spaces to
	// the '+' character; matches the behaviour of browser form submissions.
	urlEncodedData = urlEncodedDataPairs.join(`&`).replace(/%20/g, `+`);

	// Define what happens on successful data submission
	XHR.addEventListener(`load`, (event, data) => {
		Paste.posting = false
	})

	// Define what happens in case of error
	XHR.addEventListener(`error`, (event) => {
		Paste.posting = false
		console.error(`Oops! Something goes wrong.`)
	})

	// Set up our request
	XHR.open(`POST`, target)

	// Add the required HTTP header for form data POST requests
	XHR.setRequestHeader(`Content-Type`, `application/x-www-form-urlencoded`)

	XHR.onreadystatechange = (aEvt) => {
		if (XHR.readyState == 4) {
			if (XHR.status == 200) {
				if (XHR.response) {
					onsuccess(XHR.response)
					return
				}
			}

			console.info(`XHR Error`)
			Paste.save_local_storage(Paste.ls_passwd, {passwd: ``})
		}
	}

	// Finally, send our data.
	XHR.send(urlEncodedData)
}

Paste.show_footer_message = (s, succ) => {
	clearTimeout(Paste.footer_timeout)

	Paste.footer.innerHTML = s

	if (succ) {
		Paste.footer.style.backgroundColor = `#5bab70`
	}
	else {
		Paste.footer.style.backgroundColor = `#c05f5f`
	}

	Paste.footer.style.bottom = `0`

	Paste.footer_timeout = setTimeout(() => {
		Paste.footer.style.bottom = `-2.5rem`
	}, 3000)
}

Paste.check_initial_token = () => {
	if (Paste.code && Paste.token) {
		Paste.push_to_tokens(Paste.code, Paste.token)
	}
}

Paste.remove_get_parameters_from_url = () => {
	let url = window.location.href.split(`&`)[0]
	Paste.change_url(url)
}

Paste.change_url = (url, replace = true) => {
	if (replace) {
		window.history.replaceState(`object`, document.title, url)
	}
	else {
		window.history.pushState(`object`, document.title, url)
	}
}

Paste.after_update = () => {
	Paste.updated = true
	Paste.initial_content = Paste.get_content()
	Paste.initial_comment = Paste.get_comment()
	Paste.show_save_success(true)
}

Paste.get_local_storage = (ls_name) => {
	let obj

	if (localStorage[ls_name]) {
		try {
			obj = JSON.parse(localStorage.getItem(ls_name))
		}
		catch (err) {
			console.error(err)
			obj = null
		}
	}
	else {
		obj = null
	}

	return obj
}

Paste.save_local_storage = (ls_name, obj) => {
	obj = JSON.stringify(obj)
	localStorage.setItem(ls_name, obj)
}

Paste.go_to_location = (url) => {
	Paste.leaving = true
	window.location.href = url
}

Paste.new_paste = () => {
	if (Paste.code) {
		let url = window.location.href.split(`?`)[0]
		Paste.go_to_location(url)
	}
	else {
		Paste.set_content(``)
		Paste.set_comment(``)
		Paste.editor.focus()
	}
}

Paste.paste_is_modified = () => {
	if
		(
		Paste.get_content() === Paste.initial_content &&
		Paste.get_comment() === Paste.initial_comment
	) {
		return false
	}

	return true
}

Paste.get_content = (trim = false) => {
	let value = Paste.document.getValue()

	if (trim) {
		value = value.trim()
	}

	return value
}

Paste.set_content = (s) => {
	Paste.document.setValue(s)
}

Paste.setup_comment = () => {
	Paste.comment_content.innerText = Paste.initial_comment

	Paste.comment_content.addEventListener(`blur`, () => {
		Paste.set_comment(Paste.get_comment())
	})
}

Paste.clean_string2 = (s) => {
	return s.replace(/\s+/g, ` `).trim()
}

Paste.get_comment = () => {
	return Paste.clean_string2(Paste.comment_content.innerText).substring(0, Paste.max_comment_length).trim()
}

Paste.set_comment = (val) => {
	Paste.comment_content.innerText = val
}

Paste.setup_window_load = () => {
	window.onbeforeunload = () => {
		if (!Paste.leaving && Paste.paste_is_modified()) {
			return `Are you sure?`
		}
		else {
			Paste.start_loading_mode(true)
		}
	}
}

Paste.stop_loading_mode = () => {
	Paste.loading.style.display = `none`
	Paste.is_loading = false
}

Paste.start_loading_mode = () => {
	Paste.loading.style.display = `flex`
	Paste.is_loading = true
}

Paste.get_token_by_url = (url) => {
	return Paste.tokens.items[url] || ``
}

Paste.get_tokens = () => {
	Paste.tokens = Paste.get_local_storage(Paste.ls_tokens)

	if (Paste.tokens === null) {
		Paste.tokens = {}
	}

	let changed = false

	if (Paste.tokens.items === undefined) {
		Paste.tokens.items = {}

		changed = true
	}

	if (changed) {
		Paste.save_tokens()
	}
}

Paste.save_tokens = () => {
	Paste.save_local_storage(Paste.ls_tokens, Paste.tokens)
}

Paste.push_to_tokens = (url, token, save = true) => {
	Paste.tokens.items[url] = token

	if (save) {
		Paste.save_tokens()
	}
}

Paste.check_ownership = () => {
	if (Paste.get_token_by_url(Paste.code)) {
		Paste.owner = true
		Paste.toolbar_update.classList.remove(`paste_disabled`)
	}
	else {
		Paste.owner = false
		Paste.toolbar_update.classList.add(`paste_disabled`)
	}
}

Paste.show_save_success = (update = false) => {
	if (update) {
		Paste.show_footer_message(`Paste Updated`, true)
	}
	else {
		Paste.show_footer_message(`Paste Saved`, true)
	}
}

Paste.check_save = () => {
	if (Paste.saved) {
		Paste.show_save_success()
	}
}

Paste.untab_string = (s) => {
	s = s.replace(/\t/gm, `  `)
	let lines = s.split(`\n`)

	if (lines.length <= 1) {
		return s
	}

	let ns = []
	let pos = -1

	for (let line of lines) {
		if (!line.trim()) {
			continue
		}

		let m = line.match(/^\s+/)

		if (m) {
			let n = m[0].length

			if (pos === -1 || n < pos) {
				pos = n
			}

			ns.push(n)
		}
		else {
			return s
		}
	}

	let new_lines = []
	let spaces = ``

	for (let i=0; i<pos; i++) {
		spaces += ` `
	}

	for (let line of lines) {
		let re = new RegExp(`(^${spaces})`)
		new_lines.push(line.replace(re, ``))
	}

	return new_lines.join(`\n`)
}

Paste.setup_click_events = () => {
	Paste.toolbar_save.addEventListener(`click`, () => {
		Paste.save_paste()
	})

	Paste.toolbar_update.addEventListener(`click`, () => {
		Paste.update_paste()
	})

	Paste.toolbar_new.addEventListener(`click`, () => {
		Paste.new_paste()
	})
}