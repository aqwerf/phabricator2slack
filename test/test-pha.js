'use strict';

const Pha = require('../lib/pha.js');
const async = require('async');
const _ = require('underscore');

var pha = undefined;
var timeout = undefined;

module.exports = {
    setUp: function (done) {
	let self = this;
	
	if (timeout) {
	    clearTimeout(timeout);
	    done();
	    return;
	}
	pha = new Pha();
	pha.init(function(err) {
	    if (!err)
		done();
	});
    },

    tearDown: function(done) {
	timeout = setTimeout(process.exit, 1000);
	done();
    },

    testGetTaskInfo: function(test) {
	test.expect(2);
	pha.getTaskInfo('PHID-TASK-qjxdmqk7wut5g5ddf2qd',
			function(err, task) {
			    test.ifError(err);
			    test.ok(task && task.id == '908');
			    test.done();
			});
    },

    testConvFileLink: function(test) {
	var t = 'Test Link {F11056} {F11058}, {F11056}';
	var res = 'Test Link <https://phabricator.healcerion.com/F11056|human-1array-6cm-cyst.jpg> <https://phabricator.healcerion.com/F11058|human-2array-6cm-cyst.jpg>, <https://phabricator.healcerion.com/F11056|human-1array-6cm-cyst.jpg>';
	test.expect(2);
	pha.convFileLinks(t, function(err, text) {
	    test.ifError(err);
	    if (!err)
		test.deepEqual(text, res);
	    test.done();
	});
    },

    testResolveUserIDs: function(test) {
	test.expect(14);
	async.waterfall([
	    // 사용자 1명 확인하기
	    function(callback) {
		let ids = ['PHID-USER-swl7j67cbd3mobrp7k5l']; // alan
		pha.resolveUserIDs(ids, null,
				   function(err, list) {
				       test.ifError(err);
				       test.ok(list.length == 1);
				       test.deepEqual(list, ids);
				       callback(null, ids);
				   });
	    },
	    // user name check
	    function(ids, callback) {
		pha.convNames(ids,
			      function(err, list) {
				  test.ifError(err);
				  test.deepEqual(list, [ 'alan' ]);
				  callback(null, ids);
			      })
	    },
	    // lab resolve 해보기
	    function(ids, callback) {
		ids = ids.concat(['PHID-PROJ-zztmdh7r44lpleihz7nw']);  // lab
		pha.resolveUserIDs(ids, null,
				   function(err, list) {
				       test.ifError(err);
				       test.ok(list.length > 1);
				       callback(null, list);
				   });
	    },
	    function(ids, callback) {
		let names = [ 'alan', 'lyle', 'mathew', 'kevin', 'chris', 'peter',
			      'aaron', 'daniel', 'james', 'martin', 'charles', 'ben' ];
		pha.convNames(ids,
			      function(err, list) {
				  test.ifError(err);
				  test.ok(list.length == ids.length);
				  test.ok(_.intersection(list, names).length == names.length);
				  callback(null, ids);
			      })
	    },
	    // lab resolve에서 alan을 빼보기
	    function(ids, callback) {
		let ids2 = ['PHID-PROJ-zztmdh7r44lpleihz7nw']; // lab
		let ex = ['PHID-USER-swl7j67cbd3mobrp7k5l']; //  alan
		pha.resolveUserIDs(ids2, ex,
				   function(err, list) {
				       test.ifError(err);
				       test.ok(list.length > 1);
				       test.ok(list.length + 1 == ids.length);
				       test.deepEqual(_.difference(ids, list), ex);
				       callback(null, list);
				   });
	    },
	], function(err, ids) {
	    test.done();
	});
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
	test.expect(3);
	pha.convSlackTask(t, function(err, msg) {
	    console.log(msg);
	    test.ifError(err);
	    test.ok(msg.text.indexOf('T908') > 0);
	    test.ok(msg.attachments[0].text.length > 0);
	    test.done();
	});
    },

    testTaskCreate: function(test) {
	var t = {
	    storyID: '183707',
	    storyType: 'PhabricatorApplicationTransactionFeedStory',
	    storyData: {
		objectPHID: 'PHID-TASK-olmyj7vgqa43tv22thdh',
		transactionPHIDs: {
		    'PHID-XACT-TASK-qt42lkqozmdvdg3': 'PHID-XACT-TASK-qt42lkqozmdvdg3'
		}
	    },
	    storyAuthorPHID: 'PHID-USER-effp43w4k64jmqjzzhvx',
	    storyText: 'james created T1128: [FPGA]linear steer 동작시 ADC 8묶음 오차 발생.',
	    epoch: '1460120986'
	};
	test.expect(2);
	pha.convSlack(t, function(err, msg) {
	    console.log(msg);
	    test.ifError(err);
	    test.ok(msg.attachments[0].text.length > 0);
	    test.done();
	});
    },

    testTaskResolveWithoutComment: function(test) {
	var t = {
	    storyID: '183742',
	    storyType: 'PhabricatorApplicationTransactionFeedStory',
	    storyData: {
		objectPHID: 'PHID-TASK-yxlc3tean6ptljl2nne4',
		transactionPHIDs: {
		    'PHID-XACT-TASK-qcjqyvikmxzrq7c': 'PHID-XACT-TASK-qcjqyvikmxzrq7c'
		}
	    },
	    storyAuthorPHID: 'PHID-USER-swl7j67cbd3mobrp7k5l',
	    storyText: 'alan closed T1113: Phabricator Test  as "Resolved".',
	    epoch: '1460354883'
	};
	test.expect(2);
	pha.convSlack(t, function(err, msg) {
	    console.log(msg);
	    test.ifError(err);
	    test.ok(msg && msg.attachments[0].text.length > 0);
	    test.done();
	});
    },
    testWikiComment: function(test) {
	var t = {
	    storyID: '183679',
	    storyType: 'PhabricatorApplicationTransactionFeedStory',
	    storyData: {
		objectPHID: 'PHID-WIKI-bnym7bd7qrjsv7gr5eyp',
		transactionPHIDs: {
		    'PHID-XACT-WIKI-hh2sfkzbv4tbdzu': 'PHID-XACT-WIKI-hh2sfkzbv4tbdzu'
		}
	    },
	    storyAuthorPHID: 'PHID-USER-swl7j67cbd3mobrp7k5l',
	    storyText: 'alan edited the content of IRM PACS ',
	    ' EMR 연동 프로젝트.': '',
	    epoch: '1460099853'
	};
	test.expect(2);
	pha.convSlack(t, function(err, msg) {
	    console.log(msg);
	    test.ifError(err);
	    test.ok(msg.attachments[0].text.length > 0);
	    test.done();
	});	    
    }
}

