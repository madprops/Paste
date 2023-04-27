const App = {}

App.ls_tokens = `tokens_v1`
App.ls_passwd = `passwd_v1`
App.max_content_length = 500000
App.max_comment_length = 200
App.is_loading = true
App.leaving = false
App.updated = false

App.default_comment = `Leave a comment here`

App.init = () => {
	App.main = document.getElementById(`paste_main`)
	App.textarea = document.getElementById(`paste_textarea`)
	App.footer = document.getElementById(`paste_footer`)
	App.comment_content = document.getElementById(`paste_comment_content`)
	App.loading = document.getElementById(`paste_loading`)
	App.toolbar_save = document.getElementById(`paste_toolbar_save`)
	App.toolbar_update = document.getElementById(`paste_toolbar_update`)
	App.toolbar_new = document.getElementById(`paste_toolbar_new`)

	App.check_save()
	App.create_editor()
	App.get_tokens()
	App.check_initial_token()
	App.remove_get_parameters_from_url()
	App.setup_comment()
	App.setup_window_load()
	App.check_ownership()
	App.stop_loading_mode()
	App.setup_click_events()

	App.editor.setOption(`mode`, `clike`)
	App.editor.refresh()
	App.editor.focus()
}

App.create_editor = () => {
	App.editor = CodeMirror.fromTextArea(App.textarea,
		{
			lineNumbers: true,
			theme: `nord`,
			indentWithTabs: true,
			tabSize: 4,
			lineWrapping: true,
			indentUnit: 4
		})

	App.document = App.editor.getDoc()
	App.set_content(App.initial_content)
}

App.update_paste = () => {
	App.save_paste(true)
}

App.paste_is_empty = () => {
	let content = App.get_content(true)
	let comment = App.get_comment()

	if (!content && !comment) {
		return true
	}

	return false
}

App.save_paste = (update = false) => {
	if (update && !App.owner) {
		return false
	}

	App.editor.focus()

	let content = App.get_content()
	content = App.untab_string(content)

	if (App.paste_is_empty()) {
		App.show_footer_message(`Can't Save An Empty App`, false)
		return false
	}

	if (content.length > App.max_content_length) {
		App.show_footer_message(`Paste Is Too Big`, false)
		return false
	}

	if (App.posting) {
		App.show_footer_message(`Paste Save Already In Progress`, false)
		return false
	}

	let token

	if (update) {
		token = App.get_token_by_url(App.code)
	}
	else {
		token = ``
	}

	let onsuccess = (response) => {
		let code = response[`code`]
		let token = response[`token`]

		if (code && token) {
			App.push_to_tokens(code, token)
		}

		if (code) {
			if (code === App.code) {
				App.after_update()
			}
			else {
				App.go_to_location(`?code=${code}&saved=true`)
			}
		}
	}

	let passwd = ``
	let passwdobj = App.get_local_storage(App.ls_passwd)

	if (passwdobj) {
		passwd = passwdobj.passwd
	}

	if (!passwd) {
		passwd = prompt(`Enter Password`)
		App.save_local_storage(App.ls_passwd, {passwd: passwd})
	}

	App.send_post(`save.php`,
		{
			content: content,
			comment: App.get_comment(),
			token: token,
			passwd: passwd
		}, onsuccess)
}

App.send_post = (target, data, onsuccess) => {
	App.posting = true

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
		App.posting = false
	})

	// Define what happens in case of error
	XHR.addEventListener(`error`, (event) => {
		App.posting = false
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
			App.save_local_storage(App.ls_passwd, {passwd: ``})
		}
	}

	// Finally, send our data.
	XHR.send(urlEncodedData)
}

App.show_footer_message = (s, succ) => {
	clearTimeout(App.footer_timeout)

	App.footer.innerHTML = s

	if (succ) {
		App.footer.style.backgroundColor = `#5bab70`
	}
	else {
		App.footer.style.backgroundColor = `#c05f5f`
	}

	App.footer.style.bottom = `0`

	App.footer_timeout = setTimeout(() => {
		App.footer.style.bottom = `-2.5rem`
	}, 3000)
}

