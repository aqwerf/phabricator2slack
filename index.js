var http = require('http');
var pha = require('./lib/pha.js');

pha.init(function () {
    http.createServer(function (req, res) {
	if (req.method == 'POST') {
	    //console.log("[200] " + req.method + " to " + req.url);
	    req.on('data', function(chunk) {
		var str = decodeURIComponent(chunk.toString().replace(/\+/g, ' '));
		pha.notifySlack(str);
	    });

	    req.on('end', function() {
		res.writeHead(200, "OK", {'Content-Type': 'text/html'});
		res.end();
	    });
	} else {
	    //console.log("[405] " + req.method + " to " + req.url);
	    res.writeHead(405, "Method not supported", {'Content-Type': 'text/html'});
	    res.end('<html><head><title>405 - Method not supported</title></head><body><h1>Method not supported.</h1></body></html>');
	}
    }).listen(8085, '127.0.0.1');
    console.log('Server running at http://127.0.0.1:8085/');
});
