'use strict';

const winston = require('winston');

var logger = new winston.Logger({
    level: 'info',
    transports: [
	new (winston.transports.Console)(),
	new (winston.transports.File)({
	    filename: 'transaction.log',
	    timestamp: true,
	    json: false
	})
    ]
});

module.exports = logger;

