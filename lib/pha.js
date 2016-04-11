'use strict';

const createCanduit = require('canduit');
const disparity = require('disparity');
const Q = require('q');
const async = require('async');
const _ = require('underscore');

module.exports = Pha;

function Pha() {
    let self = this;
}

Pha.prototype.config = {
    'api': 'https://phabricator.healcerion.com/api/',
    'token': 'api-mage2gu35xq2fgzau4frmb4fam4w'
};

Pha.prototype.init = function(callback) {
    let self = this;
    createCanduit(self.config, function(err, obj) {
	if (!err)
	    self.canduit = obj;
	callback(err);
    });
}

Pha.prototype.convSlack = function(obj, callback) {
    let self = this;

    if (!('storyData' in obj) || !('objectPHID' in obj['storyData'])) {
	callback(new Error("Bad Pha Message"));
	return;
    }

    let type = obj['storyData']['objectPHID'].match(/PHID-(\w+)-/);
    switch (type[1]) {
    case 'TASK':
	self.convSlackTask(obj, callback);
	break;
    case 'WIKI':
	self.convSlackWiki(obj, callback);
	break;
    case 'PROJ':
	callback(new Error('Skip Event' + obj['storyData']['objectPHID']));
	break;
    default:
	self.convSlackDefault(obj, callback);
    }
}

Pha.prototype.convSlackDefault = function(obj, callback) {
    let self = this;
    let id = obj.storyData.objectPHID;
    async.waterfall([
	function(callback) {
	    self.canduit.exec('phid.query', { "phids": [ id ] },
			 function (err, info) {
			     callback(null,info);
		});
	},
    ], function(err, info) {
	let msg = {};
	msg.username = obj.storyText.split(' ')[0];
	msg.text = obj.storyText.substr(msg.username.length).trim() + ' (<' + info[id].uri + '|More Info>)';
	msg.channel = '#git';
	callback(null, msg);
    });
}

Pha.prototype.convSlackTask = function(obj, callback) {
    let self = this;
    async.waterfall([
	function(callback) {
	    self.getTaskInfo(obj.storyData.objectPHID, function(err, tinfo) {
		callback(null, tinfo);
	    });
	},
	function(tinfo, callback) {
	    let cc = [].concat(tinfo.authorPHID, tinfo.ownerPHID, tinfo.ccPHIDs, tinfo.projectPHIDs);
	    self.resolveUserIDs(cc, obj.storyAuthorPHID, function(err, ids) {
		callback(null, tinfo, ids);
	    });
	},
    ], function(err, tinfo, ids) {
	self.convNames(ids, function(err, names) {
	    let tx = self.getTaskTransaction(obj, tinfo);
	    if (!tx) {
		callback(new Error('No Transaction'));
		return;
	    }

	    let text = tx.comments || tx.newValue;
	    if (!text || typeof(text) != 'string') {
		callback(new Error('No Text Script'));
		return;
	    }

	    let name = tinfo.objectName + ": " + tinfo.title;	    
	    let msg = {};
	    msg.username = obj.storyText.split(' ')[0];
	    msg.text = obj.storyText.substr(msg.username.length).trim().replace(name, '<' + tinfo.uri + '|' + name + '>');
	    msg.users = names;
	    self.convFileLinks(text, function(err, text) {
		msg.attachments = [
		    {
			text: text
		    }
		];
		callback(null, msg);
	    });
	});
    });
}

Pha.prototype.convSlackWiki = function(obj, callback) {
    let self = this;
    let id = obj.storyData.objectPHID;
    async.waterfall([
	function(callback) {
	    self.canduit.exec('phid.query', { "phids": [ id ] },
			 function (err, winfo) {
			     var uri = decodeURI(winfo[id].uri);
			     var slug = uri.substr("https://phabricator.healcerion.com/w/".length);
			     callback(null, slug, winfo);
		});
	},
	function(slug, wi, callback) {
	    self.canduit.exec('phriction.history', { 'slug': slug }, function (err, winfo) {
		callback(null, winfo);
	    });
	},
    ], function(err, winfo) {
	if (!winfo) {
	    callback(new Error('Bad Wiki Info massage'), winfo)
	    return;
	}

	var n = winfo.length;
	var msg = {};
	msg.username = obj.storyText.split(' ')[0];

	msg.text = obj.storyText.substr(msg.username.length).trim().match(/.* of /);
	msg.text += ' <' + winfo[0].uri + '|WIKI: ' + winfo[0].title + '>';
	msg.attachments = [ {} ];

	msg.text += '\n<';
	msg.text += winfo[0].uri
	    .replace('https://phabricator.healcerion.com/w',
		     'https://phabricator.healcerion.com/phriction/history');
	msg.text += '|';
	if (winfo[0].description) {
	    msg.text += "v" + n + ": " + winfo[0].description;
	} else {
	    msg.text += "v" + n;
	}
	msg.text += '>';

	if (n == 1) {
	    msg.attachments[0].text = winfo[0].content;
	} else {
	    var text = disparity.unifiedNoColor(winfo[1].content, winfo[0].content)
		.replace(/\\ No newline at end of file\n/g, '');

	    var lines = text.split('\n');
	    lines.splice(0,2);
	    msg.attachments[0].text = lines.join('\n');
	}
	callback(null, msg);
    });
};

