const Paste = {}

Paste.ls_paste_history = "paste_history_v1"
Paste.max_paste_history_items = 200

Paste.init = function()
{
	Paste.textarea = document.getElementById("paste_textarea")
	Paste.footer = document.getElementById("paste_footer")
	Paste.modal = document.getElementById("paste_modal")
	Paste.modal_inner = document.getElementById("paste_modal_inner")
	Paste.overlay = document.getElementById("paste_overlay")

	Paste.editor = CodeMirror.fromTextArea(Paste.textarea,
	{
		lineNumbers: true,
		theme: "dracula",
		mode: "javascript",
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

	if(content === Paste.initial_value)
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

	Paste.send_post("save.php", {content:content})
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