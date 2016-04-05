var pha = require('../lib/pha');

var id = "PHID-TASK-d3xs4imi63tk4fdzfych";

pha.init(function(err) {
    pha.getTaskInfo(id, function(err, data) {
	console.log("Taks T939 Info:");
	console.log(data);
    });
});
