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
/*
const analyzeText = require("./analyzeText")
expressApp.get('/wordStats/:word', async (req, res) => {
	try{
		res.send(await analyzeText.analyzeAll(req.params.word))
	}catch(err){
		console.error(err)
		res.send(err)
	}
})
*/

module.exports = {
	expressApp,
	io
}