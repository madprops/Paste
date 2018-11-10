const Paste = {}

Paste.ls_paste_history = "paste_history_v1"
Paste.ls_state = "paste_state_v1"
Paste.max_paste_history_items = 200

Paste.init = function()
{
	Paste.main = document.getElementById("paste_main")
	Paste.textarea = document.getElementById("paste_textarea")
	Paste.footer = document.getElementById("paste_footer")
	Paste.modal = document.getElementById("paste_modal")
	Paste.modal_inner = document.getElementById("paste_modal_inner")
	Paste.overlay = document.getElementById("paste_overlay")
	Paste.mode_text = document.getElementById("paste_mode_text")
	Paste.loading = document.getElementById("paste_loading")
	Paste.loading_inner = document.getElementById("paste_loading_inner")

	Paste.editor = CodeMirror.fromTextArea(Paste.textarea,
	{
		lineNumbers: true,
		theme: "dracula",
		indentWithTabs: true,
		scrollbarStyle: "simple"
	})

	Paste.document = Paste.editor.getDoc()
	Paste.document.setValue(Paste.initial_value)

	if(Paste.saved)
	{
		Paste.show_footer_message("Paste Succesfully Saved")
	}

	Paste.remove_get_parameters_from_url()
	Paste.get_paste_history()
	Paste.check_paste_history()
	Paste.get_state()
	Paste.prepare_modes()
}

Paste.after_mode_files_loaded = function()
{
	Paste.set_default_mode()
	Paste.loading.style.display = "none"
	Paste.main.style.display = "block"
	Paste.editor.refresh()
}

Paste.clear_textarea = function()
{
	Paste.document.setValue("")
}

Paste.save_paste = function()
{
	let content = Paste.document.getValue()

	if(!content.trim())
	{
		Paste.show_footer_message("Can't Save An Empty Paste")
		return false
	}

	if(content === Paste.initial_value && Paste.mode_name === Paste.original_mode_name)
	{
		Paste.show_footer_message("Nothing Has Changed")
		return false
	}

	if(Paste.posting)
	{
		Paste.show_footer_message("Paste Save Already In Progress")
		return false
	}

	Paste.posting = true

	setTimeout(function()
	{
		Paste.posting = false
	}, 10000)

	Paste.send_post("save.php", {content:content, mode_name:Paste.mode_name})
}

Paste.send_post = function(target, data)
{
	let XHR = new XMLHttpRequest()
	let urlEncodedData = ""
	let urlEncodedDataPairs = []
	let name

	XHR.responseType = "json"

	// Turn the data object into an array of URL-encoded key/value pairs.
	for(name in data) 
	{
		urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]))
	}

	// Combine the pairs into a single string and replace all %-encoded spaces to 
	// the '+' character; matches the behaviour of browser form submissions.
	urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

	// Define what happens on successful data submission
	XHR.addEventListener('load', function(event, data) 
	{

	})	

	// Define what happens in case of error
	XHR.addEventListener('error', function(event) 
	{
		console.error('Oops! Something goes wrong.')
	})

	// Set up our request
	XHR.open('POST', target)

	// Add the required HTTP header for form data POST requests
	XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')

	XHR.onreadystatechange = function(aEvt) 
	{
		if(XHR.readyState == 4) 
		{
			if(XHR.status == 200)
			{
				let url = XHR.response["url"]
				window.location.href = `${url}?saved=true`
			}
		}
	}

	// Finally, send our data.
	XHR.send(urlEncodedData)
}

Paste.copy_to_clipboard = function(s)
{
	let textareaEl = document.createElement('textarea')

	document.body.appendChild(textareaEl)

	textareaEl.value = s
	textareaEl.select()

	document.execCommand('copy')
	document.body.removeChild(textareaEl)
}

Paste.copy_url = function()
{
	Paste.copy_to_clipboard(window.location.href)
	Paste.show_footer_message("URL Copied To Clipboard")
}

Paste.show_footer_message = function(s)
{
	clearTimeout(Paste.footer_timeout)

	Paste.footer.innerHTML = s

	Paste.footer.style.bottom = "0"

	Paste.footer_timeout = setTimeout(function()
	{
		Paste.footer.style.bottom = "-3rem"
	}, 3000)
}

Paste.remove_get_parameters_from_url = function()
{
	let url = window.location.href.split("?")[0]
	window.history.replaceState('object', document.title, url)
}

Paste.get_paste_history = function()
{
	Paste.paste_history = Paste.get_local_storage(Paste.ls_paste_history)

	if(Paste.paste_history === null)
	{
		Paste.paste_history = {}
	}

	let changed = false

	if(Paste.paste_history.items === undefined)
	{
		Paste.paste_history.items = []
		changed = true
	}

	if(changed)
	{
		Paste.save_paste_history()
	}
}

Paste.save_paste_history = function()
{
	Paste.save_local_storage(Paste.ls_paste_history, Paste.paste_history)
}

Paste.check_paste_history = function()
{
	if(!Paste.url.trim())
	{
		return false
	}

	let index = Paste.get_paste_history_item_index(Paste.url)

	if(index === -1)
	{
		Paste.paste_history.items.unshift({url:Paste.url, sample:Paste.get_sample()})

		if(Paste.paste_history.items.length > Paste.max_paste_history_items)
		{
			Paste.paste_history.items.pop()
		}
	}

	else
	{
		Paste.paste_history.items.splice(index, 1)
		Paste.paste_history.items.unshift({url:Paste.url, sample:Paste.get_sample()})
	}

	Paste.save_paste_history()
}

