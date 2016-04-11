'use strict';

const Slack = require('../lib/slackchat.js');
const Pha = require('../lib/pha.js');

module.exports = P2S;

function P2S() {
    let self = this;
    self.slack = new Slack();
    self.pha = new Pha();
    self.run = false;
    self.pha.init(function(err) {
	if (!err)
	    self.run = true;
    });
}

P2S.prototype.notify = function(str, test, callback) {
    let self = this;

    if (!self.run) {
	setTimeout(function() { self.notify(str); }, 100);
	return;
    }
    
    self.pha.convSlack(str, function(err, msg) {
	if (err) {
	    return;
	}
	
	if (test) {
	    msg.channel = '@alan';
	    delete msg.users;
	} else {
	    msg.dm = [];
	}
		
	self.slack.slack(msg, function(err, count, resp) {
	    if (callback)
		callback(err, count, resp);
	});
    });
}
