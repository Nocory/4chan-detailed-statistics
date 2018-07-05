let cycleStartTime = Date.now()
let bytesLoaded = 0
let lastRequest = Date.now()
let lastResponse = Date.now()

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
		//return status === 200 || status === 304
		return status === 200
	}
})

axios.interceptors.request.use(function (config) {
	//pino.debug("sending request")
	return config
}, function (error) {
	return Promise.reject(error)
})

axios.interceptors.response.use(function(res) {
	//pino.debug("received request")
	bytesLoaded += parseInt(res.headers["content-length"] || 0)
	return res
}, function(error) {
	return Promise.reject(error)
})

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

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

var fs = require('fs')
if (!fs.existsSync("rawData")) fs.mkdirSync("rawData")

const pino = require("./src/pino")
////////////////
// setup done //
////////////////

const sleep = async ms => {
	if(!ms){
		//ms = Math.max(OPTIONS["--delay"] - (Date.now() - lastResponse),0)
		ms = Math.max(OPTIONS["--delay"] - (Date.now() - lastRequest),0)
	}
	//pino.debug("sleeping",ms)
	await new Promise(resolve => {
		setTimeout(resolve,ms)
	})
}

const getThread = async (board,threadNum,attempt = 1) => {
	try{
		await sleep()
		lastRequest = Date.now()
		const res = await axios.get(`https://a.4cdn.org/${board}/thread/${threadNum}.json`)
		lastResponse = Date.now()
		
		if(attempt > 1) pino.debug(`/${board}/ #${threadNum} loaded after ${attempt} attempts`)
		return res.data
	} catch(err){
		lastResponse = Date.now()
		pino.warn(err.message,`/${board}/ #${threadNum} failed at attempt ${attempt}`)
		await sleep(OPTIONS["--delay"])
		if(attempt >= 2) return null
		return getThread(board,threadNum,attempt + 1)
	}
}

const handleCatalog = async (board,catalog) => {
	/* eslint-disable no-await-in-loop */
	const boardDB = low(new FileSync(`rawData/${board}.json`))
	catalog = catalog.slice(0,OPTIONS["--pages"])
		
	const newThreads = {}
	let threadCount = [0,catalog[0].threads.length * catalog.length]
	let threadFails = 0
	for(let page of catalog.reverse()){//start from the end of the catalog, otherwise threads might be pushed off in the meantime
		for(let catalogThread of page.threads.reverse()){ // same thing, start from the back
			threadCount[0]++

			//check if thread in the DB is still fresh
			const existingThread = boardDB.get(String(catalogThread.no),null).value() 
			if(existingThread && existingThread.posts[existingThread.posts.length - 1].time == catalogThread.last_modified){
				newThreads[String(catalogThread.no)] = existingThread
				pino.debug(`/${board}/ #${catalogThread.no} was still fresh`)
				continue
			}
			
			// fetch the thread 
			const threadContent = await getThread(board,catalogThread.no)
			if(threadContent){
				newThreads[String(catalogThread.no)] = threadContent
				pino.debug(`/${board}/ (${threadCount[0]}/${threadCount[1]}) | ${getKBs()}`)
			}else{
				threadFails++
				pino.error(`/${board}/ #${catalogThread.no} failed to load. ${threadFails} failed requests so far.`)
			}
		}
	}
	if(threadFails < threadCount[1] * 0.25){
		boardDB.setState(newThreads).write()
		pino.debug(`/${board}/ threads saved to disk`)
	}else{
		pino.error(`/${board}/ had too many failed requests ${threadFails}/${threadCount[1]}. Not writing threads to disk !!!`)
	}
}

const analyze = require("./analyze.js")
const getCatalog = async index => {
	
	if(index >= allBoards.length){
		cycleStartTime = Date.now()
		await analyze()
		index = 0
	}
	const board = allBoards[index]
	try{
		await sleep()
		lastRequest = Date.now()
		const res = await axios.get(`https://a.4cdn.org/${board}/catalog.json`)
		lastResponse = Date.now()
		
		pino.debug(`/${board}/ catalog loaded | ${getKBs()}`)

		await handleCatalog(board,res.data)
		getCatalog(index + 1)
	} catch(err){
		lastResponse = Date.now()
		pino.error(err.message,"Retrying in 5 seconds . . .")
		await sleep(5000)
		getCatalog(index)
	}
}

let allBoards = require("./src/config.js").boards
allBoards = allBoards.slice(allBoards.indexOf(OPTIONS["--from"]),allBoards.indexOf(OPTIONS["--to"]) + 1)
if (!allBoards.length){
	pino.fatal("invalid boards selected")
	return
}

// find the oldest board index and begin with that


let oldestBoard = allBoards[0]
let oldestTime = new Date()

for(let board of allBoards){
	const file = `rawData/${board}.json`
	if(!fs.existsSync(file)){
		oldestBoard = board
		break
	}
	const stats = fs.statSync(file)
	//console.log(stats)
	if(stats.mtime < oldestTime){
		oldestBoard = board
		oldestTime = stats.mtime
	}
}
const oldestIndex = allBoards.indexOf(oldestBoard)
pino.info(`Oldest board is ${oldestBoard}. Starting from index ${oldestIndex}`)
getCatalog(oldestIndex)