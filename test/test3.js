const analyze = require("./analyze")
//const analyzeText = require("./src/analyzeText")
const regenerate = require("./regenerate")

const {invertedPostIndex} = require("./src/db")

console.log("NODE_ENV is:", process.env.NODE_ENV)
/*
const gc = require('gc-stats')()
gc.on('stats', function (stats) {
	console.log('GC happened')
	console.log({
		pause: stats.pause / 1000000 + " ms",
		gctype: stats.gctype,
		diffHeap: stats.diff.totalHeapSize / 1000000 + " MB",
		usedHeapSize: stats.diff.usedHeapSize / 1000000 + " MB",
		totalAvailableSize: stats.diff.totalAvailableSize / 1000000 + " MB",
	})
})
*/

const board = "qst"

const main = async () => {

	console.log("test")
	
	//await analyze(board,null,false)
	//await analyze(board,null,false)
	//await analyze(board,null,false)
	//await analyze(board,null,false)

	await regenerate(false) 
	
	let n = 0
	let one = 0
	let many = 0
	let allTokens = []
	let tokenStrLen = 0
	let tokenStrLenObj = {}

	console.log("invertedPostIndex",invertedPostIndex.size)

	for(let tokenAndBoards of invertedPostIndex){
		//console.log(n++,tokenAndBoards[0])
		tokenStrLen += tokenAndBoards[0].length
		tokenStrLenObj[String(tokenAndBoards[0].length)] = (tokenStrLenObj[String(tokenAndBoards[0].length)] || 0) + 1
		let tokenSum = 0
		for(let boardAndCount of tokenAndBoards[1]){
			tokenSum += boardAndCount[1]
			//console.log(boardAndCount[1])
		} 
		//if(tokenSum == 0) console.log("NONONONONONO")
		tokenSum == 1 ? one++ : many++
		//if(tokenAndBoards[0].includes(".")) allTokens.push([tokenAndBoards[0],tokenSum])
		allTokens.push([tokenAndBoards[0],tokenSum])
		//console.log(n++,tokenAndBoards[0],tokenSum)
	}
	console.log("tokenStrLen",tokenStrLen)
	console.log("one",one)
	console.log("many",many)
	console.log(tokenStrLenObj)

	
	allTokens.sort((a,b) => b[1] - a[1])
	for(let i = 0; i < Math.min(100,allTokens.length); i++){
		console.log(i+1,allTokens[i][0],allTokens[i][1])
	}
	
	allTokens.sort((a,b) => b[0].length - a[0].length)
	for(let i = 0; i < Math.min(100,allTokens.length); i++){
		console.log(i+1,allTokens[i][0],allTokens[i][1],allTokens[i][0].length)
	}
	
	
	
	//console.log(allTokens.slice(0,100))
	
	//console.log(await analyzeText.analyzeTokens("boomer"))
	//const resFull = await analyzeText.analyzeAll("boomer")
	
	//console.log(resFull.analysis.a)
}

main()