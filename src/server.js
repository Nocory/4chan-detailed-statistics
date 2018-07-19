const pino = require('./pino')

const expressApp = require('express')()
const server = require('http').Server(expressApp)
const io = require('socket.io')(server)
const db = require("./db")

expressApp.use(require('helmet')())
expressApp.use(require('compression')()) // TODO: not needed? Maybe nginx handles it by itself

server.listen(8080)

io.on('connection', socket => {
	let ip = socket.request.headers["x-real-ip"] || socket.request.headers["x-forwarded-for"] || socket.handshake.address
	pino.info("New connection from %s",ip)
	socket.on('disconnect', reason => {
		pino.info("Socket %s disconnected: %s",ip,reason)
	})
})

io.on("connect",socket => {
	socket.emit("initialData",db.lowFinalResultsDB.value())
})

// send data to all distributor-clients, that might already have connected earlier
io.emit("initialData",db.lowFinalResultsDB.value())

expressApp.get('/initialData', function (req, res) {
	pino.debug("expressApp.get /initialData from: %s",req.get('x-real-ip') || req.ip)
	res.send(db.lowFinalResultsDB.value())
})

expressApp.get('/4statsMentions', function (req, res) {
	pino.debug("expressApp.get /4statsMentions from: %s",req.get('x-real-ip') || req.ip)
	res.send(db.low4statsMentionsDB.value())
})

const wordPromiseQueue = []

const analyzeText = require("./analyzeText")

expressApp.get('/analyzeText', (req, res) => {
	const word = req.query.word

	pino.debug(`expressApp.get /analyzeText/${req.query.word}`)
	pino.debug(`wordPromiseQueue: ${wordPromiseQueue.length} - ${wordPromiseQueue}`)
	
	if(!word || word.length < 3 || word.length > 20){
		pino.warn("Refused request. Invalid word")
		res.status(400).send("Invalid word")
		return
	}

	if(wordPromiseQueue.length >= 5){
		pino.warn("Refused request. wordPromiseQueue is full")
		res.status(500).send("Sorry, the server is already handling a bunch of request. Please try again later.")
		return
	}

	const prevPromise = wordPromiseQueue.length ? wordPromiseQueue[wordPromiseQueue.length - 1] : Promise.resolve()

	const newPromise = new Promise(async (resolve,reject) => {
		try{
			await prevPromise
			const result = await analyzeText.analyzeAll(req.query.word)
			res.send(result)
		}catch(err){
			pino.error(err.message)
			res.status(500).send()
		}
		wordPromiseQueue.shift()
		resolve()
	})
	
	wordPromiseQueue.push(newPromise)
})

const analyzeText_exp_fromDB = require("./analyzeText_exp_fromDB")
expressApp.get('/analyzeTextFromDB', async function (req, res) {
	pino.debug(`expressApp.get /analyzeTextFromDB/${req.query.word}`)
	try{
		const result = await analyzeText_exp_fromDB.analyzeAll(req.query.word)
		res.send(result)
	}catch(err){
		console.error(err.message)
		res.status(500).send()
	}
})

module.exports = {
	expressApp,
	io
}