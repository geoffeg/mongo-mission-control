<?php
function getHost($hostname) {
	if (preg_match('/^[0-9\.]+$/', $hostname)) return $hostname;
	return preg_replace('/^([a-z0-9]+)\..*/', '$1', $hostname);
}

$config = parse_ini_file('mongo-mission-control.ini');

if ($_GET['json'] == '1') {
	$m = new Mongo($config['mongo_hostname'], array('persistent' => $config['mongo_persistent'], 'replicaSet' => $config['mongo_replicaSet']));
	$json_response = array();

	$replication_delays = array();
	$replicaSetStatus = $m->admin->command(array('replSetGetStatus' => 1));

	$mongo_hosts_info = $m->getHosts();
	$host_info = array();
	foreach ($mongo_hosts_info as $hostname => $hinfo) {
		$short_hostname = getHost($hostname);
		$host_info[$short_hostname] = $hinfo;
	}

	for ($i = 0; $i < count($replicaSetStatus['members']); $i++) {
		$hostname = $replicaSetStatus['members'][$i]['name'];
		$short_hostname = getHost($hostname);

		$command_host = new Mongo("mongodb://$hostname", array('persistent' => $hostname, 'replicaSet' => false));
		$command_host->setSlaveOkay(true);
		$serverStatus = $command_host->stats->command(array('serverStatus' => 1));

		$host = array();
		$host['host'] = $short_hostname;
		$host['serverStatus'] = $serverStatus;
		$host['host_info'] = $host_info[$short_hostname];
		$host['role'] = $replicaSetStatus['members'][$i]['stateStr'];
		$host['optime'] = $replicaSetStatus['members'][$i]['optime']->sec;

		if ($replicaSetStatus['members'][$i]['stateStr'] === "PRIMARY") {
			$primary_optime = $replicaSetStatus['members'][$i]['optime']->sec;
			array_unshift($json_response, $host);
		} else if ($replicaSetStatus['members'][$i]['stateStr'] === "SECONDARY") {
			array_push($json_response, $host);
		}
	}

	for ($i = 0; $i < count($json_response); $i++) {
		if ($json_response[$i]['role'] === "SECONDARY") {
			$json_response[$i]['replicationLag'] = $primary_optime - $json_response[$i]['optime'];
		}
	}

	$json = json_encode($json_response);
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	header('Content-type: application/json');
	echo $json;
	die;
}

?>

