<?php

	function is_null_or_empty_string($str) {
		return (!isset($str) || trim($str) === '');
	}

	$saved = isset($_GET["saved"]);

	$parts = parse_url($_SERVER['REQUEST_URI']);
	parse_str($parts["query"], $query);
	$code = $query["code"];
	$token = $query["token"];

	if (is_null_or_empty_string($code)) {
		$code = "";
		$token = "";
		$content = "";
		$title = "Paste";
		$comment = "";
	} else {
		// Create a new database, if the file doesn't exist and open it for reading/writing.
		// The extension of the file is arbitrary.
		$db = new SQLite3("pastes_v6.sqlite", SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);

		// Create a table.
		$db->query('CREATE TABLE IF NOT EXISTS "pastes" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			"content" VARCHAR,
			"code" VARCHAR,
			"comment" VARCHAR,
			"date" DATETIME,
			"token" VARCHAR
		)');

		$statement = $db->prepare('SELECT * FROM "pastes" WHERE "code" = ?');
		$statement->bindValue(1, $code);
		$result = $statement->execute();
		$array = $result->fetchArray(SQLITE3_ASSOC);
		$content = $array["content"];
		$comment = $array["comment"];

		if (is_null_or_empty_string($comment)) {
			$comment = "";
			$title = "Paste - " . $code;
		} else {
			$title = "Paste - " . substr($comment, 0, 140);
		}

		$db->close();
	}

?>

<!doctype html>

<html>
<head>
	<title><?php echo $title ?></title>
	<link rel="icon" type="image/png" href="favicon.png"/>
	<link rel="stylesheet" href='codemirror/lib/codemirror.css'>
	<link rel="stylesheet" href='codemirror/theme/nord.css'>
	<link rel="stylesheet" href='css/style.css?version=41'>
	<script src='codemirror/lib/codemirror.js'></script>
	<script src='codemirror/addon/mode/overlay.js'></script>
	<script src='codemirror/addon/mode/simple.js'></script>
	<script src='codemirror/addon/mode/multiplex.js'></script>
	<script src='codemirror/addon/mode/loadmode.js'></script>
	<script src='codemirror/mode/meta.js'></script>
	<script src='codemirror/mode/clike/clike.js'></script>
	<script src='js/base.js?version=92'></script>
	<script>
		window.onload = function() {
			Paste.code = <?php echo json_encode($code); ?>;
			Paste.token = <?php echo json_encode($token); ?>;
			Paste.initial_content = <?php echo json_encode($content); ?>;
			Paste.initial_comment = <?php echo json_encode($comment); ?>;
			Paste.saved = <?php echo json_encode($saved); ?>;
			Paste.init()
		}
	</script>
</head>
<body>
	<div id='paste_main'>
		<div id='paste_comment_container'>
			<div id='paste_comment_placeholder'>Leave A Comment</div>
			<div id='paste_comment_content' contenteditable="true"></div>
		</div>

		<div id='paste_toolbar' class='paste_unselectable'>
			<div id='paste_toolbar_save' class='paste_toolbar_button_container'>
				<span class='paste_toolbar_button'>Save</span>
			</div>			
			<div id='paste_toolbar_update' class='paste_toolbar_button_container paste_border_left'>
				<span class='paste_toolbar_button'>Update</span>
			</div>
			<div id='paste_toolbar_new' class='paste_toolbar_button_container paste_border_left'>
				<span class='paste_toolbar_button'>New</span>
			</div>
		</div>

		<div id='paste_content_main'>
			<textarea id='paste_textarea'></textarea>
			<div id='paste_render_container'>
				<iframe id='paste_render_iframe'></iframe>
			</div>
		</div>
	</div>

	<div id='paste_loading' class='paste_unselectable'>
		<div id='paste_loading_content'>Loading</div>
	</div>

	<div id='paste_footer' class='paste_unselectable'></div>
</body>
</html>