App.check_initial_token = () => {
	if (App.code && App.token) {
		App.push_to_tokens(App.code, App.token)
	}
}

App.remove_get_parameters_from_url = () => {
	let url = window.location.href.split(`&`)[0]
	App.change_url(url)
}

App.change_url = (url, replace = true) => {
	if (replace) {
		window.history.replaceState(`object`, document.title, url)
	}
	else {
		window.history.pushState(`object`, document.title, url)
	}
}

App.after_update = () => {
	App.updated = true
	App.initial_content = App.get_content()
	App.initial_comment = App.get_comment()
	App.show_save_success(true)
}

App.get_local_storage = (ls_name) => {
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

App.save_local_storage = (ls_name, obj) => {
	obj = JSON.stringify(obj)
	localStorage.setItem(ls_name, obj)
}

App.go_to_location = (url) => {
	App.leaving = true
	window.location.href = url
}

App.new_paste = () => {
	if (App.code) {
		let url = window.location.href.split(`?`)[0]
		App.go_to_location(url)
	}
	else {
		App.set_content(``)
		App.set_comment(``)
		App.editor.focus()
	}
}

App.paste_is_modified = () => {
	if
		(
		App.get_content() === App.initial_content &&
		App.get_comment() === App.initial_comment
	) {
		return false
	}

	return true
}

App.get_content = (trim = false) => {
	let value = App.document.getValue()

	if (trim) {
		value = value.trim()
	}

	return value
}

App.set_content = (s) => {
	App.document.setValue(s)
}

App.setup_comment = () => {
	App.comment_content.innerText = App.initial_comment

	App.comment_content.addEventListener(`blur`, () => {
		App.set_comment(App.get_comment())
	})
}

App.clean_string2 = (s) => {
	return s.replace(/\s+/g, ` `).trim()
}

App.get_comment = () => {
	return App.clean_string2(App.comment_content.innerText).substring(0, App.max_comment_length).trim()
}

App.set_comment = (val) => {
	App.comment_content.innerText = val
}

App.setup_window_load = () => {
	window.onbeforeunload = () => {
		if (!App.leaving && App.paste_is_modified()) {
			return `Are you sure?`
		}
		else {
			App.start_loading_mode(true)
		}
	}
}

App.stop_loading_mode = () => {
	App.loading.style.display = `none`
	App.is_loading = false
}

App.start_loading_mode = () => {
	App.loading.style.display = `flex`
	App.is_loading = true
}

App.get_token_by_url = (url) => {
	return App.tokens.items[url] || ``
}

App.get_tokens = () => {
	App.tokens = App.get_local_storage(App.ls_tokens)

	if (App.tokens === null) {
		App.tokens = {}
	}

	let changed = false

	if (App.tokens.items === undefined) {
		App.tokens.items = {}

		changed = true
	}

	if (changed) {
		App.save_tokens()
	}
}

App.save_tokens = () => {
	App.save_local_storage(App.ls_tokens, App.tokens)
}

App.push_to_tokens = (url, token, save = true) => {
	App.tokens.items[url] = token

	if (save) {
		App.save_tokens()
	}
}

App.check_ownership = () => {
	if (App.get_token_by_url(App.code)) {
		App.owner = true
		App.toolbar_update.classList.remove(`paste_disabled`)
	}
	else {
		App.owner = false
		App.toolbar_update.classList.add(`paste_disabled`)
	}
}

App.show_save_success = (update = false) => {
	if (update) {
		App.show_footer_message(`Paste Updated`, true)
	}
	else {
		App.show_footer_message(`Paste Saved`, true)
	}
}

App.check_save = () => {
	if (App.saved) {
		App.show_save_success()
	}
}

App.untab_string = (s) => {
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

App.setup_click_events = () => {
	App.toolbar_save.addEventListener(`click`, () => {
		App.save_paste()
	})

	App.toolbar_update.addEventListener(`click`, () => {
		App.update_paste()
	})

	App.toolbar_new.addEventListener(`click`, () => {
		App.new_paste()
	})
}