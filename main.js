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

const OPTIONS = {
	"--from": "3",
	"--to": "y",
	"--pages": 999,
	"--delay": 1000
}
for(let i = 2; i < process.argv.length; i+=2){
	OPTIONS[process.argv[i]] = process.argv[i+1]
}
OPTIONS["--pages"] = parseInt(OPTIONS["--pages"])


let allBoards = require("./src/config.js").boards
allBoards = allBoards.slice(allBoards.indexOf(OPTIONS["--from"]),allBoards.indexOf(OPTIONS["--to"]) + 1)
//console.log(allBoards)
if (!allBoards.length){
	pino.fatal("invalid boards selected")
	return
}
////////////////
// setup done //
////////////////

const sleep = async (ms = Math.max(OPTIONS["--delay"] - (Date.now() - lastRequest),0)) => {
	await new Promise(resolve => {
		setTimeout(resolve,ms)
	})
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
	catalog = catalog.slice(0,OPTIONS["--pages"])
		
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

const getCatalog = async index => {
	if(index >= allBoards.length){
		cycleStartTime = Date.now()
		bytesLoaded = 0
		index = 0
	}
	const board = allBoards[index]
	try{
		await sleep()
		lastRequest = Date.now()
		const res = await axios.get(`https://a.4cdn.org/${board}/catalog.json`)
		
		pino.debug(`/${board}/ catalog loaded | ${getKBs()}`)

		await handleCatalog(board,res.data)
		getCatalog(index + 1)
	} catch(err){
		pino.error(err.message,"Retrying in 5 seconds . . .")
		await sleep(5000)
		getCatalog(index)
	}
}

const main = async () => {
	const convertOldMetadata = require("./src/convertOldMetadata")
	pino.info("⏳   Starting old metaData conversion")
	for(let board of allBoards){
		await convertOldMetadata(board)
	}
	
	const regenerate = require("./regenerate")
	pino.info("⏳   Starting regeneration")
	await regenerate()
	
	pino.info("⏳   Checking for oldest raw data. This might take a few seconds.")
	
	let oldestBoard = allBoards[0]
	let oldestTime = Date.now()
	
	for(let board of allBoards){
		const file = `rawData/${board}.json`
		if(!fs.existsSync(file)){
			oldestBoard = board
			break
		}
		const boardDB = db.getBoardDB(board)
		const snapTime = boardDB.get("snapTime").value() || 0
		
		if(snapTime < oldestTime){
			oldestBoard = board
			oldestTime = snapTime
		}
	}
	const oldestIndex = allBoards.indexOf(oldestBoard)
	pino.info(`Oldest board is ${oldestBoard}. Age ${((Date.now() - oldestTime) / (1000 * 60 * 60)).toFixed(2)} hours. Starting from index ${oldestIndex}`)
	getCatalog(oldestIndex)
}

main()