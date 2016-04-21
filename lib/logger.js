'use strict';

const winston = require('winston');

var logger = new winston.Logger({
    level: 'info',
    transports: [
	new (winston.transports.Console)({
	    timestamp: true,
	    json: false
	})
    ]
});

module.exports = logger;

