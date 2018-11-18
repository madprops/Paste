const Paste = {}

Paste.ls_paste_history = "paste_history_v2"
Paste.ls_mode_history = "mode_history_v1"
Paste.ls_tokens = "tokens_v1"
Paste.max_paste_history_items = 200
Paste.max_mode_history_items = 20
Paste.filter_delay = 250
Paste.default_mode = "Plain Text"
Paste.modal_type = ""
Paste.max_content_length = 500000
Paste.max_comment_length = 200
Paste.render_mode = false
Paste.render_delay = 1000
Paste.is_loading = true
Paste.leaving = false
Paste.updated = false

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
	Paste.toolbar_update = document.getElementById("paste_toolbar_update")
	Paste.toolbar_save = document.getElementById("paste_toolbar_save")
	
	Paste.check_save()
	Paste.create_editor()
	Paste.remove_get_parameters_from_url()
	Paste.get_paste_history()
	Paste.get_mode_history()
	Paste.get_tokens()
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
	Paste.setup_render()
	Paste.check_ownership()

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
	Paste.set_content(Paste.initial_content)

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
	Paste.set_content("")
}

Paste.update_paste = function()
{
	Paste.save_paste(true)
}

Paste.paste_is_empty = function()
{
	let content = Paste.get_content(true)
	let comment = Paste.get_comment()

	if(!content && !comment)
	{
		return true
	}

	return false
}

Paste.save_paste = function(update=false)
{
	if(update && !Paste.owner)
	{
		return false
	}

	Paste.editor.focus()

	let content = Paste.get_content()

	if(Paste.paste_is_empty())
	{
		Paste.show_footer_message("Can't Save An Empty Paste", false)
		Paste.play_audio("nope")
		return false
	}

	if(content.length > Paste.max_content_length)
	{
		Paste.show_footer_message("Paste Is Too Big", false)
		Paste.play_audio("nope")
		return false
	}

	if(Paste.posting)
	{
		Paste.show_footer_message("Paste Save Already In Progress", false)
		Paste.play_audio("nope")
		return false
	}

	let token

	if(update)
	{
		token = Paste.get_token_by_url(Paste.url)
	}

	else
	{
		token = ""
	}

	let onsuccess = function(response)
	{
		let url = response["url"]
		let token = response["token"]

		if(url && token)
		{
			Paste.push_to_tokens(url, token)
		}

		if(url)
		{
			if(url === Paste.url)
			{
				Paste.after_update()
			}

			else
			{
				Paste.go_to_location(`${url}?saved=true`)
			}
		}
	}

	Paste.send_post("save.php", 
	{
		content: content, 
		mode_name: Paste.mode_name, 
		comment: Paste.get_comment(), 
		token: token
	}, onsuccess)
}

Paste.send_post = function(target, data, onsuccess)
{
	Paste.posting = true

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
		Paste.posting = false
	})	

	// Define what happens in case of error
	XHR.addEventListener('error', function(event) 
	{
		Paste.posting = false
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
					onsuccess(XHR.response)
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
	Paste.change_url(url)
}

Paste.change_url = function(url, replace=true)
{
	if(replace)
	{
		window.history.replaceState('object', document.title, url)
	}

	else
	{
		window.history.pushState('object', document.title, url)
	}
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

	let obj = {url:Paste.url, sample:Paste.get_sample(), mode_name:Paste.mode_name, comment:Paste.initial_comment}

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

Paste.after_update = function()
{
	Paste.updated = true
	Paste.initial_content = Paste.get_content()
	Paste.initial_mode_name = Paste.mode_name
	Paste.initial_comment = Paste.get_comment()
	Paste.update_paste_history()
	Paste.show_save_success(true)
}

Paste.update_paste_history = function()
{
	Paste.check_paste_history()
	Paste.paste_history_string = ""
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
	let content = Paste.get_content()
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

		let info = ""

		if(Paste.get_token_by_url(item.url))
		{
			info = " (Owner)"
		}

		s += `<div class='paste_modal_item paste_history_item paste_unselectable' 
		onclick='Paste.on_history_item_click("${item.url}")' 
		onmouseenter='Paste.on_modal_item_mouseenter(this)'>`

		if(item.comment)
		{
			s += `<div class='paste_history_item_comment'>${Paste.make_safe(item.comment.substring(0, 50))}</div>`
		}

		s += `<div class='paste_history_item_url'>${item.url}</div>`

		if(item.mode_name)
		{
			s += `<div class='paste_history_item_mode_name'>(${item.mode_name})${info}</div>`
		}
		
		s += `<div class='paste_history_item_sample'>${Paste.make_safe(item.sample)}</div>`
		s += `</div>`
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
			Paste.do_modal_filter(value)
		}, Paste.filter_delay)
	}
})()

Paste.do_modal_filter = function(value)
{
	let lc_value = Paste.clean_string2(value).toLowerCase()

	let items = Array.from(document.querySelectorAll(".paste_modal_item"))

	let display = "block"

	if(lc_value)
	{
		let words = lc_value.split(" ")

		for(let item of items)
		{
			let item_value = item.innerText.toLowerCase()

			let found = true

			for(let word of words)
			{
				if(!item_value.includes(word))
				{
					found = false
					break
				}
			}

			if(found)
			{
				item.style.display = display
			}

			else
			{
				item.style.display = "none"
			}
		}
	}

	else
	{
		for(let item of items)
		{
			item.style.display = display
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
	Paste.leaving = true
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
		Paste.set_content("")
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
				Paste.render()
			}
		}, Paste.render_delay)
	}
})()

