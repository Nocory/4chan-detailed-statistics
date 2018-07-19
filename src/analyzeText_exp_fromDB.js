const config = require("./config")
const _ = require("lodash")
const {commentsDB,lowFinalResultsDB} = require("./db")

var LRU = require("lru-cache")
const resultCache = LRU({
	max: 25,
	maxAge: 1000 * 60 * 10 
})

const analyzeSingle = async (board,word) => {
	const wordLength = word.length
	const re = new RegExp(_.escapeRegExp(word),"g")

	const textAnalysis = {
		word,
		commentsAnalyzed : 0,
		totalCharacters: 0,
		matches: 0,
		postsWithWord: 0,
		text_ratio: 0,
		posts_ratio: 0
	}

	return new Promise((resolve,reject)=>{
		const to = lowFinalResultsDB.value()[board].metaAnalysis.created
		const from = to - 1000 * 60 * 60 * 24 * 1
		//console.log(from,to)
		commentsDB.createValueStream({
			gt: [board,from / 1000,0],
			lte: [board,to / 1000,"~"],
			fillCache: true,
			//limit: 10000
		})
			.on('data', data => {
				//data = data.value
				textAnalysis.commentsAnalyzed++
				textAnalysis.totalCharacters += data.length
				const match = data.match(re)
				if(match){
					//console.log(data)
					textAnalysis.matches += match.length
					textAnalysis.postsWithWord++
				}
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				textAnalysis.text_ratio = textAnalysis.matches * wordLength / textAnalysis.totalCharacters
				textAnalysis.posts_ratio = textAnalysis.postsWithWord / textAnalysis.commentsAnalyzed
				resolve(textAnalysis)
			})
	})
}

const analyzeAll = async word => {
	console.time("analyzeText_all")

	const cachedResult = resultCache.get(word)
	if(false){
		console.timeEnd("analyzeText_all")
		return cachedResult
	}

	const boards = config.boards
	const allResults = {}
	const promises = []
	for(let board of boards){
		allResults[board] = await analyzeSingle(board,word)
		//promises.push(analyzeSingle(board,word).then(result => allResults[board] = result))
	}
	//await Promise.all(promises)

	const commentsAnalyzed = Object.values(allResults).reduce((acc,val) => acc + val.commentsAnalyzed,0)
	console.log("commentsAnalyzed",commentsAnalyzed)

	resultCache.set(word,allResults)

	console.timeEnd("analyzeText_all")
	return allResults
}

module.exports = {
	analyzeSingle,
	analyzeAll
}