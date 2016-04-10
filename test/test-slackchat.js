'use strict';

const Slack = require('../lib/slackchat.js');
const _ = require('underscore');

var slack = undefined;
var timeout =  undefined;

module.exports = {
    // testPreSend: function(test) {
    // 	let self = this;
    // 	let s = new Slack();

    // 	s.slack({
    // 	    text: 'testPreSend',
    // 	    users: 'alan',
    // 	    username: 'alan',
    // 	    channel: '@alan'
    // 	}, function (err, msg) {
    // 	    console.log(err);
    // 	    console.log(msg);
    // 	    test.done();
    // 	});
    // },

    afterConnect: {
	setUp: function (done) {
	    let self = this;

	    if (timeout) {
		clearTimeout(timeout);
		done();
		return;
	    }
	    slack = new Slack();

	    //console.log("Start Connect");
	    let eventFail = function() {
		console.log('Fail to connect slack');
		process.exit(1);
	    }
	    
	    slack.on('on', function () {
		done();
	    });

	    slack.on('off', eventFail);
	},

	tearDown: function(done) {
	    timeout = setTimeout(process.exit, 1000);
	    done();
	},

	// slack으로 부터 사용자 icon 받아오는 기능 확인
	testGetUserIcon: function(test) {
	    var self = this;
	    var users = _.map(slack.users.members, function(u) { return u.name; });

	    test.expect(2);
	    test.ok(users && users.length > 0, 'Fail to get all user list');
	    test.ok(_.every(users, function(u) {
		var icon = slack.getIconUrl(u);
		//console.log(u + ': ' + icon);
		if (icon && (icon.substr(-3) == 'png' || icon.substr(-3) == 'jpg'))
		    return true;
		else
		    return false;
	    }), 'Fail to find user icon');
	    
	    test.done();
	},

	// 본문에 @username 언급한 경우를 리스트로 찾기 검증
	testDMList: function(test) {
	    var self = this;
	    var txt = "skdfjeiwqfjidsaif  @alan, @chris,  dfkskfd @james:.";
	    var cmp = ['@alan', '@chris', '@james'];

	    test.expect(1);
	    var result = slack.getDMList(txt);
	    test.deepEqual(result, cmp, 'Bad DM List: ' + result );
	    test.done();
	},

	testConvertMessage: function(test) {
	    var self = this;
	    var msg = {};

	    test.expect(5);

	    // 기존인 username, channel 설정 확인
	    msg = slack.convMsg(msg);
	    test.deepEqual(msg, {
		username: 'phabot',
		icon_emoji: ':ghost:',
		channel: '#phabricator'
	    });

	    // username을 slack 계정아이콘 변환 확인
	    msg = { username: 'alan' };
	    msg = slack.convMsg(msg);
	    test.ok('icon_url' in msg);
	    test.ok(msg.icon_url.substr(-3) == 'png' || msg.icon_url.substr(-3) == 'jpg');
	    test.deepEqual(msg.username, 'alan bot');

	    // users에 들어간 목록이 notification list로 text에 추가되는지 확인
	    msg = {
		text: '',
		users: [ 'alan', 'james' ]
	    };
	    msg = slack.convMsg(msg);
	    test.deepEqual(msg, {
		text: '\n<@U035PHMRY|alan>, <@U03AAUHAJ|james>',
		username: 'phabot',
		icon_emoji: ':ghost:',
		channel: '#phabricator' });
	    test.done();
	}
    }
};
