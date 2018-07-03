let bytesLoaded = 0

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

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const OPTIONS = {
	"--from": "!",
	"--to": "~",
	"--pages": 999,
	"--delay": 1100
}
for(let i = 2; i < process.argv.length; i+=2){
	OPTIONS[process.argv[i]] = process.argv[i+1]
}
OPTIONS["--pages"] = parseInt(OPTIONS["--pages"])

console.log(OPTIONS)

var fs = require('fs')
if (!fs.existsSync("db_get")){
	fs.mkdirSync("db_get")
}
////////////////
// setup done //
////////////////

const sleep = async ms => {
	await new Promise(resolve => {
		setTimeout(resolve,ms)
	})
}

const getCatalog = async board => {
	try{
		const res = await axios.get(`https://a.4cdn.org/${board}/catalog.json`)
		bytesLoaded += parseInt(res.headers["content-length"] || 0)
		return res.data
	} catch(err){
		console.log(err)
		await sleep(5000)
		return getCatalog(board)
	}
}

const getThread = async (board,threadNum,attempt = 1) => {
	try{
		const res = await axios.get(`https://a.4cdn.org/${board}/thread/${threadNum}.json`)
		bytesLoaded += parseInt(res.headers["content-length"] || 0)
		if(attempt > 1) console.log(`Loaded /${board}/ #${threadNum} after ${attempt} attempts`)
		return res.data
	} catch(err){
		console.log("ERROR:",err.message)
		await sleep(OPTIONS["--delay"])
		if(attempt >= 2){
			console.log(`Unable to load /${board}/ #${threadNum} after ${attempt} attempts`)
			return null
		}
		return getThread(board,threadNum,++attempt)
	}
}

const main = async () => {
	console.log("Fetching list of boards ...")
	//const allBoards = (await axios.get("https://a.4cdn.org/boards.json")).data.boards.map(val => val.board)
	const allBoards = require("./config.js").boards
	console.log("DONE")
	await sleep(OPTIONS["--delay"])

	for(let board of allBoards){
		if(board < OPTIONS["--from"]) continue
		if(board > OPTIONS["--to"]) break

		const boardDB = low(new FileSync(`db_get/${board}.json`))

		console.log(`Fetching /${board}/ catalog ...`)
		const catalog = (await getCatalog(board)).slice(0,OPTIONS["--pages"])
		console.log(`loaded /${board}/ catalog | ${Math.round(bytesLoaded / 1000)}kB loaded in total`)
		await sleep(OPTIONS["--delay"])
		
		const newThreads = {}
		let threadCount = [0,catalog[0].threads.length * catalog.length]
		for(let page of catalog.reverse()){//start from the end of the catalog, otherwise threads might be pushed off in the meantime
			for(let catalogThread of page.threads.reverse()){ // same thing, start from the back
				threadCount[0]++

				//check if thread in the DB is still fresh
				const existingThread = boardDB.get(String(catalogThread.no),null).value() 
				if(existingThread && existingThread.posts[existingThread.posts.length - 1].time == catalogThread.last_modified){
					newThreads[String(catalogThread.no)] = existingThread
					const now = new Date()
					console.log(`${now.toLocaleTimeString("de-DE")}.${now.getMilliseconds()} | board /${board}/ thread #${catalogThread.no} was still fresh`)
					continue
				}
				
				// fetch the thread 
				const threadContent = await getThread(board,catalogThread.no)
				if(threadContent){
					newThreads[String(catalogThread.no)] = threadContent
					const now = new Date()
					console.log(`${now.toLocaleTimeString([],{"hour12": false})}.${now.getMilliseconds()} | board /${board}/ thread ${threadCount[0]}/${threadCount[1]} | ${Math.round(bytesLoaded / 1000)}kB so far`)
				}
				await sleep(OPTIONS["--delay"])
			}
		}
		boardDB.setState(newThreads).write()
		console.log(`/${board}/ threads saved to disk`)
	}
}

main()