const Paste = {}

Paste.ls_paste_history = "paste_history_v2"
Paste.ls_mode_history = "mode_history_v1"
Paste.max_paste_history_items = 200
Paste.max_mode_history_items = 20
Paste.filter_delay = 250
Paste.default_mode = "Plain Text"
Paste.modal_type = ""
Paste.max_content_size = 500000
Paste.render_mode = false
Paste.render_delay = 1000
Paste.max_comment_length = 200

Paste.default_render_source = `
<!DOCTYPE html>

<html>

	<head>
		<style>
			body, html
			{
				color: #916aad;
				background-color: white;
				font-family: sans-serif;
				text-align: center;
			}
		</style>

		<script>
			window.onload = function()
			{
				// Script when everything is loaded -->
			}
		</script>
	</head>

	<body>
		<h1>Hello World</h1>
	</body>

</html>
`.trim()

Paste.default_comment = "Leave a comment here"

Paste.init = function()
{
	Paste.main = document.getElementById("paste_main")
	Paste.content_main = document.getElementById("paste_content_main")
	Paste.render_container = document.getElementById("paste_render_container")
	Paste.render_iframe = document.querySelector("#paste_render_iframe")
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
	Paste.comment_content = document.getElementById("paste_comment_content")
	Paste.loading = document.getElementById("paste_loading")
	
	Paste.create_editor()

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
	Paste.activate_key_detection()
	Paste.remove_content_background()
	Paste.setup_comment()
	Paste.setup_window_load()
	Paste.stop_loading_mode()

	Paste.editor.refresh()
	Paste.editor.focus()
}

Paste.remove_content_background = function()
{
	Paste.content_main.style.backgroundColor = "transparent"
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

	Paste.document = Paste.editor.getDoc()
	Paste.set_value(Paste.initial_value)

	Paste.editor.on("change", function()
	{
		if(Paste.render_mode)
		{
			Paste.render_timer()
		}
	})
}

Paste.clear_textarea = function()
{
	Paste.set_value("")
}

