'use strict';

const Slack = require('../lib/slackchat.js');
const _ = require('underscore');

var slack = undefined;
var timeout =  undefined;

module.exports = {
    setUp: function (done) {
	let self = this;

	if (timeout) {
	    clearTimeout(timeout);
	    done();
	    return;
	}
	slack = new Slack();
	done();
    },

    tearDown: function(done) {
	timeout = setTimeout(process.exit, 1000);
	done();
    },

    // 직접 메시지 보내보기
    testPreSend: function(test) {
	test.expect(2);
    	slack.slack({
    	    text: 'testPreSend',
    	    username: 'alan',
    	    channel: '@alan',
    	}, function (err, count, msg) {
	    test.ifError(err);
	    test.ok(count == 1);
    	    test.done();
    	});
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
    },

    // dummy로 보냈을 떄 전체 보내는 횟수 확인
    testSlackCountUserOnly: function(test) {
	test.expect(2);
    	slack.slack({
    	    text: 'testPreSend',
    	    username: 'alan',
    	    channel: '@alan',
//	    users: [ 'alan', 'james' ],
//	    attachments: [ { text: 'test to @alan, @lyle' } ],
	    test: true
    	}, function (err, count, msg) {
	    test.ifError(err);
	    test.ok(count == 1);
    	    test.done();
    	});
    },

    testSlackCountUsers1: function(test) {
	test.expect(2);
    	slack.slack({
    	    text: 'testPreSend',
    	    username: 'alan',
    	    channel: '@alan',
	    dm: [ '@alan', '@james' ],
	    test: true
    	}, function (err, count, msg) {
	    test.ifError(err);
	    test.ok(count == 3, "Count must be 3, but " + count);
    	    test.done();
    	});
    },

    testSlackCountUsers2: function(test) {
	test.expect(2);
    	slack.slack({
    	    text: 'testPreSend',
    	    username: 'alan',
    	    channel: '@alan',
	    dm: [],
	    attachments: [ { text: 'test @alan, @james' } ],
	    test: true
    	}, function (err, count, msg) {
	    test.ifError(err);
	    test.ok(count == 3, "Count must be 3, but " + count);
    	    test.done();
    	});
    },

    testSlackCountUsers3: function(test) {
	test.expect(2);
    	slack.slack({
    	    text: 'testPreSend',
    	    username: 'alan',
    	    channel: '@alan',
	    dm: [ '@alan', '@james' ],
	    attachments: [ { text: 'test @alan, @james' } ],
	    test: true
    	}, function (err, count, msg) {
	    test.ifError(err);
	    test.ok(count == 5, "Count must be 3, but " + count);
    	    test.done();
    	});
    },

};
