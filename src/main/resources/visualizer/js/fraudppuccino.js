//Register different use cases that specify application domain specific behavior
var availableUseCases = {};
availableUseCases["Bitcoin"] = Bitcoin;
availableUseCases["banktransactions"] = BankTransactions;


var currentUseCaseName = "Bitcoin"
function useCase() { return availableUseCases[currentUseCaseName];}

var width = 960, height = 500;

var color = d3.scale.linear().domain([ 0, 5, 10, 20 ]).range(
		[ "green", "yellow", "orange", "red" ]);

function linkColor(link) {

	//red link if transaction is xCountry
	if (link.transactions) {
		var color = "gray"
		$.each(link.transactions, function(i, t) {
			if (t.xCountry) {
				color = "blue";
			} else if (t.cash) {
				color = "goldenrod";
			}
		});
		return color
	} else {
		return "gray";
	}
}

function nodeColor(node) {
	if (node.transaction && node.transaction.xCountry) {
		return "blue";
	} else if (node.transaction && node.transaction.cash) {
		return "goldenrod"
	} else if(node.account) {
		if(node.account.in > node.account.out) {
			return "red"
		} else if(node.account.out > node.account.in) {
			return "green"
		} else {
			return "gray"
		}
	}
	else {
		return color(node.group);
	}
}

function mapValue(d) {
	var translation = d3.scale.linear().domain([1,750]).range([ 0, 20 ]);
	if(d.account) {
		return translation(Math.abs(d.account.in-d.account.out));
	} else {
		return translation(d.value);
	}
}

var force = d3.layout.force().charge(-1000).linkDistance(100).size(
		[ width, height ]);

var svg = d3.select("svg#patternVisualizer");
svg.attr("pointer-events", "all").call(
		d3.behavior.zoom().on("zoom", transformation));

var graphVisualization = svg.append('svg:g').attr("id", "graphVisualization");

var reports = {}
var reportsCounter = 0 // supplier of unique report IDs

var graph = {
	"nodes" : [],
	"links" : []
}

var editorDSL = CodeMirror.fromTextArea($("textarea#query")[0], {
	mode : "text/x-yaml"
});

$(function() {
	$("#tabs").tabs(); // Initialize Tabs
});

$('.navTab a').click(function(e) {
	$(this).parent().siblings().removeClass('active');
	$(this).parent().addClass('active');
})

function transformation() {
	graphVisualization.attr("transform", "translate(" + d3.event.translate
			+ ")" + " scale(" + d3.event.scale + ")");
}

function updateVisualization() {

	$("g#visualizerPlaceholder").remove();
	$("g#graphVisualization").empty();

	force.nodes(graph.nodes).links(graph.links).start();

	graphVisualization.append("svg:defs").append("svg:marker").attr("id",
			"transaction").attr("viewBox", "0 -5 10 10").attr("refX", 10).attr(
			"refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr(
			"orient", "auto").append("svg:path").attr("d", "M0,-5L10,0L0,5Z");

	var linkContainer = graphVisualization.selectAll(".link").data(graph.links)
			.enter().append("svg:g").attr("class", "linkContainer");

	var link = linkContainer.append("svg:path").attr("class", "link").attr(
			"marker-end", "url(#transaction)").style("stroke", function(link) {
		return linkColor(link);
	}).on("click", function(link) {
		showDetailsForNode(link);
	});

	var linkLabel = linkContainer.append("svg:text").text(function(d) {
		if (d.transactions && d.transactions.length > 1) {
			return d.transactions.length
		}
	}).style("fill", "#555").style("font-family", "Arial").style("font-size",
			12);

	var nodeContainer = graphVisualization.selectAll(".node").data(graph.nodes)
			.enter().append("svg:g").attr("class", "nodeContainer");

	var node = nodeContainer.append("circle").attr("class", "node").attr("r",
			function(d) {
				r = Math.max(Math.min(25, mapValue(d)),3);
				d.radius = r;
				return r;
			}).style("fill", function(d) {
		return nodeColor(d);
	}).call(force.drag).on("click", function(node) {
		showDetailsForNode(node);
	});

	force.on("tick", function() {
		link.attr("d", function(d) {
			// Total difference in x and y from source to target
			var diffX = d.target.x - d.source.x;
			var diffY = d.target.y - d.source.y;

			// Length of path from center of source node to center of target node
			var pathLength = Math.sqrt((diffX * diffX) + (diffY * diffY));

			// x and y distances from center to outside edge of target node
			var offsetX = (diffX * d.target.radius) / pathLength;
			var offsetY = (diffY * d.target.radius) / pathLength;

			return "M" + d.source.x + "," + d.source.y + "L"
					+ (d.target.x - offsetX) + "," + (d.target.y - offsetY);
		});

		linkLabel.attr("transform", function(d) {
			var transX = parseFloat(d.source.x)
					+ (parseFloat(d.target.x) - parseFloat(d.source.x)) * 0.33;
			var transY = parseFloat(d.source.y)
					+ (parseFloat(d.target.y) - parseFloat(d.source.y)) * 0.33;
			return "translate(" + transX + "," + transY + ")";
		});

		node.attr("cx", function(d) {
			return d.x;
		}).attr("cy", function(d) {
			return d.y;
		});
	});

}

