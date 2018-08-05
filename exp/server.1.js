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

expressApp.get('/getRecentPosts/:board/:count', async (req, res) => {
	pino.debug(`expressApp.get /getRecentPosts/${req.params.board}/${req.params.count}`)

	console.time("Express getRecentPosts")

	const posts = []

	res.setHeader('Content-Type', 'application/json')
	res.write("[")

	let first = true

	db.postsDB.createValueStream({
		gt: [req.params.board,0],
		lte: [req.params.board,Infinity],
		fillCache: true,
		limit: Number(req.params.count),
		reverse: true
	})
		.on('data', data => {
			//posts.push(data)
			if(!first){
				res.write(",")
			}else{
				first = false
			}
			res.write(JSON.stringify(data))
		})
		.on('end', function () {
			console.timeEnd("Express getRecentPosts")
			pino.info(`Sending the ${posts.length} most recent posts to client`)
			res.write("]")
			res.end()
		})
})

expressApp.get('/getThreadINDIVIDUALALL/:board/:threadNum', async (req, res) => {
	pino.debug(`expressApp.get /getThread/${req.params.board}/${req.params.threadNum}`)

	console.time("Express getThread")

	const OP = await db.threadsDB.get([req.params.board,Number(req.params.threadNum)])

	const posts = []

	for(let postNum of OP["__postNums"]){
		posts.push(db.postsDB.get([req.params.board,postNum]))
	}

	res.send(await Promise.all(posts))

	console.timeEnd("Express getThread")
})

expressApp.get('/getThreadINDIVIDUAL/:board/:threadNum', async (req, res) => {
	pino.debug(`expressApp.get /getThread/${req.params.board}/${req.params.threadNum}`)

	console.time("Express getThread")

	const OP = await db.threadsDB.get([req.params.board,Number(req.params.threadNum)])

	const posts = []

	for(let postNum of OP["__postNums"]){
		posts.push(await db.postsDB.get([req.params.board,postNum]))
	}

	console.timeEnd("Express getThread")

	res.send(posts)
})

expressApp.get('/getThreadSOMEATONCE/:board/:threadNum', async (req, res) => {
	pino.debug(`expressApp.get /getThread/${req.params.board}/${req.params.threadNum}`)

	console.time("Express getThread")

	const OP = await db.threadsDB.get([req.params.board,Number(req.params.threadNum)])

	const promises = []
	const posts = []

	const postNumLen = OP["__postNums"].length
	for(let i = 0; i < postNumLen;){
		for(let j = 0; j < 10 && i < postNumLen; j++){
			promises.push(db.postsDB.get([req.params.board,OP["__postNums"][i++]]))
		}
		await Promise.all(promises)
	}

	//posts[0] = OP

	console.timeEnd("Express getThread")

	res.send(await Promise.all(promises))
})

expressApp.get('/getThreadALLATONCE/:board/:threadNum', async (req, res) => {
	pino.debug(`expressApp.get /getThread/${req.params.board}/${req.params.threadNum}`)

	console.time("Express getThread")

	const OP = await db.threadsDB.get([req.params.board,Number(req.params.threadNum)])

	const promises = []

	for(let postNum of OP["__postNums"]){
		promises.push(db.postsDB.get([req.params.board,postNum]))
	}

	const posts = await Promise.all(promises)

	posts[0] = OP

	console.timeEnd("Express getThread")

	res.send(posts)
})
/*
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
*/

module.exports = {
	expressApp,
	io
}