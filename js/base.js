const Paste = {}

Paste.ls_paste_history = "paste_history_v1"
Paste.ls_mode_history = "mode_history_v1"
Paste.max_paste_history_items = 200
Paste.max_mode_history_items = 20
Paste.filter_delay = 250
Paste.default_mode = "Plain Text"
Paste.modal_type = ""

Paste.init = function()
{
	Paste.main = document.getElementById("paste_main")
	Paste.textarea = document.getElementById("paste_textarea")
	Paste.footer = document.getElementById("paste_footer")
	Paste.modal = document.getElementById("paste_modal")
	Paste.modal_titlebar_inner = document.getElementById("paste_modal_titlebar_inner")
	Paste.modal_filter = document.getElementById("paste_modal_filter")
	Paste.modal_inner = document.getElementById("paste_modal_inner")
	Paste.overlay = document.getElementById("paste_overlay")
	Paste.mode_text = document.getElementById("paste_mode_text")
	Paste.audio_nope = document.getElementById("paste_audio_nope")
	Paste.audio_succ = document.getElementById("paste_audio_succ")
	Paste.audio_succ2 = document.getElementById("paste_audio_succ2")
	Paste.create_editor()
	Paste.document = Paste.editor.getDoc()
	Paste.document.setValue(Paste.initial_value)

	if(Paste.saved)
	{
		Paste.show_footer_message("Paste Succesfully Saved", true)
		Paste.play_audio("succ")
	}

	Paste.remove_get_parameters_from_url()
	Paste.get_paste_history()
	Paste.get_mode_history()
	Paste.check_paste_history()
	Paste.prepare_modes()
	Paste.set_default_mode()
	Paste.start_scrollbars()
	Paste.setup_modal()
	Paste.editor.refresh()
	Paste.editor.focus()
}

Paste.create_editor = function()
{
	Paste.editor = CodeMirror.fromTextArea(Paste.textarea,
	{
		lineNumbers: true,
		theme: "dracula",
		indentWithTabs: true,
		scrollbarStyle: "simple",
		tabSize: 4,
		lineWrapping: true,
		indentUnit: 4
	})
}

Paste.clear_textarea = function()
{
	Paste.document.setValue("")
}

