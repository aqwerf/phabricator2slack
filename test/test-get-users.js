var fs = require('fs');
var pha = require('../lib/pha');

var maniphest = JSON.parse(fs.readFileSync('./test/sample-maniphest.json', 'utf8'));

pha.init(function(err) {
    pha.getUserIds(maniphest, null, function(err, ids) {
	if (err) {
	    console.log(err);
	    return;
	}

	console.log("IDS List:");
	console.log(ids);

	pha.convUserName(ids, function(err, names) {
	    console.log("User List:");
	    console.log(names);
	});
    });

    pha.getUserIds(maniphest, "PHID-USER-effp43w4k64jmqjzzhvx", function(err, ids) {
	if (err) {
	    console.log(err);
	    return;
	}

	console.log("IDS List without james:");
	console.log(ids);

	pha.convUserName(ids, function(err, names) {
	    console.log("User List without james:");
	    console.log(names);
	});
    });
});