function showDetailsForNode(element) {
	$('#inspectorNavTab :first-child').click(); // open the inspector tab
	$('#inspector-content').empty();
	$('#inspector-content').append(useCase().getDetailsFor(element));
}

function appendReport(report) {
	reports[reportsCounter] = report
	var startDate = new Date(report.start);
	var endDate = new Date(report.end);
	var reportListEntry = '<li data-component-id="'
			+ reportsCounter
			+ '" class="list-group-item"><span class="glyphicon glyphicon-remove remove-report"></span>'
			+ startDate.toLocaleDateString()
			+ '-'
			+ endDate.toLocaleDateString()
			+ '<br/>'
			+ useCase().getReportSignature(report)
			+ '<br/>'
			+ '<button type="button" class="btn btn-default btn-xs showAccountGraph">Account Graph</button> <button type="button" class="btn btn-default btn-xs showTransactionGraph">Transaction Graph</button></li>';
	reportsCounter++;
	$("div #reportsList").append(reportListEntry);
	updateReportsCount();
}

$(document).on('click', '.showAccountGraph', function() {
	var parent = $(this).parent();
	parent.siblings().removeClass('active');
	parent.addClass('active');
	loadAccountGraph(parent.attr("data-component-id"));
});

$(document).on('click', '.showTransactionGraph', function() {
	var parent = $(this).parent();
	parent.siblings().removeClass('active');
	parent.addClass('active');
	loadTransactionGraph(parent.attr("data-component-id"));
});

$(document).on('click', '.remove-report', function() {
	var idOfReport = $(this).parent().attr('data-component-id');
	$(this).parent().fadeOut(300, function() {
		$(this).remove();
	});
	delete reports[idOfReport];
	updateReportsCount();
});

$(document).on('click', '#runAlgorithm', function() {
	websocket.send(editorDSL.getValue());
});

$(document).on(
		'click',
		'#exportReports',
		function() {
			window.open("data:application/json;charset=utf-8,"
					+ escape(JSON.stringify(reports)));
		});

$(document).on('click', '#updateSettings', function() {
	var newWebSocketURI = $('#wsURI').val();
	currentUseCaseName = $('#useCase').val();
	initializeWebSocket(newWebSocketURI);
});

$(document).on('click', '#importReports', function() {
	var file = $('input#fileInput').get(0).files[0];
	var textType = /json/;

	if (file.type.match(textType)) {
		var reader = new FileReader();

		reader.onload = function(e) {
			var parsedResults = jQuery.parseJSON(reader.result);
			$.each(parsedResults, function(id, report) {
				appendReport(report);
			});
		}

		reader.readAsText(file);
	} else {
	}
});

function updateReportsCount() {
	$("div#reportsTitle span").text(
			"Reports(" + Object.keys(reports).length + ")");
}