Paste.save_paste = function()
{
	Paste.editor.focus()

	let content = Paste.document.getValue()

	if(!content.trim())
	{
		Paste.show_footer_message("Can't Save An Empty Paste", false)
		Paste.play_audio("nope")
		return false
	}

	if(content === Paste.initial_value && Paste.mode_name === Paste.original_mode_name)
	{
		Paste.show_footer_message("Nothing Has Changed", false)
		Paste.play_audio("nope")
		return false
	}

	if(Paste.posting)
	{
		Paste.show_footer_message("Paste Save Already In Progress", false)
		Paste.play_audio("nope")
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
	if(!Paste.url)
	{
		Paste.show_footer_message("This Is Not A Saved Paste", false)
		Paste.play_audio("nope")
	}

	else
	{
		Paste.copy_to_clipboard(window.location.href)
		Paste.show_footer_message("URL Copied To Clipboard", true)
		Paste.play_audio("succ2")
		Paste.editor.focus()
	}
}

Paste.show_footer_message = function(s, succ)
{
	clearTimeout(Paste.footer_timeout)

	Paste.footer.innerHTML = s

	if(succ)
	{
		Paste.footer.style.backgroundColor = "#5bab70"
	}

	else
	{
		Paste.footer.style.backgroundColor = "#c05f5f"
	}

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

Paste.push_to_paste_history = function(save=true)
{
	let index = Paste.get_paste_history_item_index(Paste.url)

	let obj = {url:Paste.url, sample:Paste.get_sample(), mode_name:Paste.mode_name}

	if(index === -1)
	{
		Paste.paste_history.items.unshift(obj)

		if(Paste.paste_history.items.length > Paste.max_paste_history_items)
		{
			Paste.paste_history.items.pop()
		}
	}

	else
	{
		Paste.paste_history.items.splice(index, 1)
		Paste.paste_history.items.unshift(obj)
	}

	if(save)
	{
		Paste.save_paste_history()
	}
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

Paste.check_paste_history = function()
{
	if(!Paste.url.trim())
	{
		return false
	}

	Paste.push_to_paste_history()
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

Paste.show_paste_history = function()
{
	let s = ""

	s += "<div class='spacer1'></div>"

	for(let i=0; i<Paste.paste_history.items.length; i++)
	{
		let item = Paste.paste_history.items[i]

		s += `<a class='modal_item paste_history_item paste_unselectable' href='${item.url}'>`
		s += `<div class='paste_history_item_url'>${item.url}</div>`

		if(item.mode_name)
		{
			s += `<div class='paste_history_item_mode_name'>(${item.mode_name})</div>`
		}
		
		s += `<div class='paste_history_item_sample'>${Paste.make_safe(item.sample)}</div>`
		s += `</a>`
	}

	s += "<div class='spacer1'></div>"

	Paste.show_modal(s, "Paste History")
}

Paste.setup_modal = function()
{
	Paste.modal_filter.addEventListener("keyup", function(e)
	{
		if(e.key === "Escape")
		{
			if(Paste.modal_filter.value === "")
			{
				Paste.hide_modal()
			}

			else
			{
				Paste.modal_filter.value = ""
			}
		}

		if(e.key === "Enter")
		{
			Paste.click_first_modal_item()
		}
		
		Paste.modal_filter_timer(Paste.modal_filter.value.trim())
	})

	Paste.modal_titlebar_inner.addEventListener("click", function()
	{
		Paste.scroll_modal_to_top()
	})
}

Paste.click_first_modal_item = function()
{
	let items = Array.from(document.querySelectorAll(".modal_item"))

	for(let item of items)
	{
		if(item.style.display !== "none")
		{
			item.click()
			return
		}
	}
}

Paste.modal_filter_timer = (function(value)
{
	let timer

	return function(value)
	{
		clearTimeout(timer)

		timer = setTimeout(function()
		{
			if(Paste.modal_type === "Paste History")
			{
				Paste.do_paste_history_filter(value)
			}

			else if(Paste.modal_type === "Language Mode")
			{
				Paste.do_mode_selector_filter(value)
			}
		}, Paste.filter_delay)
	}
})()

Paste.do_paste_history_filter = function(value)
{
	let lc_value = value.toLowerCase()

	let items = Array.from(document.querySelectorAll(".paste_history_item"))

	for(let item of items)
	{
		if(item.innerHTML.toLowerCase().includes(lc_value))
		{
			item.style.display = "initial"
		}

		else
		{
			item.style.display = "none"
		}
	}

	Paste.after_filter()
}

Paste.after_filter = function()
{
	Paste.update_modal_scrollbar()
	Paste.scroll_modal_to_top()
}

Paste.show_modal = function(html, title)
{
	Paste.modal_filter.value = ""
	Paste.modal_titlebar_inner.innerHTML = title
	Paste.modal_inner.innerHTML = html
	Paste.overlay.style.display = "block"
	Paste.modal.style.display = "flex"
	Paste.update_modal_scrollbar()
	Paste.scroll_modal_to_top()
	Paste.modal_filter.focus()
	Paste.modal_type = title
}

Paste.hide_modal = function()
{
	Paste.overlay.style.display = "none"
	Paste.modal.style.display = "none"
	Paste.modal_type = ""
	Paste.editor.focus()
}

Paste.scroll_modal_to_top = function()
{
	Paste.modal_inner.scrollTop = 0
}

Paste.new_paste = function()
{
	if(Paste.url)
	{
		window.location.href = "/"		
	}

	else
	{
		Paste.document.setValue("")
		Paste.change_mode(Paste.default_mode)
		Paste.editor.focus()
	}
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

	s += "<div id='paste_mode_selector_container' class='paste_unselectable'>"
	s += Paste.modes_string
	s += "</div>"

	s += "<div class='spacer1'></div>"
	s += "<div class='spacer1'></div>"

	Paste.show_modal(s, "Language Mode")
}

Paste.do_mode_selector_filter = function(value)
{
	let lc_value = value.toLowerCase()

	let items = Array.from(document.querySelectorAll(".paste_mode_selector_item"))

	for(let item of items)
	{
		if(item.innerHTML.toLowerCase().includes(lc_value))
		{
			item.style.display = "flex"
		}

		else
		{
			item.style.display = "none"
		}
	}

	Paste.after_filter()
}

Paste.prepare_modes = function()
{
	Paste.modes_string = ""
	Paste.modes_dict = {}
	
	let modes_string_array = []

	for(let mode of CodeMirror.modeInfo)
	{
		Paste.modes_dict[mode.name] = mode.mode

		let pindex = Paste.get_mode_history_item_index(mode.name)

		let position

		if(pindex === -1)
		{
			position = Object.keys(Paste.mode_history.items).length
		}

		else
		{
			position = pindex
		}

		modes_string_array.push({position:position, string:`<div class='modal_item paste_mode_selector_item' onclick="Paste.change_mode('${mode.name}', true)">${mode.name}</div>`})
	}

	modes_string_array.sort(function(a, b) 
	{
		return a.position - b.position
	})

	Paste.modes_string = modes_string_array.map(e => e.string).join("")
}

Paste.do_change_mode = function(name, mode)
{
	Paste.editor.setOption("mode", mode)

	Paste.mode_text.innerHTML = name
	
	Paste.mode_name = name

	Paste.push_to_mode_history()

	Paste.prepare_modes()
}

Paste.change_mode = function(name, hide_modal=false)
{
	let mode = Paste.modes_dict[name]

	if(!mode)
	{
		return false
	}

	Paste.do_change_mode(name, mode)

	if(hide_modal)
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
		Paste.change_mode(Paste.default_mode)
	}
}

Paste.remove_non_alphanumeric = function(s)
{
	return s.replace(/[\W_]+/g, "");
}

Paste.start_scrollbars = function()
{
	Paste.modal_scrollbar = new PerfectScrollbar("#paste_modal_inner",
	{
		minScrollbarLength: 50,
		suppressScrollX: true,
		scrollingThreshold: 3000,
		wheelSpeed: 0.8,
		handlers: ['drag-thumb', 'wheel', 'touch']
	})
}

Paste.update_modal_scrollbar = function()
{
	if(Paste.modal_scrollbar !== undefined)
	{
		if(Paste.modal_scrollbar.element !== null)
		{
			Paste.modal_scrollbar.update()
		}
	}
}

Paste.get_mode_history = function()
{
	Paste.mode_history = Paste.get_local_storage(Paste.ls_mode_history)

	if(Paste.mode_history === null)
	{
		Paste.mode_history = {}
	}

	let changed = false

	if(Paste.mode_history.items === undefined)
	{
		let array = 
		[
			{mode_name: "Plain Text"},
			{mode_name: "JavaScript"}, 
			{mode_name: "HTML"},
			{mode_name: "CSS"},
			{mode_name: "Python"},
			{mode_name: "Java"}
		]

		Paste.mode_history.items = array

		changed = true
	}

	if(changed)
	{
		Paste.save_mode_history()
	}
}

Paste.save_mode_history = function()
{
	Paste.save_local_storage(Paste.ls_mode_history, Paste.mode_history)
}

Paste.push_to_mode_history = function(save=true)
{
	let index = Paste.get_mode_history_item_index(Paste.mode_name)

	let obj = {mode_name:Paste.mode_name}

	if(index === -1)
	{
		Paste.mode_history.items.unshift(obj)

		if(Paste.mode_history.items.length > Paste.max_mode_history_items)
		{
			Paste.mode_history.items.pop()
		}
	}

	else
	{
		Paste.mode_history.items.splice(index, 1)
		Paste.mode_history.items.unshift(obj)
	}

	if(save)
	{
		Paste.save_mode_history()
	}
}

Paste.get_mode_history_item_index = function(mode_name)
{
	let i = 0

	for(let item of Paste.mode_history.items)
	{
		if(item.mode_name === mode_name)
		{
			return i
		}

		i += 1
	}

	return -1
}

Paste.play_audio = function(type)
{
	let el = Paste[`audio_${type}`]
	el.pause()
	el.currentTime = 0
	el.play()
}