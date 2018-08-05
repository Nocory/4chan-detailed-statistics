const config = require("./src/config")
const analyze = require("./analyze")

const {commentsDB,lowFinalResultsDB,visibleCache,reducedTokenMap,postIndex,invertedPostIndex} = require("./src/db")
const {processPost,tokenize} = require("./src/extractData_exp")

const argv = require('yargs')
	.default('write', true)
	.argv

const refillPostIndex = async board => {
	return new Promise((resolve,reject)=>{
		console.time("refillPostIndex " + board)
		const to = lowFinalResultsDB.value()[board].metaAnalysis.created / 1000
		const from = to - config.commentsAnalyzeSeconds
		
		const stream = commentsDB.createReadStream({
			gt: [board,from,0],
			lte: [board,to,"~"],
			fillCache: true
		})
			.on('data', data => {
				const tokens = tokenize(data.value)
				const cacheData = {
					time: data.key[1],
					//tokens,
					length: data.value.length
				}
				const indexedTokens = []
				for(let token of tokens){
					if(config.stopWords.has(token) || token.length > 50) continue
					
					
					//(invertedPostIndex.get(token) || invertedPostIndex.set(token,new Set()).get(token)).add(cacheData)
					const tokenBoardsMap = invertedPostIndex.get(token) || invertedPostIndex.set(token,new Map()).get(token)
					tokenBoardsMap.set(board,(tokenBoardsMap.get(board) || 0) + 1)
					indexedTokens.push(tokenBoardsMap)
					//indexedTokens.push(token)
			
				}
				cacheData.tokens = indexedTokens
				/*
				const processResult = processPost(board,{
					time: data.key[1],
					no: data.key[2],
					com: data.value
				})
				*/

				postIndex[board].set(data.key[2],cacheData)
				//console.log(board,postIndex[board].size)
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				console.timeEnd("refillPostIndex " + board)
				resolve()
			})
	})
}

const main = async () => {
	//for(let board of config.boards){
	for(let board of ["a","vg","qst","pol","v"]){
	//for(let board of ["a"]){
		console.log("======================================")
		await refillPostIndex(board)
		//await analyze(board,null,write)
	}
}

if(require.main === module){
	main()
}

module.exports = main