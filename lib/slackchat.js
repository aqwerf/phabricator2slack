var Botkit = require('botkit');
var deepcopy = require("deepcopy");

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
    var img = [ 'image_original', 'image_1024', 'image_512', 'image_192', 'image_72', 'image_48', 'image_32', 'image_24' ];
    for (var i = 0; i < users.members.length; i++) {
	if (users.members[i].name == name) {
	    for (var j = 0; j < img.length; j++) {
		if (users.members[i].profile.hasOwnProperty(img[j]))
		    return users.members[i].profile[img[j]];
	    }
	}
    }
    return null;
}

exports.getDMList = function (txt) {
    var dm  = txt.match(/@[A-Za-z]\w*/g);
    return dm;
};

exports.slack = function (msg) {
    var username = msg.username;

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
	console.log(msg);
	bot.say(msg);

	dm = exports.getDMList(msg.attachments[0].text);
	if (dm && dm.length > 0) {
	    for (var i = 0; i < dm.length; i++) {
		var m = deepcopy(msg);
		m.channel = dm[i];
		bot.say(m);
	    }
	}
    }
}

