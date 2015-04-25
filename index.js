let http = require('http')
let https = require('https')
let fs = require('fs')
let request = require('request')
let through = require('through')
let schemeHttp = 'http://'
let schemeHttps = 'https://'
let argv = require('yargs')
  .default('host', '127.0.0.1')
  .usage('Usage: nodemon --exec babel-node -- index.js [options]')
  .help('h')
  .describe('url', 'Url of the proxy server')
  .describe('port', 'Port of the proxy server')
  .describe('x-destiation-url', 'Pass destination url in the header')
  .describe('logfile', 'Logfile name to output the logs to')
  .describe('loglevel', 'To set the logging level')
  .describe('host', 'This is the default host')
  .example('nodemon --exec babel-node -- index.js --host www.google.com --port 8000')
  .argv
let port = argv.port || argv.host === '127.0.0.1' ? 8000 : 80
let destinationUrl = argv.url || schemeHttp  + argv.host + ':' + port  ||  schemeHttps  + argv.host + ':' + port
let child_process = require('child_process')
let exec = argv.exec
let loggingLevel = argv.loglevel 
let winston = require('winston')
winston.emitErrs = true
//if the logging level is not provided in the command line, set it to info
let logLevel = argv.loglevel ? argv.loglevel  : 'info'
let logger = argv.file ?  new (winston.Logger)({
	   								transports: [
	    										new winston.transports.File({ filename: argv.file, level : logLevel})  
										]})  :  new (winston.Logger)({
	   												transports: [
	    												new winston.transports.Console({
	    													name :  'info-log',
	    													level:  'info'
	    												}),
	    												new winston.transports.Console({
	    													name : 'debug-log',
	    													level: 'debug'
	    												}),
	    												new winston.transports.Console({
	    													name : 'error-log',
	    													level: 'error'
	    												})
					      							]})
										
//Prcocess forwarding
if (exec){
	child_process.spawn(exec, argv._, {stdio: 'inherit'}) 
    process.exit(0)
}

http.createServer((req, res) => {
	logger.debug('\n\n Request headers : \n' + JSON.stringify(req.headers))

	for (let header in req.headers) {
		res.setHeader(header, req.headers[header])
	}
	through(req, logger, {autoDestroy: false})
	req.pipe(res)	
}).listen(8000)

logger.debug('\n\n Listening at http://127.0.0.1:8000 \n')

http.createServer((req, res) => {
	let url = destinationUrl
	if (req.headers['x-destination-url']) {
		url = req.headers['x-destination-url']
	}
	let options = {
		headers: req.headers,
		url: url  +  req.url
	}
   	logger.debug('\n\n  Proxy Request :\n' + JSON.stringify(req.headers))
	through(req, logger, {autoDestroy: false})

	let destinationResponse = req.pipe(request(options))

   	destinationResponse.pipe(res)
	through(destinationResponse, logger, {autoDestroy:false})
}).listen(8001)



