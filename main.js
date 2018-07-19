const fs = require("fs")
const db = require("./src/db")
const analyze = require("./analyze.js")
const pino = require("./src/pino")

let cycleStartTime = Date.now()
let bytesLoaded = 0
let lastRequest = Date.now()

const getKBs = () => {
	return `${(bytesLoaded / 1000 / ((Date.now() - cycleStartTime) / 1000)).toFixed(2)}kB/s`
}

const axios = require("axios").create({
	timeout: 5000,
	headers: {
		'Accept-Encoding': 'gzip',
		"Cache-Control"	: "max-age=0"
	},
	validateStatus: function(status) {
		return status === 200
	}
})

axios.interceptors.response.use(function(res) {
	bytesLoaded += parseInt(res.headers["content-length"] || 0)
	return res
}, function(error) {
	return Promise.reject(error)
})

const argv = require('yargs')
	.default('from', "3")
	.default('to', "y")
	.default('pages', 999)
	.default('delay', 1000)
	.default('regenerate', true)
	.argv


let allBoards = require("./src/config.js").boards
allBoards = allBoards.slice(allBoards.indexOf(argv.from),allBoards.indexOf(argv.to) + 1)
//console.log(allBoards)
if (!allBoards.length){
	pino.fatal("invalid boards selected")
	return
}
////////////////
// setup done //
////////////////

const sleep = async (ms = Math.max(argv.delay - (Date.now() - lastRequest),0)) => {
	await new Promise(resolve => {
		setTimeout(resolve,ms)
	})
}

const boardWeight = {}
const determineNextBoard = () => {
	const customWeight = {
		pol: 2,
		v: 2,
		vg: 1.5,
		b: 2,
		sp: 2,
		a: 1.5,
		int: 1.5,
		tv: 1.5,
		r9k: 1.5,
		mu: 1.2,
		biz: 1.2,

	}
	for(let board in boardWeight){
		boardWeight[board] += customWeight[board] || 1
	}
	const winnerBoard = Object.entries(boardWeight).reduce((acc,val) => acc = val[1] > acc[1] ? val : acc,[argv.from, 0]) // returns [board,value]
	boardWeight[winnerBoard[0]] = 0
	console.log(`DEBUG: next board ${winnerBoard[0]}, weight: ${winnerBoard[1]}`)
	return winnerBoard[0]
}

const getThread = async (board,threadNum,attempt = 1) => {
	try{
		await sleep()
		lastRequest = Date.now()
		const res = await axios.get(`https://a.4cdn.org/${board}/thread/${threadNum}.json`)
		
		if(attempt > 1) pino.debug(`/${board}/ #${threadNum} loaded after ${attempt} attempts`)
		return res.data
	} catch(err){
		pino.warn(err.message,`/${board}/ #${threadNum} failed at attempt ${attempt}`)
		if(attempt >= 2) return null
		if(err.response && err.response.status == 404) return null
		return getThread(board,threadNum,attempt + 1)
	}
}

const handleCatalog = async (board,catalog) => {
	/* eslint-disable no-await-in-loop */
	const boardDB = db.getBoardDB(board)
	catalog = catalog.slice(0,argv.pages)
		
	const newThreads = {}
	let threadCount = [0,catalog.reduce((acc,val) => acc + val.threads.length,0)] //FIXME: page 11 usually contains only 1 or 2 threads
	let threadFails = 0
	for(let page of catalog.reverse()){//start from the end of the catalog, otherwise threads might be pushed off in the meantime
		for(let catalogThread of page.threads.reverse()){ // same thing, start from the back
			threadCount[0]++
			//check if thread in the DB is still fresh
			//TODO: remove soon, temp workaround since the object layout changed
			const existingThread = boardDB.get(String(catalogThread.no),null).value() || boardDB.get("threads."+ String(catalogThread.no),null).value()
			if(existingThread && existingThread.posts[existingThread.posts.length - 1].time == catalogThread.last_modified){
				existingThread.snapTime = Date.now()
				newThreads[String(catalogThread.no)] = existingThread
			}else{
				// fetch the thread 
				const threadContent = await getThread(board,catalogThread.no)
				if(threadContent){
					threadContent.snapTime = Date.now()
					newThreads[String(catalogThread.no)] = threadContent
					pino.debug(`/${board}/ (${threadCount[0]}/${threadCount[1]}) | ${getKBs()}`)
				}else{
					threadFails++
					pino.error(`/${board}/ #${catalogThread.no} failed to load. ${threadFails} failed requests so far.`)
				}
			}
		}
	}
	if(threadFails < threadCount[1] * 0.25){
		const snapTime = Date.now()
		const duration = snapTime - (boardDB.get("snapTime").value() || 0)
		boardDB.setState({
			snapTime,
			duration,
			threads: newThreads
		}).write()
		pino.debug(`/${board}/ threads saved to disk`)
		analyze(board,boardDB)
	}else{
		pino.error(`/${board}/ had too many failed requests ${threadFails}/${threadCount[1]}. Not writing threads to disk !!!`)
	}
}

const getCatalog = async board => {
	cycleStartTime = Date.now()
	bytesLoaded = 0
	try{
		await sleep()
		lastRequest = Date.now()
		const res = await axios.get(`https://a.4cdn.org/${board}/catalog.json`)
		
		pino.debug(`/${board}/ catalog loaded | ${getKBs()}`)

		await handleCatalog(board,res.data)
		getCatalog(determineNextBoard())
	} catch(err){
		pino.error(err.message,`Retrying /${board}/ catalog in 5 seconds . . .`)
		await sleep(5000)
		getCatalog(board)
	}
}



const main = async () => {
	/*
	const convertOldMetadata = require("./src/convertOldMetadata")
	pino.info("⏳   Starting old metaData conversion")
	for(let board of allBoards){
		await convertOldMetadata(board)
	}
	*/
	
	if(argv.regenerate){
		pino.info("⏳   Starting regeneration")
		await require("./regenerate")()
	}
	
	pino.info("⏳   Checking for oldest raw data. This might take a few seconds.")
	const now = Date.now()
	for(let board of allBoards){
		const file = `rawData/${board}.json`
		if(!fs.existsSync(file)){
			boardWeight[board] = 999999
			continue
		}
		const boardDB = db.getBoardDB(board)
		boardWeight[board] = (now - (boardDB.get("snapTime").value() || 0)) / (1000 * 60)
	}
	
	getCatalog(determineNextBoard())
}

main()