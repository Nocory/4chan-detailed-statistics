const config = require("./config")
const _ = require("lodash")
const {visibleCache,textAnalysisResultCache} = require("./db")

const analyzeSingle = (board,word) => {
	//console.log("Text analyzeSingle",board)
	const wordLength = word.length
	const re = new RegExp(_.escapeRegExp(word),"g")

	const textAnalysis = {
		commentsAnalyzed : 0,
		charactersAnalyzed: 0,
		matches: 0,
		postsWithWord: 0,
		text_ratio: 0,
		posts_ratio: 0
	}
	
	visibleCache[board].forEach(val => {
		const com = val[1]
		textAnalysis.commentsAnalyzed++
		textAnalysis.charactersAnalyzed += com.length
		const match = com.match(re)
		if(match){
			//if(board == "trv") console.log(com)
			textAnalysis.matches += match.length
			textAnalysis.postsWithWord++
		}
	})

	textAnalysis.text_ratio = textAnalysis.matches * wordLength / textAnalysis.charactersAnalyzed
	textAnalysis.posts_ratio = textAnalysis.postsWithWord / textAnalysis.commentsAnalyzed
	//console.timeEnd("analyzeSingle")
	//console.log(textAnalysis)
	return textAnalysis
}

const analyzeAll = async word => {
	console.time("analyzeText_all")

	/*
	const cachedResult = textAnalysisResultCache.get(word)
	if(false){ //TODO:
		console.timeEnd("analyzeText_all")
		return cachedResult
	}
	*/
	//await new Promise(resolve => setImmediate(resolve))

	const boards = config.boards
	const allResults = textAnalysisResultCache.get(word) || {}
	//const promises = []
	for(let board of boards){
		if(!allResults[board]){
			await new Promise(resolve => setTimeout(resolve,2))
			allResults[board] = analyzeSingle(board,word)
		}
		//promises.push(analyzeSingle(board,word).then(result => allResults[board] = result))
	}
	//await Promise.all(promises)

	const commentsAnalyzed = Object.values(allResults).reduce((acc,val) => acc + val.commentsAnalyzed,0)
	const charactersAnalyzed = Object.values(allResults).reduce((acc,val) => acc + val.charactersAnalyzed,0)
	console.log("commentsAnalyzed",commentsAnalyzed)
	console.log("charactersAnalyzed",charactersAnalyzed)

	const finalResult = {
		word,
		commentsAnalyzed,
		charactersAnalyzed,
		analysis: allResults
	}

	textAnalysisResultCache.set(word,allResults)

	console.timeEnd("analyzeText_all")
	return finalResult
}

module.exports = {
	analyzeSingle,
	analyzeAll
}