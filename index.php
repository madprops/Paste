<?php

	error_reporting(E_ALL);
	ini_set('display_errors', 'on');

	function is_null_or_empty_string($str)
	{
		return (!isset($str) || trim($str) === '');
	}

	$saved = isset($_GET["saved"]);

	$ourl = $_SERVER['REQUEST_URI'];
	$ourl = strtok($ourl, '?');
	$exploded = explode("/", $ourl);
	$url = array_pop($exploded);

	if(is_null_or_empty_string($url))
	{
		$code = "";
		$content = "";
		$title = "Paste";
		$revision = 1;
		$mode_name = "";
	}

	else
	{
		$url_split = explode("-", $url);
		$code = $url_split[0] . "-" . $url_split[1];
		$revision = $url_split[2];

		// Create a new database, if the file doesn't exist and open it for reading/writing.
		// The extension of the file is arbitrary.
		$db = new SQLite3('pastes_v3.sqlite', SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);

		// Create a table.
		$db->query('CREATE TABLE IF NOT EXISTS "pastes" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			"content" VARCHAR,
			"mode_name" VARCHAR,
			"code" VARCHAR,
			"revision" INTEGER,
			"date" DATETIME
		)');

		$statement = $db->prepare('SELECT * FROM "pastes" WHERE "code" = ? AND "revision" = ?');
		$statement->bindValue(1, $code);
		$statement->bindValue(2, $revision);
		$result = $statement->execute();
		$array = $result->fetchArray(SQLITE3_ASSOC);
		$content = $array["content"];
		$mode_name = $array["mode_name"];

		if(is_null_or_empty_string($content))
		{
			header("Location: /");
			exit();
		}

		$title = "Paste - " . $url;

		$db->close();
	}

?>

<!doctype html>

<html>
<head>
	<title><?php echo $title ?></title>
	<link rel="icon" type="image/png" href="/favicon.png"/>
	<link rel='stylesheet' href='/codemirror/lib/codemirror.css'>
	<link rel='stylesheet' href='/codemirror/theme/dracula.css'>
	<link rel='stylesheet' href='/codemirror/addon/scroll/simplescrollbars.css'>
	<link rel='stylesheet' href='/css/perfect-scrollbar.css'>
	<link rel='stylesheet' href='/css/style.css?version=17'>
	<script src='/codemirror/lib/codemirror.js'></script>
	<script src='/codemirror/addon/mode/overlay.js'></script>
	<script src='/codemirror/addon/mode/simple.js'></script>
	<script src='/codemirror/addon/mode/multiplex.js'></script>
	<script src='/codemirror/addon/mode/loadmode.js'></script>
	<script src='/codemirror/mode/mode_bundle_min.js'></script>
	<script src='/codemirror/mode/meta.js'></script>
	<script src='/codemirror/addon/scroll/simplescrollbars.js'></script>
	<script src='/js/perfect-scrollbar.min.js'></script>
	<script src='/js/base.js?version=44'></script>
	<script>
		window.onload = function()
		{
			Paste.url = <?php echo json_encode($url); ?>;
			Paste.initial_value = <?php echo json_encode($content); ?>;
			Paste.saved = <?php echo json_encode($saved); ?>;
			Paste.original_mode_name = <?php echo json_encode($mode_name); ?>;
			Paste.mode_name = <?php echo json_encode($mode_name); ?>;
			Paste.init()
		}
	</script>
</head>
<body>
	<div id='paste_main'>
		<div id='paste_toolbar' class='paste_unselectable'>
			<div id='paste_toolbar_save' class='paste_toolbar_button_container' onclick='Paste.save_paste()'>
				<span class='paste_toolbar_button'>Save Paste</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_toolbar_button_container paste_border_left' onclick='Paste.new_paste()'>
				<span class='paste_toolbar_button'>New Paste</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_toolbar_button_container paste_border_left' onclick='Paste.copy_url()'>
				<span class='paste_toolbar_button'>Copy URL</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_toolbar_button_container paste_border_left' onclick='Paste.show_paste_history()'>
				<span class='paste_toolbar_button'>Paste History</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_toolbar_button_container paste_border_left' onclick='Paste.show_mode_selector()'>
				<span class='paste_toolbar_button' id='paste_mode_text'>---</span>
			</div>
		</div>
		<div id='paste_content_main'>
			<textarea id='paste_textarea'></textarea>
		</div>
	</div>
	<div id='paste_overlay' onclick='Paste.hide_modal()'></div>
	<div id='paste_modal'>
		<div id='paste_modal_titlebar' class='paste_unselectable'>
			<div id='paste_modal_titlebar_inner'></div>
		</div>
		<div id='paste_modal_filter_container'>
			<input type='text' id='paste_modal_filter' placeholder='Filter'>
		</div>
		<div id='paste_modal_inner'></div>
	</div>
	<div id='paste_footer' class='paste_unselectable'></div>
	<audio id='paste_audio_nope' src='/audio/nope.mp3?version=1'>
	<audio id='paste_audio_succ' src='/audio/succ.mp3?version=1'>
	<audio id='paste_audio_succ2' src='/audio/succ2.mp3?version=1'>
</body>
</html>