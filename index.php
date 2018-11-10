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
	}

	else
	{
		$url_split = explode("-", $url);
		$code = $url_split[0] . "-" . $url_split[1];
		$revision = $url_split[2];

		// Create a new database, if the file doesn't exist and open it for reading/writing.
		// The extension of the file is arbitrary.
		$db = new SQLite3('pastes_v2.sqlite', SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);

		// Create a table.
		$db->query('CREATE TABLE IF NOT EXISTS "pastes" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			"content" VARCHAR,
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
	<link rel='stylesheet' href='/codemirror/codemirror.css'>
	<link rel='stylesheet' href='/codemirror/dracula.css'>
	<link rel='stylesheet' href='/codemirror/simplescrollbars.css'>
	<link rel='stylesheet' href='/style.css?version=2'>
	<script src='/codemirror/codemirror.js'></script>
	<script src='/codemirror/mode/javascript/javascript.js'></script>
	<script src='/codemirror/simplescrollbars.js'></script>
	<script src='/base.js?version=3'></script>
	<script>
		window.onload = function()
		{
			Paste.url = <?php echo json_encode($url); ?>;
			Paste.initial_value = <?php echo json_encode($content); ?>;
			Paste.saved = <?php echo json_encode($saved); ?>;
			Paste.init()
		}
	</script>
</head>
<body>
	<div id='paste_main'>
		<div id='paste_toolbar' class='paste_unselectable'>
			<div id='paste_toolbar_save' class='paste_action paste_toolbar_button_container' onclick='Paste.save_paste()'>
				<span class='paste_toolbar_button'>Save Paste</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_action paste_toolbar_button_container paste_border_left' onclick='Paste.new_paste()'>
				<span class='paste_toolbar_button'>New Paste</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_action paste_toolbar_button_container paste_border_left' onclick='Paste.copy_url()'>
				<span class='paste_toolbar_button'>Copy URL</span>
			</div>
			<div id='paste_toolbar_clear' class='paste_action paste_toolbar_button_container paste_border_left' onclick='Paste.show_history()'>
				<span class='paste_toolbar_button'>Paste History</span>
			</div>
		</div>
		<div id='paste_content_main'>
			<textarea id='paste_textarea'></textarea>
		</div>
		<div id='paste_overlay' onclick='Paste.hide_modal()'></div>
		<div id='paste_modal'>
			<div id='paste_modal_inner'></div>
		</div>
	</div>
	<div id='paste_footer' class='paste_unselectable'></div>
</body>
</html>