var pha = require('../lib/pha');

var story = {
    storyID: '183517',
    storyType: 'PhabricatorApplicationTransactionFeedStory',
    storyData:
    {
	objectPHID: 'PHID-WIKI-ryjm3xylavv3yzgbc3t5',
	transactionPHIDs: {
	    'PHID-XACT-WIKI-xqlhm6x4uuve6a6': 'PHID-XACT-WIKI-xqlhm6x4uuve6a6'
	}
    },
    storyAuthorPHID: 'PHID-USER-swl7j67cbd3mobrp7k5l',
    storyText: 'alan edited the content of Sandbox.',
    epoch: '1459850419'
};

pha.init(function(err) {
    pha.buildTextWiki(story, function(err, msg) {
	console.log(msg);
    });
});
