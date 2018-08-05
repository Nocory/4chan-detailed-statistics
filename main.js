require("./src/server")
const db = require("./src/db")
//const analyze = require("./analyze.js")
const pino = require("./src/pino")
const config = require("./src/config")

const extractDataFromThread = require("./src/extractDataFromThread")
//const extractDataFromPost = require("./src/extractDataFromPost")

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
	.array('specific-boards')
	.argv

let allBoards = config.boards
allBoards = allBoards.slice(allBoards.indexOf(argv.from),allBoards.indexOf(argv.to) + 1)
if(argv["specific-boards"]) allBoards = allBoards.filter(x => argv["specific-boards"].includes(x))
pino.debug("=======================")
pino.debug(`Checking ${allBoards.length} boards`,allBoards)
pino.debug("=======================")
if (!allBoards.length){
	pino.fatal("No boards selected")
	return
}
////////////////
// setup done //
////////////////

const sleep = (ms = Math.max(argv.delay - (Date.now() - lastRequest),0)) => {
	return new Promise(resolve => {
		setTimeout(resolve,ms)
	})
}

const boardWeight = {}
const determineNextBoard = () => {
	for(let board in boardWeight){
		boardWeight[board] += config.customWeight[board] || 1
	}
	const winnerBoard = Object.entries(boardWeight).reduce((acc,val) => acc = val[1] > acc[1] ? val : acc,[argv.from, 0]) // returns [board,value]
	boardWeight[winnerBoard[0]] = 0
	pino.debug(`Next board /${winnerBoard[0]}/, weight: ${winnerBoard[1]}`)
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
	catalog = catalog.slice(0,argv.pages)
	
	const visibleThreads = []
	const visiblePosts = []
	
	let threadCount = [0,0,catalog.reduce((acc,val) => acc + val.threads.length,0)] //FIXME: [success,fail,total]
	for(let page of catalog.reverse()){//start from the end of the catalog, otherwise threads might be pushed off in the meantime
		for(let catalogThread of page.threads.reverse()){ // same thing, start from the back
			
			//check if thread in the DB is still fresh
			const existingThread = await db.threadsDB.get([board,catalogThread.no]).catch(err => null)

			

			//console.log("existingThread",existingThread)

			if(existingThread && existingThread["__lastModified"] == catalogThread.last_modified){
				threadCount[0]++
				visibleThreads.push(existingThread.no)
				visiblePosts.push(...existingThread["__postNums"])
				pino.debug(`/${board}/ #${catalogThread.no} is unchanged.`)
				continue
			}

			const threadContent = await getThread(board,catalogThread.no)
			if(threadContent){
				threadCount[0]++
				const OP = extractDataFromThread(board,threadContent,existingThread)
				OP["__lastModified"] = catalogThread.last_modified
				db.threadsDB.put([board,OP.no],OP).catch(console.error)
				visibleThreads.push(OP.no)
				visiblePosts.push(...OP["__postNums"])
			}else{
				threadCount[1]++
				pino.error(`/${board}/ #${catalogThread.no} failed to load.`)
			}

			pino.debug(`/${board}/ (${threadCount[0]}/${threadCount[1]}/${threadCount[2]}) | ${getKBs()}`)
		}
	}
	pino.info(`/${board}/ done. Batching ${visibleThreads.length} visible threadNums and ${visiblePosts.length} visible postsNums`)
	db.metaDB.batch()
		.put('visibleThreads', visibleThreads)
		.put('visiblePosts', visiblePosts)
}

const getCatalog = async board => {
	cycleStartTime = Date.now()
	bytesLoaded = 0
	try{
		await sleep()
		lastRequest = Date.now()
		const res = await axios.get(`https://a.4cdn.org/${board}/catalog.json`)
		
		pino.debug(`/${board}/ catalog loaded | ${getKBs()}`)

		await handleCatalog(board,res.data).catch(pino.error)
		db.metaDB.put("boardWeight",boardWeight).catch(pino.error) // catalog has been processed, update boardWeight in metaDB afterwards
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
	
	/*
	if(argv.regenerate){
		pino.info("⏳   Starting regeneration")
		await require("./regenerate")(false)
	}
	*/
	
	const DBBoardWeight = await db.metaDB.get("boardWeight").catch(() => ({})) // return empty object if key not found
	for(let board of allBoards){
		boardWeight[board] = DBBoardWeight[board] || 0
	}
	
	getCatalog(determineNextBoard())
}



main()