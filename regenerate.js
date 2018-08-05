const config = require("./src/config")
const db = require("./src/db")
const extractDataFromPost = require("./src/extractDataFromPost")

require("./src/server")

const argv = require('yargs')
	.default('write', false)
	.default('reanalyze', false)
	.default('invert', true)
	.argv

const minTime = Date.now() / 1000 - config.maxAnalyzeSeconds

const populateInvertedIndex = board => {
	return new Promise((resolve,reject)=>{
		console.time("populateInvertedIndex " + board)
		db.tokenDB.createReadStream({
			gt: [board,0,0],
			lte: [board,Infinity,Infinity]
		})
			.on('data', data => {
				//const postTime = data.key[1]
				const postNo = data.key[2]
				const tokens = data.value.tokens
	
				for(let token of tokens){
					const tokenBoardsMap = db.invertedPostIndex.get(token) || db.invertedPostIndex.set(token,new Map()).get(token)
					const tokenBoardsPostnumSet = tokenBoardsMap.get(board) || tokenBoardsMap.set(board,new Set()).get(board)
					tokenBoardsPostnumSet.add(postNo)
				}
			})
			.on('error', function (err) {
				console.log("ERROR")
				reject(err)
			})
			.on('close', function () {
				console.timeEnd("populateInvertedIndex " + board)
				resolve()
			})
	})

}

const refillPostIndex = board => {
	return new Promise((resolve,reject)=>{
		console.time("refillPostIndex " + board)

		let n = 0

		let batchOps = []
		
		const stream = db.postsDB.createReadStream({
			gt: [board,0],
			lte: [board,Infinity],
			fillCache: false,
			limit: config.maxAnalyzeLimit,
			reverse: true
		})
			.on('data', data => {
				const statsAndTokens = argv.reanalyze ? extractDataFromPost.getStatsAndTokens(board,data.value) : {}
				
				if(argv.reanalyze && argv.write){
					batchOps.push({
						type: "put",
						key: [data.key[0],data.value.time,data.key[1]],
						value: statsAndTokens
					})
				}
				
				if(batchOps.length >= 1000){
					db.tokenDB.batch(batchOps)
					batchOps = []
				}
				
				for(let token of statsAndTokens.tokens){
					const tokenBoardsMap = db.invertedPostIndex.get(token) || db.invertedPostIndex.set(token,new Map()).get(token)
					const tokenBoardsPostnumSet = tokenBoardsMap.get(board) || tokenBoardsMap.set(board,new Set()).get(board)
					tokenBoardsPostnumSet.add(data.value.no)
				}

				n++
				if(n % 10000 == 0) console.log(board,n,statsAndTokens.tokens)
				if(n >= config.minAnalyzeLimit && data.value.time < minTime) stream.destroy()
				
			})
			.on('error', function (err) {
				console.log("ERROR")
				reject(err)
			})
			.on('close', function () {
				console.timeEnd("refillPostIndex " + board)
				console.log(board,n,"***DESTROYED***")
				db.tokenDB.batch(batchOps)
				batchOps = []
				resolve()
			})
	})
}

const main = async (verbose = true) => {
	for(let board of config.boards){
	//for(let board of ["3","a","vg","qst","pol","v"]){
	//for(let board of ["lit","qa","his"]){
		console.log("======================================")
		if(argv.reanalyze) await refillPostIndex(board)
		if(argv.invert) await populateInvertedIndex(board)
		//await analyze(board,null,write)
	}

	if(!verbose) return
	
	let one = 0
	let many = 0
	let allTokens = []
	let tokenStrLen = 0
	let tokenStrLenObj = {}

	console.log("db.invertedPostIndex",db.invertedPostIndex.size)

	for(let tokenAndBoards of db.invertedPostIndex){
		//console.log(n++,tokenAndBoards[0])
		tokenStrLen += tokenAndBoards[0].length
		tokenStrLenObj[String(tokenAndBoards[0].length)] = (tokenStrLenObj[String(tokenAndBoards[0].length)] || 0) + 1
		let tokenSum = 0
		for(let boardAndPostNums of tokenAndBoards[1]){
			tokenSum += boardAndPostNums[1].size
			//console.log(boardAndCount[1])
		} 
		//if(tokenSum == 0) console.log("NONONONONONO")
		tokenSum == 1 ? one++ : many++
		//if(tokenAndBoards[0].includes(".")) allTokens.push([tokenAndBoards[0],tokenSum])
		allTokens.push([tokenAndBoards[0],tokenSum])
		//console.log(n++,tokenAndBoards[0],tokenSum)
	}
	console.log(tokenStrLenObj)
	
	allTokens.sort((a,b) => b[1] - a[1])
	for(let i = 0; i < Math.min(100,allTokens.length); i++){
		console.log(i+1,allTokens[i][0],allTokens[i][1])
	}
	
	allTokens.sort((a,b) => b[0].length - a[0].length)
	for(let i = 0; i < Math.min(100,allTokens.length); i++){
		console.log(i+1,allTokens[i][0],allTokens[i][1],allTokens[i][0].length)
	}

	for(let index = 0; index < allTokens.length;index += 10000){
		console.log(index,allTokens[index][0],allTokens[index][1])
	}

	console.log("tokenStrLen",tokenStrLen)
	console.log("one",one)
	console.log("many",many)

	const postNumCount = allTokens.reduce((acc,val) => acc + val[1],0)
	console.log("postNumCount",postNumCount)
}

if(require.main === module){
	main()
}

module.exports = main