function displayStatus(message) {
	$("div#notifications").empty();
	$("div#notifications").append(
			'<div id="computationStatus" class="alert alert-info">'
					+ message.msg + '</div>');
	setTimeout(function() {
		$('div#computationStatus').fadeOut('fast');
	}, 1500);
}

function updateProgess(progress) {
	$("div#computationProgress").width(progress + "%");
}

function loadTransactionGraph(id) {

	graph.nodes = [];
	graph.links = [];

	var transactionLookUp = {}; // Index on transactionId

	reports[id].members.forEach(function(transaction, index) {
		var tx = {
			"name" : transaction.id,
			"group" : transaction.depth,
			"transaction" : transaction,
			"value" : 1 + (transaction.value / 100000000)
		};
		transactionLookUp[transaction.id] = tx;
		graph.nodes.push(tx);
	});

	reports[id].members.forEach(function(transaction, index) {
		transaction.successor.forEach(function(linkTarget) {
			var link = {
				"source" : transactionLookUp[transaction.id],
				"target" : transactionLookUp[linkTarget],
				"value" : 1
			};
			graph.links.push(link);
		});
	});
	updateVisualization();
}

function loadAccountGraph(id) {

	graph.nodes = [];
	graph.links = [];

	var accountsLookup = {}; // Index on accountId
	var transactionsLookup = {}; // Index on source and target accountId

	reports[id].members
			.forEach(function(transaction, index) {

				if (!accountsLookup[transaction.src]) {
					var source = {
						"name" : transaction.src,
						"group" : 2,
						"account" : {
							"in" : 0,
							"out" : 0,
							"in-count" : 0,
							"out-count" : 0
						},
						"value" : 10
					};
					accountsLookup[transaction.src] = source;
					graph.nodes.push(source);
				}
				accountsLookup[transaction.src].account["out"] = accountsLookup[transaction.src].account["out"]
						+ transaction.value;
				accountsLookup[transaction.src].account["out-count"]++;

				if (!accountsLookup[transaction.target]) {
					var target = {
						"name" : transaction.target,
						"group" : 2,
						"account" : {
							"in" : 0,
							"out" : 0,
							"in-count" : 0,
							"out-count" : 0
						},
						"value" : 10
					};
					accountsLookup[transaction.target] = target;
					graph.nodes.push(target);
				}
				accountsLookup[transaction.target].account["in"] = accountsLookup[transaction.target].account["in"]
						+ transaction.value;
				accountsLookup[transaction.target].account["in-count"]++;

				if (!transactionsLookup[transaction.src]
						|| !transactionsLookup[transaction.src][transaction.target]) {
					var link = {
						"source" : accountsLookup[transaction.src],
						"target" : accountsLookup[transaction.target],
						"value" : 1,
						"xCountry" : transaction.xCountry,
						"transactions" : []
					};
					if (!transactionsLookup[transaction.src]) {
						transactionsLookup[transaction.src] = {}
					}
					transactionsLookup[transaction.src][transaction.target] = link;
					graph.links.push(link);
				}
				transactionsLookup[transaction.src][transaction.target].transactions
						.push(transaction);
			});

	updateVisualization();
}

/**
 * Websocket Communication
 */
var wsUri = "ws://localhost:8888/websocket/";

var websocket = null

function initializeWebSocket(wsUri) {
	websocket = new WebSocket(wsUri);

	websocket.onopen = function(e) {
		websocket.send("getpreviousresults");
	}

	websocket.onmessage = function(msg) {
		message = JSON.parse(msg.data);
		if (message instanceof Array) {
			$.each(message, function(i, m) {
				processMessage(m);
			});
		} else {
			processMessage(message)
		}
	}

}

function processMessage(message) {
	if (message.hasOwnProperty("id") && message.hasOwnProperty("members")) {
		appendReport(message);
	} else if (message.hasOwnProperty("status")) {
		if (message.status == "progress") {
			updateProgess(message.msg);
		} else {
			displayStatus(message);
		}

	} else {
	}
}

initializeWebSocket(wsUri);
