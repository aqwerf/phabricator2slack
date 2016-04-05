var createCanduit = require('canduit');
var qs = require('qs');
var slack = require('./slackchat');
var deepcopy = require("deepcopy");

var canduit = null;

const config = {
    'api': 'https://phabricator.healcerion.com/api/',
    'token': 'api-mage2gu35xq2fgzau4frmb4fam4w'
};

exports.init = function(callback) {
    createCanduit(config, function(err, obj) {
	if (!err)
	    canduit = obj;
	callback(err);
    });
}

exports.notifySlack = function(body) {
    var obj = qs.parse(body);

    console.log(obj);
    if (!obj.hasOwnProperty('storyData') || !obj['storyData'].hasOwnProperty('objectPHID'))
	return;
    
    if (obj['storyData']['objectPHID'].indexOf('PHID-TASK-') == 0)
	exports.notifyManiphest(obj);
    else if (obj['storyData']['objectPHID'].indexOf('PHID-WIKI-') == 0)
	exports.notifyWiki();
};

// convert user PHIDS array to user name
exports.convUserName = function(ids, callback) {
    if (ids.length == 0) {
	callback(null, []);
	return;
    }

    canduit.exec('user.query', { "phids": ids },
		 function(err, data) {
		     var names = [];
		     for (var i=0; i<data.length; i++)
			 names.push(data[i].userName);
		     callback(err, names);
		 });
};

// get user PHIDS for maniphest
exports.getUserIds = function(maniphest, exID, callback) {
    var ids = {};
    var left = 0;
    var finalError = false;

    var convArray = function(obj) {
	if (exID && obj.hasOwnProperty(exID))
	    delete obj[exID];
	return Object.keys(obj);
    };

    var resolvePRJ = function(mids) {
	for (var i=0; i < mids.length; i++) {
	    if (mids[i].indexOf('PHID-USER') == 0) {
		ids[mids[i]] = 1;
	    } else if (mids[i].indexOf('PHID-PROJ') == 0) {
		left++;
		canduit.exec('project.query',
			     { "phids": [ mids[i] ] }, function(err, data) {
				 if (finalError)
				     return;
				 
				 if (err) {
				     finalError = true;
				     callback(err, null);
				     return;
				 }

				 left--;
				 resolvePRJ(data.data[Object.keys(data.data)[0]].members);
				 if (left <= 0) {
				     callback(null, convArray(ids));
				 }
			     });
	    }
	}
    };

    ids[maniphest.authorPHID] = 1;
    ids[maniphest.ownerPHID] = 1;

    resolvePRJ(maniphest.ccPHIDs);
    resolvePRJ(maniphest.projectPHIDs);
    if (left == 0) {
	callback(null, convArray(ids));
    }
};

exports.getTaskInfo = function (tid, callback) {
    var task;
    
    canduit.exec('maniphest.query', { "phids": [ tid ] },
		 function (err, data) {
		     task = data[tid];
		     canduit.exec('maniphest.gettasktransactions', { 'ids': [ task.id ] },
				  function (err, data) {
				      task.transactions = data[task.id];
				      callback(null, task);
				  });
		     });
};

function getTransaction(obj, tinfo)
{
    var t = null;
    var txids = Object.keys(obj.storyData.transactionPHIDs);

    for (var i = 0; i < txids.length; i++) {
	for (var j = 0; j < tinfo.transactions.length; j++) {
	    if (tinfo.transactions[j].transactionPHID == txids[i]) {
		t = tinfo.transactions[i];
		break;
	    }
	}

	if (t && (t.transactionType == 'core:comment' ||
		  t.transactionType == 'description'))
	    break;
    }
    return t;
}

exports.buildText = function(obj, callback) {
    var tid = obj.storyData.objectPHID;
    var msg = {};

    exports.getTaskInfo(tid, function(err, tinfo) {
	exports.getUserIds(tinfo, obj.storyAuthorPHID, function(err, uids) {
	    exports.convUserName(uids, function(err, users) {
		var tx = getTransaction(obj, tinfo);
		var name = tinfo.objectName + ": " + tinfo.title;
		msg.username = obj.storyText.split(' ')[0];
		msg.text = obj.storyText.substr(msg.username.length).trim().replace(name, '<' + tinfo.uri + '|' + name + '>');
		msg.users = users;
		msg.attachments = [
		    {
			//title: obj.storyText.replace(name, '<' + tinfo.uri + '|' + name + '>'),
			// title: tinfo.uri,
			// title_link: tinfo.uri,
			text: tx.comments || tx.newValue
			}
		];
		callback(null, msg);
	    });
	});
    });

};

exports.notifyManiphest = function (obj) {
    exports.buildText(obj, function(err, msg) {
	slack(msg);
    });
}

function notifyWiki() {
}

