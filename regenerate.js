const config = require("./src/config")
const analyze = require("./analyze")

const {commentsDB,lowFinalResultsDB,visibleCache} = require("./src/db")

const argv = require('yargs')
	.default('write', true)
	.argv

const refillVisibleCache = async board => {
	console.time("refillVisibleCache")
	return new Promise((resolve,reject)=>{
		const to = lowFinalResultsDB.value()[board].metaAnalysis.created / 1000
		const from = to - config.commentsAnalyzeSeconds
		//console.log(from,to)
		commentsDB.createReadStream({
			gt: [board,from,0],
			lte: [board,to,"~"],
			fillCache: true,
			//limit: 10000
		})
			.on('data', data => {
				visibleCache[board].set(data.key[2],[data.key[1],data.value])
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				console.timeEnd("refillVisibleCache")
				resolve()
			})
	})
}

const main = async () => {
	for(let board of config.boards){
		console.log("======================================")
		await refillVisibleCache(board)
		await analyze(board,null,argv.write)
	}
	/*
	const commentCache = require("./src/commentCache").commentCache
	let commentCount = 0
	let commentLength = 0
	for(let board in commentCache){
		for(let comment of commentCache[board]){
			commentCount++
			commentLength += comment.length
		}
	}
	console.log("TOTAL COMMENT COUNT AND LENGTH",commentCount,commentLength)
	*/
	/*
	const analyzeText_exp = require("./src/analyzeText_exp")

	console.time("analyzeText_exp_boomer")
	let result_boomer = await analyzeText_exp.analyzeAll("boomer")
	console.timeEnd("analyzeText_exp_boomer")

	console.time("analyzeText_exp_kek")
	await analyzeText_exp.analyzeAll("kek")
	console.timeEnd("analyzeText_exp_kek")

	console.time("analyzeText_exp_game")
	await analyzeText_exp.analyzeAll("game")
	console.timeEnd("analyzeText_exp_game")

	console.log("textAnalysisResult boomer",result_boomer)
	*/
}

if(require.main === module){
	main()
}

module.exports = main