<HTML>
<HEAD>
	<TITLE>Mongo Mission Control</TITLE>
	<script type="text/javascript" src="http://code.jquery.com/jquery-latest.min.js"></script>
	<script type="text/javascript" src="http://ajax.microsoft.com/ajax/jquery.templates/beta1/jquery.tmpl.min.js"></script>
	<script type="text/javascript" src="sprintf.js"></script>
	<meta http-equiv="refresh" content="600">

	<style>
		BODY { color: white; font-family: "Inconsolata", monospace; background: black;}
		TABLE { border: 2px solid #DDD; border-collapse: collapse; font-size: 18px }
		THEAD TR TD { border: 1px solid #DDD;text-align: center; color: #C1E824; }
		TBODY TR TD { text-align: center; }
		TBODY TR TD:first-child { border-right: 1px solid #DDD; width: 120px; }
		.header-parent { color: #33D01E; text-align: center}
		TBODY TR:hover { background-color: #333 } 


	</style>
	<script type="text/javascript">

		var lastUpdate;
		var previousData   = new Array();
		var jsonUrl        = "mongo-stats.php?json=1"
		var refreshMillis  = 2000;

		function initServerStats() {
			$.ajax({
				url: jsonUrl,
				success: function(data) {
					$.each(data, function(key, val) {
						$("THEAD TR").append("<TD>" + val['host'] + " " + val['role'].substr(0, 1) + "</TD>");
						var all_values = {"previousValues" : val, "currentValues" : val};
						var template_output = $("#statusTemplate").tmpl(all_values);
						$("TD", template_output).each(function(i) {
							var template_td_html = $("<div/>").append($(this).clone()).html();
							$("TBODY TR:nth-child(" + (i + 1)  + ")").each(function(p) {
								$(this).append(template_td_html);
							});

						});

					});
					previousData = data;
					lastUpdate = new Date();
					$("#updatetime").html(getNiceDate(lastUpdate));
				},
				complete: function(data) {
					setTimeout("refreshServerStatus()", refreshMillis);
				}

			});
		}

		function divByThou(val) {
			return val / 1000;
		}

		function refreshServerStatus() {
			$.ajax({
				url: jsonUrl,
				success: function(data) {
					$.each(data, function(key, val) {
						var all_values = {"previousValues" : previousData[key], "currentValues" : val};
						var template_output = $("#statusTemplate").tmpl(all_values);
						$("TD", template_output).each(function(i) {
							var template_td_html = $(this).html();
							$("TBODY TR:nth-child(" + (i + 1) + ") TD:nth-child(" + (key + 2) + ")").each(function(p) {
								$(this).html(template_td_html);
							});
						});
					});
					previousData = data;
					lastUpdate = new Date();
					$("#updatetime").html(getNiceDate(lastUpdate));
				},
				complete: function(data) {
					setTimeout("refreshServerStatus()", refreshMillis);
				}
			});
		}

		function getNiceDate(dateObj) {
			return sprintf("%02d:%02d:%02d %02d/%02d", dateObj.getHours(), dateObj.getMinutes(), dateObj.getSeconds(), dateObj.getMonth(), dateObj.getDate());
		}

		function getDiffVals(currentValue, previousValue) {
			console.log(currentValue + "-" + previousValue);
			return currentValue - previousValue;

		}

		function getGaugeVal(dataExpr, currentValue) {
			if (lastUpdate == undefined) return 0;
			var diff = getDiffVals(dataExpr, currentValue) / (new Date().getTime() / 1000 - lastUpdate.getTime() / 1000);
			return sprintf("%10.2f", diff / 1024);
		}

		$(function() {
			initServerStats();
		});
	</script>

</HEAD>
<BODY>

	<TABLE width="100%">
		<THEAD>
			<TR>
				<TD><div id="updatetime"></div></TD>
			</TR>
		</THEAD>
		<TBODY>
			<TR><TD class="header-parent"> Repl Lag       </TD></TR>
			<TR><TD class="header-parent"> Operations     </TD></TR>
			<TR><TD class="header-child">  Inserts        </TD></TR>
			<TR><TD class="header-child">  Queries        </TD></TR>
			<TR><TD class="header-child">  Updates        </TD></TR>
			<TR><TD class="header-child">  Deletes        </TD></TR>
			<TR><TD class="header-child">  Getmore        </TD></TR>
			<TR><TD class="header-parent"> Queues         </TD></TR>
			<TR><TD class="header-child">  Readers        </TD></TR>
			<TR><TD class="header-child">  Writers        </TD></TR>
			<TR><TD class="header-child">  Total          </TD></TR>
			<TR><TD class="header-parent"> Clients        </TD></TR>
			<TR><TD class="header-child">  Readers        </TD></TR>
			<TR><TD class="header-child">  Writers        </TD></TR>
			<TR><TD class="header-child">  Total          </TD></TR>
			<TR><TD class="header-parent"> Network        </TD></TR>
			<TR><TD class="header-child">  Ping           </TD></TR>
			<TR><TD class="header-child">  Bytes In       </TD></TR>
			<TR><TD class="header-child">  Bytes Out      </TD></TR>
			<TR><TD class="header-parent"> Connections    </TD></TR>
			<TR><TD class="header-child">  Active         </TD></TR>
			<TR><TD class="header-child">  Available      </TD></TR>
			<TR><TD class="header-parent"> Flushes        </TD></TR>
			<TR><TD class="header-child">  Last           </TD></TR>
			<TR><TD class="header-child">  Total          </TD></TR>
			<TR><TD class="header-child">  Average        </TD></TR>
			<TR><TD class="header-parent"> Memory         </TD></TR>
			<TR><TD class="header-child">  Resident       </TD></TR>
			<TR><TD class="header-child">  Virtual        </TD></TR>
			<TR><TD class="header-child">  Mapped         </TD></TR>
			<TR><TD class="header-parent"> Page Faults    </TD></TR>
			<TR><TD class="header-parent"> Lock Ratio     </TD></TR>
		</TBODY>
	</TABLE>
	<script id="statusTemplate" type="text/x-jQuery-tmpl">
	<TR>
		<TD>{{if currentValues.replicationLag}}${currentValues.replicationLag} secs{{else}}0 secs{{/if}}</TD>
		<TD>&nbsp;</TD>
		{{if currentValues.role == "PRIMARY"}}
		<TD>{{if currentValues.serverStatus.opcounters}}${getDiffVals(currentValues.serverStatus.opcounters.insert, previousValues.serverStatus.opcounters.insert)}{{else}}&nbsp;{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcounters}}${getDiffVals(currentValues.serverStatus.opcounters.query, previousValues.serverStatus.opcounters.query)}{{else}}&nbsp;{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcounters}}${getDiffVals(currentValues.serverStatus.opcounters.update, previousValues.serverStatus.opcounters.update)}{{else}}&nbsp;{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcounters}}${getDiffVals(currentValues.serverStatus.opcounters.delete, previousValues.serverStatus.opcounters.delete)}{{else}}&nbsp;{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcounters}}${getDiffVals(currentValues.serverStatus.opcounters.getmore, previousValues.serverStatus.opcounters.getmore)}{{else}}&nbsp;{{/if}}</TD>
		{{/if}}
		{{if currentValues.role == "SECONDARY"}}
		<TD>{{if currentValues.serverStatus.opcountersRepl}}${getDiffVals(currentValues.serverStatus.opcountersRepl.insert, previousValues.serverStatus.opcountersRepl.insert)}{{else}}-{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcountersRepl}}${getDiffVals(currentValues.serverStatus.opcounters.query, previousValues.serverStatus.opcounters.query)}{{else}}-{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcountersRepl}}${getDiffVals(currentValues.serverStatus.opcountersRepl.update, previousValues.serverStatus.opcountersRepl.update)}{{else}}-{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcountersRepl}}${getDiffVals(currentValues.serverStatus.opcountersRepl.delete, previousValues.serverStatus.opcountersRepl.delete)}{{else}}-{{/if}}</TD>
		<TD>{{if currentValues.serverStatus.opcountersRepl}}${getDiffVals(currentValues.serverStatus.opcountersRepl.getmore, previousValues.serverStatus.opcountersRepl.getmore)}{{else}}-{{/if}}</TD>
		{{/if}}
		<TD>&nbsp;</TD>
		<TD>${currentValues.serverStatus.globalLock.currentQueue.readers}</TD>
		<TD>${currentValues.serverStatus.globalLock.currentQueue.writers}</TD>
		<TD>${currentValues.serverStatus.globalLock.currentQueue.total}</TD>
		<TD>&nbsp;</TD>
		<TD>${currentValues.serverStatus.globalLock.activeClients.readers}</TD>
		<TD>${currentValues.serverStatus.globalLock.activeClients.writers}</TD>
		<TD>${currentValues.serverStatus.globalLock.activeClients.total}</TD>
		<TD>&nbsp;</TD>
		<TD>{{if currentValues.host_info}}${sprintf("%4.2f", divByThou(currentValues.host_info.ping))} ms{{else}}-{{/if}}</TD>
		<TD>${getGaugeVal(currentValues.serverStatus.network.bytesIn, previousValues.serverStatus.network.bytesIn)} K/sec</TD>
		<TD>${getGaugeVal(currentValues.serverStatus.network.bytesOut, previousValues.serverStatus.network.bytesOut)} K/sec</TD>
		<TD>&nbsp;</TD>
		<TD>${currentValues.serverStatus.connections.current}</TD>
		<TD>${currentValues.serverStatus.connections.available}</TD>
		<TD>&nbsp;</TD>
		<TD>${currentValues.serverStatus.backgroundFlushing.last_ms} ms</TD>
		<TD>${currentValues.serverStatus.backgroundFlushing.total_ms} ms</TD>
		<TD>${sprintf("%3.2f", currentValues.serverStatus.backgroundFlushing.average_ms)} ms</TD>
		<TD>&nbsp;</TD>
		<TD>${currentValues.serverStatus.mem.resident} MB</TD>
		<TD>${currentValues.serverStatus.mem.virtual} MB</TD>
		<TD>${currentValues.serverStatus.mem.mapped} MB</TD>
		<TD>${getDiffVals(currentValues.serverStatus.extra_info.page_faults, previousValues.serverStatus.extra_info.page_faults)}</TD>
		<TD>${sprintf("%1.5f", currentValues.serverStatus.globalLock.ratio)}</TD>
	</TR>
	</script>
</BODY>
</HTML>
