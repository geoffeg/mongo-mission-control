<?php

if ($_SERVER['HTTP_ACCEPT'] == "text/event-stream") {
	header('Content-Type: text/event-stream');
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	while (1) {
		$response = runCommand($_GET['host'], $_GET['command']);
		$json = json_encode($response);
		sendEvent("serverStatus", $json); 
		sleep(3);
	}
} else {
	error_log("AJAX");
	header('Content-type: application/json');
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	$response = runCommand($_GET['host'], $_GET['command']);
	$json = json_encode($response);
	echo $json;
}

function runCommand($host, $command) {
	$m = new Mongo("mongodb://$host", array('replicaSet' => false));
	$m->setSlaveOkay(true);

	switch($command) {
		case "replSetGetStatus":
			$response = $m->admin->command(array('replSetGetStatus' => 1));
			break;
		case "serverStatus":
			$response = $m->stats->command(array('serverStatus' => 1));
			break;
	}
	return $response;
}

function sendEvent($id, $message) {
	echo "event: $id" . PHP_EOL;
	echo "data: $message" . PHP_EOL;
	echo PHP_EOL;
	ob_flush();
	flush();
}


?>
