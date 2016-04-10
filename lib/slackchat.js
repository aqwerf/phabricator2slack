'use strict';

const controller = require('botkit').slackbot({});
const deepcopy = require("deepcopy");
const _ = require('underscore');
const async = require('async');
const EventEmitter = require('events');
const util = require('util');

module.exports = Slack;

function Slack() {
    let self = this;

    self.users = undefined;
    self.connected = false;
    self.bot = controller.spawn({
	token: 'xoxb-31747961591-iWFynF7Vm9qNeAcHRkxEIGcN'
    }).startRTM();

    self.work = async.queue(function(msg, done) {
	self.send(msg, done);
    });

    controller.on('rtm_open', function(bot, message) {
	bot.api.users.list({}, function(err,response) {
	    if (err) {
		console.log(err);
		bot.closeRTM();
	    } else {
		self.users = response;
		self.connected = true;
		self.emit('on');
	    }
	});
    });

    controller.on('rtm_close', function(bot, message) {
	console.log("Disconnected Slack Sever. Reconnecting after 1sec...");
	self.connected = false;
	self.emit('off');
	setTimeout(connect, 1000);
    });
}
util.inherits(Slack, EventEmitter);

Slack.prototype.slack = function(msg, callback) {
    if (this.work.length > 100) {
	this.work.kill();
    }

    this.work.push(msg, callback);
};

Slack.prototype.send = function(msg, done) {
    let self = this;
    let dm = false;
    let count = 1;
    let sent = 0;

    let procCallback = function(err, response) {
	if (sent < 0)
	    return;

	if (err || ++sent >= count) {
	    sent = -1;
	    done(err, count, response);
	}
    };

    if (!self.connected) {
	setTimeout(function() {	self.send(msg, done); }, 1000);
	return;
    }

    if (msg.dm) {
	dm = true;
	delete msg.dm;
    }

    self.convMsg(msg)
    self.bot.say(msg, procCallback);

    if (dm && ('attachments' in msg) && ('length' in msg.attachments) && ('text' in msg.attachments[0])) {
	dm = self.getDMList(msg.attachments[0].text);
	if (dm && dm.length > 0) {
	    _.each(dm, function(u) {
		count++;
		let m = deepcopy(msg);
		m.channel = u;
		self.bot.say(m, procCallback);
	    });
	}
    }
};

Slack.prototype.convMsg = function(msg) {
    let self = this;

    if (!('username' in msg)) {
	msg.username = 'phabot';
	msg.icon_emoji = ':ghost:';
    } else if (!('icon_url' in msg)) {
	msg.icon_url = self.getIconUrl(msg.username);
	msg.username += " bot";
    }

    if (!('channel' in msg))
	msg.channel = '#phabricator';

    // process notify list
    if ('users' in msg) {
	let cc = self.convertUsers(msg.users).join(', ');
	delete msg.users;

	if (cc && cc.length > 0)
	    msg.text += '\n' + cc;
    }
    return msg;
};

Slack.prototype.convertUsers = function(users) {
    let self = this;
    let cc = _.map(users, function(name) {
	let uinfo = _.find(self.users.members, function(u) { return u.name == name; });
	if (uinfo)
	    return '<@' + uinfo.id + '|' + name + '>';
	else
	    return '@' + name;
    });
    return cc;
};

Slack.prototype.getDMList = function(txt) {
    if (typeof(txt) == 'string')
	return  txt.match(/@[A-Za-z]\w*/g);
    else
	return null;
};

Slack.prototype.getIconUrl = function(name) {
    let self = this;
    let img = [ 'image_original', 'image_1024', 'image_512', 'image_192',
		'image_72', 'image_48', 'image_32', 'image_24' ];

    let m = _.find(self.users.members, function(m) { return m.name == name; });
    if (m) {
	let prop = _.find(img, function(n) { return n in m.profile; });
	if (prop)
	    return m.profile[prop];
    }
    return undefined;
}