Paste.save_paste = function()
{
	Paste.editor.focus()

	let content = Paste.get_value()

	if(!content.trim())
	{
		Paste.show_footer_message("Can't Save An Empty Paste", false)
		Paste.play_audio("nope")
		return false
	}

	if(content.length > Paste.max_content_size)
	{
		Paste.show_footer_message("Paste Is Too Big", false)
		Paste.play_audio("nope")
		return false
	}

	if(!Paste.paste_is_modified())
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

	Paste.send_post("save.php", {content:content, mode_name:Paste.mode_name, comment:Paste.get_comment()})
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
				if(XHR.response)
				{
					let url = XHR.response["url"]
					
					if(url)
					{
						Paste.go_to_location(`${url}?saved=true`)
					}
				}
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
	
	Paste.copy_to_clipboard(window.location.href)
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

	let obj = {url:Paste.url, sample:Paste.get_sample(), mode_name:Paste.mode_name, comment:Paste.comment}

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
	let content = Paste.get_value()
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

Paste.make_paste_history_string = function()
{
	let s = ""

	s += "<div class='spacer1'></div>"

	for(let i=0; i<Paste.paste_history.items.length; i++)
	{
		let item = Paste.paste_history.items[i]

		s += `<a class='paste_modal_item paste_history_item paste_unselectable' href='${item.url}' onmouseenter='Paste.on_modal_item_mouseenter(this)'>`

		if(item.comment)
		{
			s += `<div class='paste_history_item_comment'>${Paste.make_safe(item.comment.substring(0, 50))}</div>`
		}

		s += `<div class='paste_history_item_url'>${item.url}</div>`

		if(item.mode_name)
		{
			s += `<div class='paste_history_item_mode_name'>(${item.mode_name})</div>`
		}
		
		s += `<div class='paste_history_item_sample'>${Paste.make_safe(item.sample)}</div>`
		s += `</a>`
	}
	
	s += "<div class='spacer1'></div>"

	Paste.paste_history_string = s
}

Paste.show_paste_history = function()
{
	if(!Paste.paste_history_string)
	{
		Paste.make_paste_history_string()
	}

	Paste.show_modal(Paste.paste_history_string, "Paste History")
}

Paste.highlight_modal_item = function(el, scroll=false)
{	
	if(!el)
	{
		return false
	}
	
	Paste.remove_modal_item_highlight()
	
	el.classList.add("paste_modal_item_highlighted")

	if(scroll)
	{
		el.scrollIntoView({block:"center"})
	}
}

Paste.on_modal_item_mouseenter = function(el)
{
	Paste.highlight_modal_item(el)
}

Paste.setup_modal = function()
{
	Paste.modal_titlebar_inner.addEventListener("click", function()
	{
		Paste.scroll_modal_to_top()
	})
}

Paste.get_first_visible_modal_item = function()
{
	let items = Array.from(document.querySelectorAll(".paste_modal_item"))

	for(let item of items)
	{
		if(item.style.display !== "none")
		{
			return item
		}
	}

	return false
}

Paste.get_highlighted_modal_item = function()
{
	return document.querySelector(".paste_modal_item_highlighted")
}

Paste.click_highlighted_modal_item = function()
{
	let item = Paste.get_highlighted_modal_item()

	if(item)
	{
		item.click()
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
		if(item.innerText.toLowerCase().includes(lc_value))
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

Paste.do_mode_selector_filter = function(value)
{
	let lc_value = value.toLowerCase()

	let items = Array.from(document.querySelectorAll(".paste_mode_selector_item"))

	for(let item of items)
	{
		if(item.innerText.toLowerCase().includes(lc_value))
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

Paste.after_filter = function()
{
	Paste.update_modal_scrollbar()
	Paste.scroll_modal_to_top()
	Paste.highlight_first_modal_item()
}

Paste.remove_modal_item_highlight = function()
{
	let el = Paste.get_highlighted_modal_item()

	if(el)
	{
		el.classList.remove("paste_modal_item_highlighted")
	}
}

Paste.get_modal_items = function()
{
	return Array.from(document.querySelectorAll(".paste_modal_item"))
}

Paste.highlight_first_modal_item = function()
{
	let item = Paste.get_first_visible_modal_item()

	Paste.highlight_modal_item(item)
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
	Paste.highlight_first_modal_item()
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

Paste.go_to_location = function(url)
{
	window.location.href = url
}

Paste.new_paste = function()
{
	if(Paste.url)
	{
		Paste.go_to_location("/")
	}

	else
	{
		Paste.set_value("")
		Paste.set_comment("")
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

Paste.prepare_modes = function()
{
	Paste.modes_array = []

	Paste.custom_modes = 
	[
		{
			name: "HTML Render",
			mode: "htmlmixed"
		}
	]

	for(let mode of CodeMirror.modeInfo.concat(Paste.custom_modes))
	{
		let obj = {}

		obj.position = 0
		obj.mode = mode.mode
		obj.name = mode.name
		obj.string = `
		<div class='paste_modal_item paste_mode_selector_item' 
		onclick="Paste.change_mode('${mode.name}', true)" 
		onmouseenter="Paste.on_modal_item_mouseenter(this)">${mode.name}</div>`
		
		Paste.modes_array.push(obj)
	}
}

Paste.order_modes = function()
{
	let mode_history_length = Paste.mode_history.items.length

	for(let mode of Paste.modes_array)
	{
		let index = Paste.get_mode_history_item_index(mode.name)
		mode.position = index > -1 ? index : mode_history_length
	}

	Paste.modes_array.sort(function(a, b) 
	{
		return a.position - b.position
	})

	Paste.modes_string = Paste.modes_array.map(m => m.string).join("")
}

Paste.render_timer = (function(value)
{
	let timer

	return function(value)
	{
		clearTimeout(timer)

		timer = setTimeout(function()
		{
			if(Paste.render_mode)
			{
				Paste.do_render()
			}
		}, Paste.render_delay)
	}
})()

Paste.do_render = function()
{
	let doc = Paste.render_iframe.contentWindow.document

	doc.open()
	doc.write(Paste.get_value())
	doc.close()
}

Paste.start_render_mode = function()
{
	Paste.render_container.style.display = "block"
	
	Paste.render_mode = true

	if(!Paste.get_value().trim().length)
	{
		Paste.set_value(Paste.default_render_source)
	}

	else
	{
		Paste.do_render()
	}
}

Paste.start_normal_mode = function()
{
	Paste.render_container.style.display = "none"

	Paste.render_mode = false

	if(Paste.get_value() === Paste.default_render_source)
	{
		Paste.set_value("")
	}
}

Paste.do_change_mode = function(name, mode)
{
	if(name === "HTML Render")
	{
		if(!Paste.render_mode)
		{
			Paste.start_render_mode()
		}
	}

	else
	{
		if(Paste.render_mode)
		{
			Paste.start_normal_mode()
		}
	}

	Paste.editor.setOption("mode", mode)
	Paste.mode_text.innerHTML = name
	Paste.mode_name = name
	Paste.push_to_mode_history()
	Paste.order_modes()
}

Paste.get_mode_by_name = function(name)
{
	for(let mode of Paste.modes_array)
	{
		if(mode.name === name)
		{
			return mode.mode
		}
	}

	return false
}

Paste.change_mode = function(name, hide_modal=false)
{
	let mode = Paste.get_mode_by_name(name)

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
			{mode_name: "HTML Render"},
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

Paste.trigger_filter = function()
{
	Paste.modal_filter_timer(Paste.modal_filter.value.trim())
}

Paste.activate_key_detection = function()
{
	document.addEventListener("keydown", function(e)
	{
		if(Paste.modal_type)
		{
			if(document.activeElement !== Paste.modal_filter)
			{
				Paste.modal_filter.focus()
			}
		}
	})

	document.addEventListener("keyup", function(e)
	{
		if(Paste.modal_type)
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
					Paste.trigger_filter()
				}
			}

			else if(e.key === "Enter")
			{
				Paste.click_highlighted_modal_item()
			}

			else if(e.key === "ArrowUp")
			{
				Paste.modal_item_up()
			}

			else if(e.key === "ArrowDown")
			{
				Paste.modal_item_down()
			}
			
			else
			{
				Paste.trigger_filter()
			}
		}

		else if(document.activeElement === Paste.comment_content)
		{
			if(e.key === "Enter")
			{
				Paste.save_paste()
			}
		}

		else
		{
			if(e.key === "Escape")
			{
				Paste.show_paste_history()
			}
		}
	})
}

Paste.get_visible_modal_items = function()
{
	let visible = []

	let items = Array.from(document.querySelectorAll(".paste_modal_item"))

	for(item of items)
	{
		if(item.style.display !== "none")
		{
			visible.push(item)
		}
	}

	return visible
}

Paste.modal_item_up = function()
{
	let items = Paste.get_visible_modal_items().slice(0).reverse()

	let index = -1

	let i = 0

	for(let item of items)
	{
		if(item.classList.contains("paste_modal_item_highlighted"))
		{
			index = i
			break
		}

		i += 1
	}

	if(index === -1)
	{
		return false
	}

	let nindex = index + 1

	if(nindex < items.length)
	{
		Paste.highlight_modal_item(items[nindex], true)
	}
}

Paste.modal_item_down = function()
{
	let items = Paste.get_visible_modal_items()

	let index = -1

	let i = 0

	for(let item of items)
	{
		if(item.classList.contains("paste_modal_item_highlighted"))
		{
			index = i
			break
		}

		i += 1
	}

	if(index === -1)
	{
		return false
	}

	let nindex = index + 1

	if(nindex < items.length)
	{
		Paste.highlight_modal_item(items[nindex], true)
	}
}

Paste.paste_is_modified = function()
{
	if(Paste.get_value() === Paste.initial_value && Paste.mode_name === Paste.original_mode_name && Paste.get_comment() === Paste.comment)
	{
		return false
	}

	return true
}

Paste.get_value = function()
{
	return Paste.document.getValue()
}

Paste.set_value = function(s)
{
	Paste.document.setValue(s)
}

Paste.setup_comment = function()
{
	Paste.comment_content.innerText = Paste.comment

	Paste.comment_content.addEventListener("input", function()
	{
		let val = Paste.get_comment()

		if(val.length === 0)
		{
			Paste.set_comment(val)
		}

		if(val.length > Paste.max_comment_length)
		{
			val = val.substring(0, Paste.max_comment_length).trim()
			Paste.set_comment(val)
		}
	})
}

Paste.clean_string2 = function(s)
{
	return s.replace(/\s+/g, ' ').trim()
}

Paste.get_comment = function()
{
	return Paste.clean_string2(Paste.comment_content.innerText)
}

Paste.set_comment = function(val)
{
	Paste.comment_content.innerText = val
}

Paste.setup_window_load = function()
{
	window.onbeforeunload = function()
	{
		Paste.start_loading_mode()
	}
}

Paste.stop_loading_mode = function()
{
	Paste.main.style.opacity = 1
	Paste.loading.style.display = "none"
}

Paste.start_loading_mode = function()
{
	Paste.main.style.opacity = 0
	Paste.loading.style.display = "block"
}