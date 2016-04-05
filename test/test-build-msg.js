var fs = require('fs');
var pha = require('../lib/pha');

var obj = JSON.parse(fs.readFileSync('./test/sample-story-maniphest.json', 'utf8'));

pha.init(function(err) {
    pha.buildText(obj, function(err, msg) {
	console.log(msg);
    });
});