Paste.get_paste_history_item_index = function(url)
{
	let i = 0

	for(let item of Paste.paste_history.items)
	{
		if(item.url === url)
		{
			return i
		}

		i += 1
	}

	return -1
}

Paste.get_sample = function()
{
	let content = Paste.document.getValue()
	let sample = content.replace(/\s+/g, " ").trim().substring(0, 200)
	return sample
}

Paste.get_local_storage = function(ls_name)
{
	let obj

	if(localStorage[ls_name])
	{
		try
		{
			obj = JSON.parse(localStorage.getItem(ls_name))
		}

		catch(err)
		{
			localStorage.removeItem(ls_name)
			obj = null
		}
	}

	else
	{
		obj = null
	}

	return obj
}

Paste.save_local_storage = function(ls_name, obj)
{
	if(typeof obj !== "string")
	{
		obj = JSON.stringify(obj)
	}

	localStorage.setItem(ls_name, obj)
}

Paste.show_history = function()
{
	let s = ""

	s += "<div class='spacer1'></div>"
	s += "<div class='spacer1'></div>"

	for(let i=0; i<Paste.paste_history.items.length; i++)
	{
		let item = Paste.paste_history.items[i]

		s += `<a class='paste_history_item' href='${item.url}'>`
		s += `<div class='paste_history_item_url'>${item.url}</div>`
		s += `<div class='paste_history_item_sample'>${Paste.make_safe(item.sample)}</div>`
		s += `</a>`
	}

	s += "<div class='spacer1'></div>"

	Paste.show_modal(s)
}

Paste.show_modal = function(html)
{
	Paste.modal_inner.innerHTML = html
	Paste.overlay.style.display = "block"
	Paste.modal.style.display = "block"
}

Paste.hide_modal = function()
{
	Paste.overlay.style.display = "none"
	Paste.modal.style.display = "none"
}

Paste.new_paste = function()
{
	window.location.href = "/"
}

Paste.make_safe = function(s)
{
	let replaced = s.replace(/\</g, "&lt;").replace(/\>/g, "&gt;")
	return replaced
}

Paste.show_mode_selector = function()
{
	let s = ""

	s += "<div class='spacer1'></div>"
	s += "<div class='spacer1'></div>"

	s += "<div>"
	s += Paste.modes_string
	s += "</div>"

	s += "<div class='spacer1'></div>"
	s += "<div class='spacer1'></div>"

	Paste.show_modal(s)
}

Paste.prepare_modes = function()
{
	Paste.modes_string = ""
	Paste.modes_dict = {}
	Paste.modes = []

	for(let mode of CodeMirror.modeInfo)
	{
		Paste.modes_dict[mode.name] = mode.mode
		Paste.modes_string += `<div class='paste_mode_selector_item' onclick="Paste.change_mode('${mode.name}', true)">${mode.name}</div>`
		
		if(!Paste.modes.includes(mode.mode))
		{
			Paste.modes.push(mode.mode)
		}
	}

	Paste.mode_files_processed = 0
	Paste.load_mode_file(Paste.modes[0])
}

Paste.check_mode_files_processed = function()
{
	Paste.mode_files_processed += 1

	if(Paste.mode_files_processed < Paste.modes.length)
	{
		Paste.loading_inner.style.width = `${(Paste.mode_files_processed / Paste.modes.length) * 40}em`
		Paste.load_mode_file(Paste.modes[Paste.mode_files_processed])
	}

	else
	{
		Paste.loading_inner.style.width = "100%"
		Paste.after_mode_files_loaded()
	}
}

Paste.load_mode_file = function(mode)
{
	if(mode === "null")
	{
		Paste.check_mode_files_processed()
		return
	}

	let id = Paste.remove_non_alphanumeric(`paste_mode_${mode}`)

	let result = document.querySelector(`#${id}`)

	if(!result)
	{
		let script = document.createElement("script")
		
		script.id = id
		script.src = `codemirror/mode/${mode}/${mode}.js`
		script.async = false
		
		document.head.appendChild(script)

		let script_el = document.querySelector(`#${id}`)
	 
		script_el.addEventListener('load', function() 
		{
			Paste.check_mode_files_processed()
		})

		script_el.addEventListener('error', function() 
		{
			Paste.check_mode_files_processed()
		})
	}
}

Paste.do_change_mode = function(name, mode)
{
	Paste.editor.setOption("mode", mode)
	Paste.mode_text.innerHTML = name
	Paste.state.mode_name = name
	Paste.mode_name = name
	Paste.save_state()
}

Paste.change_mode = function(name, close_modal=false)
{
	let mode = Paste.modes_dict[name]

	if(!mode)
	{
		return false
	}

	Paste.do_change_mode(name, mode)

	if(close_modal)
	{
		Paste.hide_modal()
	}
}

Paste.set_default_mode = function()
{
	if(Paste.mode_name)
	{
		Paste.change_mode(Paste.mode_name)
	}

	else
	{
		Paste.change_mode(Paste.state.mode_name)
	}
}

Paste.remove_non_alphanumeric = function(s)
{
	return s.replace(/[\W_]+/g, "");
}

Paste.get_state = function()
{
	Paste.state = Paste.get_local_storage(Paste.ls_state)

	if(Paste.state === null)
	{
		Paste.state = {}
	}

	let changed = false

	if(Paste.state.mode_name === undefined)
	{
		Paste.state.mode_name = "JavaScript"
		changed = true
	}

	if(changed)
	{
		Paste.save_state()
	}
}

Paste.save_state = function()
{
	Paste.save_local_storage(Paste.ls_paste_state, Paste.state)
}