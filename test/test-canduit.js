const createCanduit = require('canduit');

createCanduit(
    {
	'api': 'https://phabricator.healcerion.com/api/',
	'token': 'api-mage2gu35xq2fgzau4frmb4fam4w'
    },
    function (err, canduit) {
	canduit.exec('maniphest.query', { "phids": [ 'PHID-TASK-d3xs4imi63tk4fdzfych' ] },
		     function (err, maniphest) {
			 console.log(maniphest);
		     }
		    );
    });