Paste.setup_render = function()
{
	Paste.render_iframe.addEventListener("load", function()
	{
		if(Paste.render_mode)
		{
			Paste.do_render()
		}
	})
}

Paste.reset_render_iframe = function()
{
	Paste.render_iframe.src = `about:blank?t=${Date.now()}_${Paste.get_random_string(4)}`
}

Paste.render = function()
{
	Paste.reset_render_iframe()
}

Paste.do_render = function()
{
	let doc = Paste.render_iframe.contentWindow.document

	doc.open()
	doc.write(Paste.get_content())
	doc.close()
}

Paste.start_render_mode = function()
{
	Paste.render_container.style.display = "block"
	
	Paste.render_mode = true

	if(!Paste.get_content(true).length)
	{
		Paste.set_content(Paste.default_render_source)
	}

	else
	{
		Paste.render()
	}
}

Paste.start_normal_mode = function()
{
	Paste.render_container.style.display = "none"

	Paste.render_mode = false

	if(Paste.get_content() === Paste.default_render_source)
	{
		Paste.set_content("")
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
		Paste.initial_mode_name = Paste.mode_name
	}

	else
	{
		Paste.initial_mode_name = Paste.default_mode
	}
	
	Paste.change_mode(Paste.initial_mode_name)
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
	Paste.modal_filter_timer(Paste.modal_filter.value)
}

Paste.activate_key_detection = function()
{
	document.addEventListener("keydown", function(e)
	{
		if(Paste.is_loading)
		{
			return false
		}

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
		if(Paste.is_loading)
		{
			return false
		}
		
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
	if
	(
		Paste.get_content() === Paste.initial_content &&
		Paste.mode_name === Paste.initial_mode_name &&
		Paste.get_comment() === Paste.initial_comment
	)
	{
		return false
	}

	return true
}

Paste.get_content = function(trim=false)
{
	let value = Paste.document.getValue()

	if(trim)
	{
		value = value.trim()
	}

	return value
}

Paste.set_content = function(s)
{
	Paste.document.setValue(s)
}

Paste.setup_comment = function()
{
	Paste.comment_content.innerText = Paste.initial_comment

	Paste.comment_content.addEventListener("blur", function()
	{
		Paste.set_comment(Paste.get_comment())
	})
}

Paste.clean_string2 = function(s)
{
	return s.replace(/\s+/g, ' ').trim()
}

Paste.get_comment = function()
{
	return Paste.clean_string2(Paste.comment_content.innerText).substring(0, Paste.max_comment_length).trim()
}

Paste.set_comment = function(val)
{
	Paste.comment_content.innerText = val
}

Paste.setup_window_load = function()
{
	window.onbeforeunload = function()
	{
		if(!Paste.leaving && Paste.paste_is_modified())
		{
			return "Are you sure?"
		}

		else
		{
			Paste.start_loading_mode(true)
		}
	}
}

Paste.stop_loading_mode = function()
{
	Paste.loading.style.display = "none"
	Paste.is_loading = false
}

Paste.start_loading_mode = function()
{
	if(Paste.modal_type)
	{
		Paste.hide_modal()
	}
	
	Paste.loading.style.display = "flex"
	Paste.is_loading = true
}

Paste.get_random_int = function(min, max)
{
	return Math.floor(Math.random() * (max  -min + 1) + min)
}	

Paste.get_random_string = function(n)
{
	let text = ""

	let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

	for(let i=0; i < n; i++)
	{
		text += possible[Paste.get_random_int(0, possible.length - 1)]
	}

	return text
}

Paste.get_token_by_url = function(url)
{
	return Paste.tokens.items[url] || ""
}

Paste.get_tokens = function()
{
	Paste.tokens = Paste.get_local_storage(Paste.ls_tokens)

	if(Paste.tokens === null)
	{
		Paste.tokens = {}
	}

	let changed = false

	if(Paste.tokens.items === undefined)
	{
		Paste.tokens.items = {}

		changed = true
	}

	if(changed)
	{
		Paste.save_tokens()
	}
}

Paste.save_tokens = function()
{
	Paste.save_local_storage(Paste.ls_tokens, Paste.tokens)
}

Paste.push_to_tokens = function(url, token, save=true)
{
	Paste.tokens.items[url] = token

	if(save)
	{
		Paste.save_tokens()
	}
}

Paste.check_ownership = function()
{
	if(Paste.get_token_by_url(Paste.url))
	{
		Paste.owner = true
		Paste.toolbar_update.classList.remove("paste_disabled")
	}

	else
	{
		Paste.owner = false
		Paste.toolbar_update.classList.add("paste_disabled")
	}
}

Paste.show_save_success = function(update=false)
{
	if(update)
	{
		Paste.show_footer_message("Paste Updated", true)
	}

	else
	{
		Paste.show_footer_message("Paste Saved", true)
	}

	Paste.play_audio("succ")
}

Paste.on_history_item_click = function(url)
{
	Paste.go_to_location(url)
}

Paste.check_save = function()
{
	if(Paste.saved)
	{
		Paste.show_save_success()
	}
}