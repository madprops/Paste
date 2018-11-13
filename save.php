<?php

ob_start();

function is_null_or_empty_string($str)
{
	return (!isset($str) || trim($str) === '');
}

function random_number_string($length = 10) 
{
	return substr(str_shuffle(str_repeat($x='0123456789', ceil($length/strlen($x)) )),1,$length);
}

function random_word($length = 4)
{  
	$string     = '';
	
	$vowels     = array("a","e","i","o","u");  
	
	$consonants = array(
	'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 
	'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'
	);

	// Seed it
	srand((double) microtime() * 1000000);
	$max = $length/2;

	for ($i = 1; $i <= $max; $i++)
	{
		$string .= $consonants[rand(0,19)];
		$string .= $vowels[rand(0,4)];
	}

	return $string;
}

$max_content_size = 500000;

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

$db->exec('BEGIN');

$date = time();

if(isset($_POST["content"]))
{
	$content = $_POST["content"];
}

else
{
	exit();
}

$content_length = strlen($content);

if($content_length === 0 || $content_length > $max_content_size)
{
	exit();
}

if(isset($_SERVER['HTTP_REFERER']))
{
	$ourl = $_SERVER['HTTP_REFERER'];

	if(is_null_or_empty_string($ourl))
	{
		$url = "";
	}

	else
	{
		$ourl = strtok($ourl, '?');
		$exploded = explode("/", $ourl);
		$url = array_pop($exploded);
	}
}

else
{
	$url = "";
}

if(is_null_or_empty_string($url))
{
	$revision = 1;
	$code = $date . "-" . random_word(6);
	$url = $code . "-" . $revision;
}

else
{
	$url_split = explode("-", $url);
	$code = $url_split[0] . "-" . $url_split[1];
	$num_revisions = $db->querySingle('SELECT COUNT(DISTINCT "revision") FROM "pastes" WHERE "code" = "' . $code . '" ');	
	$revision = $num_revisions + 1;
	$url = $code . "-" . $revision;
}

if(isset($_POST["mode_name"]))
{
	$mode_name = $_POST["mode_name"];

	if(is_null_or_empty_string($mode_name))
	{
		$mode_name = "Plain Text";
	}
}

else
{
	$mode_name = "Plain Text";
}

$statement = $db->prepare('INSERT INTO "pastes" ("content", "mode_name", "code", "revision", "date")
	VALUES (:acontent, :amode_name, :acode, :arevision, :adate)');
$statement->bindValue(':acontent', $content);
$statement->bindValue(':amode_name', $mode_name);
$statement->bindValue(':acode', $code);
$statement->bindValue(':arevision', $revision);
$statement->bindValue(':adate', $date);
$statement->execute(); // you can reuse the statement with different values

$db->exec('COMMIT');

$db->close();

$response = array('url' => $url);

echo json_encode($response);