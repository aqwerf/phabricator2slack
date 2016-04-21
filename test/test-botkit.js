var Botkit = require('botkit');
const config = require('../config.js');

exports.testConnectSlack = function(test) {
    test.expect(3);

    var controller = Botkit.slackbot({})
    var bot = controller.spawn({
	token: config.slack.token
    }).startRTM();
    test.ok(bot);
    console.log('Start RTM');

    controller.on('rtm_open', function(bot, message) {
	bot.say({
	    text: 'testing test-botkit.js',
	    username: 'nodeunit',
	    channel: '@alan'
	}, function(err, response) {
	    test.ifError(err, 'Fail to DM');
	    test.deepEqual(response.ok, true, 'Fail to response.ok result');
	    console.log(response);
	    test.done();
	});
    });

    controller.on('rtm_close', function(bot, message) {
	console.log("rtm_close");
	test.ok(null, 'Slack chennel is disconnected');
	test.done();
    });
}

exports.tearDown = function(done) {
    setTimeout(process.exit, 0);
    done();
}
