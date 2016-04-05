var Botkit = require('botkit');

var controller = Botkit.slackbot({})
var connected = false;
var users = null;

var bot = controller.spawn({
    token: 'xoxb-31747961591-iWFynF7Vm9qNeAcHRkxEIGcN'
}).startRTM();

controller.on('rtm_open', function(bot, message) {
    connected = true;
});

controller.on('rtm_close', function(bot, message) {
    connected = false;
    console.log("########### Error");
});

bot.api.users.list({}, function(err,response) {
    users = response;
});

function convertSlackIds(list) {
    cc = "";

    list = list.map(function(name) {
	for (var i = 0; i < users.members.length; i++) {
	    if (users.members[i].name == name) {
		return '<@' + users.members[i].id + '|' + users.members[i].name + '>';
	    }
	}
    });
    return list;
}

function getIconUrl(name) {
    for (var i = 0; i < users.members.length; i++) {
	if (users.members[i].name == name) {
	    return users.members[i].profile.image_original;
	}
    }
    return null;
}

module.exports = function (msg) {
    if (!msg.hasOwnProperty('username')) {
	msg.username = 'phabot';
	msg.icon_emoji = ':ghost:';
    } else {
	if (!msg.hasOwnProperty('icon_url')) {
	    msg.icon_url = getIconUrl(msg.username);
	    msg.username = msg.username + "'s bot";
	}
    }
    if (!msg.hasOwnProperty('channel'))
	msg.channel = '#phabricator';

    if (connected) {
	if (msg.hasOwnProperty('users')) {
	    var cc = "";
	    if (users) {
		cc = convertSlackIds(msg.users).join(', ');
	    } else {
		cc = users.map(function(name) { return '@'+name; }).join(', ');
	    }
	    delete msg.users;

	    if (cc.length > 0)
		msg.text = msg.text + '\n' + cc;
	}
	bot.say(msg);
    }
}

