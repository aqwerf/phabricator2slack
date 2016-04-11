'use strict';

const Slack = require('../lib/slackchat.js');
const Pha = require('../lib/pha.js');
const logger = require('../lib/logger.js');
const qs = require('qs');
const _ = require('underscore');

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

    logger.info("J2S Started");
}

P2S.prototype.notify = function(str, test, callback) {
    let self = this;
    let obj;

    if (typeof(str) == 'string')
	obj = qs.parse(str);
    else
	obj = str;

    logger.info(obj);

    if (!self.run) {
	setTimeout(function() { self.notify(str); }, 100);
	return;
    }
    
    self.pha.convSlack(obj, function(err, msg) {
	if (err) {
	    logger.error('convSlack Result: ' + err.message);
	    return;
	}
	
	if (test) {
	    msg.channel = '@alan';
	    delete msg.users;
	} else {
	    msg.dm = [];
	}
		
	self.slack.slack(msg, function(err, count, resp) {
	    if (err) {
		logger.errro('slack Result: ' + err.message);
		return;
	    }
	    
	    if (callback)
		callback(err, count, resp);
	});
    });
}
