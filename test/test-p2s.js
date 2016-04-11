'use strict';

const P2S = require('../lib/p2s.js');
const async = require('async');
const _ = require('underscore');

var p2s = undefined;
var timeout = undefined;

module.exports = {
    setUp: function (done) {
	let self = this;
	
	if (timeout) {
	    clearTimeout(timeout);
	    done();
	    return;
	}
	p2s = new P2S();
	done();
    },

    tearDown: function(done) {
	timeout = setTimeout(process.exit, 1000);
	done();
    },

    testTaskComment: function(test) {
	var t = {
	    storyID: '183712',
	    storyType: 'PhabricatorApplicationTransactionFeedStory',
	    storyData:
	    {
		objectPHID: 'PHID-TASK-qjxdmqk7wut5g5ddf2qd',
		transactionPHIDs: {
		    'PHID-XACT-TASK-cxsekl2nmfprmpj': 'PHID-XACT-TASK-cxsekl2nmfprmpj'
		}
	    },
	    storyAuthorPHID: 'PHID-USER-p2wasyrxsokbyj7aekvd',
	    storyText: 'mathew added a comment to T908: Demo Program에 Blending Image Scan Conversion 기능 추가.',
	    epoch: '1460122513'
	};
	test.expect(1);
	p2s.notify(t, true, function(err, count, msg) {
	    test.ifError(err);
	    test.done();
	});
    },
}

