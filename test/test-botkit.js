var Botkit = require('botkit');

var controller = Botkit.slackbot({})

var bot = controller.spawn({
    token: 'xoxb-31747961591-iWFynF7Vm9qNeAcHRkxEIGcN'
}).startRTM();


controller.on('rtm_open', function(bot, message) {
//    bot.startConversation(message, function(err,convo) {
	bot.say({
	    text: 'my first message',
	    username: 'phabot',
	    channel: '#phabricator'
	});
//    })
});