Pha.prototype.getTaskInfo = function(tid, callback) {
    let self = this;
    self.canduit.exec('maniphest.query', { "phids": [ tid ] },
		 function (err, data) {
		     var task = data[tid];
		     self.canduit.exec('maniphest.gettasktransactions', { 'ids': [ task.id ] },
				  function (err, data) {
				      task.transactions = data[task.id];
				      callback(null, task);
				  });
		     });
    
}

Pha.prototype.resolveUserIDs = function(upids, exIDs, callback) {
    let self = this;
    let ids = {};
    let left = 0;
    let finalError = false;

    function cb() {
	if (exIDs) {
	    if (typeof(exIDs) == 'string')
		exIDs = [ exIDs ];
	    _.each(exIDs, function(id) {
		if (id in ids)
		    delete ids[id];
	    });
	}
	callback(null, Object.keys(ids));
    };

    function resolvePRJ(mids) {
	_.each(mids, function(id) {
	    let type = id.match(/PHID-(\w+)-/);
	    if (!type)
		return;
	    switch (type[1]) {
	    case 'USER':
		ids[id] = true;
		break;
	    case 'PROJ':
		left++;
		self.canduit.exec('project.query', {
		    "phids": [ id ]
		}, function(err, data) {
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
			cb();
		    }
		});
	    }
	});
    };

    resolvePRJ(upids);
    if (left == 0)
	cb();
}

Pha.prototype.convNames = function(ids, callback) {
    if (ids.length == 0) {
	callback(null, []);
	return;
    }

    this.canduit.exec('user.query', { "phids": ids },
		 function(err, data) {
		     var names = [];
		     _.each(data, function(n) { names.push(n.userName); });
		     callback(null, names);
		 });
};

Pha.prototype.getTaskTransaction = function(obj, tinfo) {
    var txids = Object.keys(obj.storyData.transactionPHIDs);

    var txs = _.filter(tinfo.transactions, function(tx) {
	return _.find(txids, function(id) {
	    return id == tx.transactionPHID; });
    });	

    var tx = _.find(txs, function(tx) {
	return (tx.transactionType == 'core:comment' || tx.transactionType == 'description');
    });
    if (tx)
	return tx;

    // create인 경우에 descirption이 transaction list로 안오는 문제 보완
    if (_.find(txs, function(tx) { return tx.transactionType == 'core:create'; }))
	return _.find(tinfo.transactions, function(tx) {
	    return tx.transactionType == "description";
	});

    // resolve의 경우 comment없어도 올리기
    tx = _.find(txs, function(tx) { return tx.transactionType == 'status'; });
    if (tx) {
	return tx;
    }
    return undefined;
}

Pha.prototype.convFileLinks = function(text, callback) {
    let self = this;
    let list = text.match(/\{F(\d+)\}/g);
    let res = {};

    if (!list) {
	callback(null, text);
	return;
    }

    async.forEachOf(list, function(fid, index, next) {
	var id = fid.match(/\{F(\d+)\}/)[1];
	self.canduit.exec('file.info', { 'id': id },
		 function(err, data) {
		     if (!err)
			 res[fid] = data;
		     next();
		 });
    }, function (err) {
	var t = text;
	_.each(res, function(n) {
	    var r = new RegExp('{'+n.objectName+'}', 'g');
	    t = t.replace(r, '<' + n.uri + '|' + n.name + '>', 'g');
	});
	callback(null, t);
    });
}
