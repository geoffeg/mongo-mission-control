<?php

if ($_SERVER['HTTP_ACCEPT'] == "text/event-stream") {
	header('Content-Type: text/event-stream');
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	while (1) {
		$response = runCommand($_GET['command']);
		$json = json_encode($response);
		sendEvent("s", $json); 
		sleep(3);
	}
} else {
	error_log("AJAX");
	header('Content-type: application/json');
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	$response = runCommand($_GET['command']);
	$json = json_encode($response);
	echo $json;
}

function runCommand($command) {
	switch($command) {
		case "s":
			// Get stats
			$m = new Mongo("mongodb://".$_GET['host'], array('replicaSet' => false));
			$m->setSlaveOkay(true);
			$resp = $m->stats->command(array('serverStatus' => 1));
			$replSetStatus = $m->admin->command(array('replSetGetStatus' => 1));
			$resp['MyState'] = $replSetStatus['myState'];
			return $resp;
			break;
		case "d":
			// Save data
			file_put_contents('saveData.js','var data='.urldecode($_GET['data']));
			return array();
			break;
	}
}

function sendEvent($id, $message) {
	echo "event: $id" . PHP_EOL;
	echo "data: $message" . PHP_EOL;
	echo PHP_EOL;
	ob_flush();
	flush();
}


?>
