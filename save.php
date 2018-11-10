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

$db->exec('BEGIN');

$date = time();
$content = $_POST["content"];
$url = $_POST["url"];

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

$statement = $db->prepare('INSERT INTO "pastes" ("content", "code", "revision", "date")
	VALUES (:acontent, :acode, :arevision, :adate)');
$statement->bindValue(':acontent', $content);
$statement->bindValue(':acode', $code);
$statement->bindValue(':arevision', $revision);
$statement->bindValue(':adate', $date);
$statement->execute(); // you can reuse the statement with different values

$db->exec('COMMIT');

$db->close();

$response = array('url' => $url);

echo json_encode($response);