'use strict';

const createCanduit = require('canduit');
const disparity = require('disparity');
const Q = require('q');
const async = require('async');
const _ = require('underscore');
const config = require('../config.js');

module.exports = Pha;

function Pha() {
    let self = this;
}

Pha.prototype.config = {
    'api': config.phabricator.base + 'api/',
    'token': config.phabricator.token
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
    case 'CMIT':
	self.convSlackGit(obj, callback);
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
	msg.text = obj.storyText + ' (<' + info[id].uri + '|More Info>)';
	msg.channel = config.slack.defaultChannel;
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
	    self.convProjectNames(tinfo.projectPHIDs, function(err, names) {
		tinfo.projectNames = names;
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
	    msg.channel = config.slack.maniphestChannel;
	    msg.username = obj.storyText.split(' ')[0];
	    msg.text = obj.storyText.replace(name, '<' + tinfo.uri + '#' + tx.transactionID + '|' + name + '>');
	    msg.users = names;
	    msg.projects = tinfo.projectNames;
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
			     var slug = uri.substr((config.phabricator.base + 'w/').length);
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
	
	msg.channel = config.slack.phrictionChannel;
	msg.username = obj.storyText.split(' ')[0];
	msg.text = msg.username + ' <' + winfo[0].uri + '|WIKI: ' + winfo[0].title + '>';
	msg.attachments = [ {} ];

	msg.text += '\n<';
	msg.text += winfo[0].uri
	    .replace(config.phabricator.base + 'w',
		     config.phabricator.base + 'phriction/history');
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

Pha.prototype.convSlackGit = function(obj, callback) {
    let self = this;
    let id = obj.storyData.objectPHID;
    async.waterfall([
	function(callback) {
	    self.canduit.exec('diffusion.querycommits', { "phids": [ id ], "needMessages": true },
			 function (err, info) {
			     let git = info.data[id];
			     callback(null, git);
		});
	},
	function(git, callback) {
	    self.canduit.exec('phid.query', { "phids": [ git.repositoryPHID ] },
			 function (err, info) {
			     git.repository = info[git.repositoryPHID];
			     callback(null, git);
		});
	},
    ], function(err, git) {
	let msg = {};
	msg.channel = config.slack.diffusionChannel;
	msg.username = obj.storyText.split(' ')[0];
	msg.text = msg.username + ' committed <' + git.repository.uri + "|" + git.repository.fullName + '>: '
	    + '<' + git.uri + '|' + git.identifier.substr(0, 10) + '>';
	msg.attachments = [{
	    text: git.message.replace(/T\d+/, '<' + config.phabricator.base + '$&|$&>')
	}];
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

Pha.prototype.convProjectNames = function(ids, callback) {
    if (ids.length == 0) {
	callback(null, []);
	return;
    }

    this.canduit.exec('project.query', { 'phids': ids },
		      function(err, data) {
			  var names = [];
			  _.each(data.data, function(n) { names.push(n.name); });
			  callback(null, names);
		      });
};

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

    // create transacton has no description information 
    if (_.find(txs, function(tx) { return tx.transactionType == 'core:create'; }))
	return _.find(tinfo.transactions, function(tx) {
	    return tx.transactionType == "description";
	});

    // sent notify for resolved task even though no comment
    tx = _.find(txs, function(tx) { return tx.transactionType == 'status'; });
    if (tx) {
	return tx;
    }
    return undefined;
}

Pha.prototype.convFileLinks = function(text, callback) {
    let self = this;
    let list = text.match(/(\{F\d+[^\}]*\})/g);
    let links = [];

    if (!list) {
	callback(null, text);
	return;
    }

    _.each(list, function(n) {
	var num = n.match(/\{F(\d+).*\}/)[1];
	links.push({
	    str: n,
	    num: num
	});
    });

    let s = _.uniq(_.map(links, function(n) { return n.num; }));

    async.forEachOf(s, function(id, index, next) {
	self.canduit.exec('file.info', { 'id': id },
		 function(err, data) {
		     if (!err) {
			 _.each(links, function(n) {
			     if (n.num == id)
				 n.info = data;
			 });
		     }
		     return next();
		 });
    }, function (err) {
	var t = text;
	_.each(links, function(n) {
	    t = t.replace(n.str, '<' + n.info.uri + '|' + n.info.name + '>');
	});
	callback(null, t);
    });
}
