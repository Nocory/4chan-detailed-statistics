const config = require("./config")
const _ = require("lodash")
const {visibleCache,textAnalysisResultCache,invertedPostIndex} = require("./db")

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

const findMentions = async word => {
	console.time("findMentions")
	const boards = config.boards

	const mentions = []
	
	for(let board of boards){
		await new Promise(resolve => setTimeout(resolve,2))
		visibleCache[board].forEach((val,key) => {
			if(val[1].includes(word) && mentions.length < 1000){
				mentions.push([new Date(val[0] * 1000),board,key,val[1]])
			}
		})
		if(mentions.length >= 1000) break
	}
	console.timeEnd("findMentions")
	return mentions.sort((a,b) => b[0] - a[0])
}

const analyzeTokens = async word => {
	console.time("analyzeTokens")

	const result = {}
	for(let board of config.boards){
		result[board] = new Set()
	}

	let matchedTokens = 0

	for(let token of invertedPostIndex){
		if(token[0].includes(word)){
			matchedTokens++
			//console.log("matched token:",token[0])
			for(let board of token[1]){
				//console.log(token[0],board[1])
				for(let post of board[1]){
					//console.log(result[board[0]])
					//console.log(board[0])
					result[board[0]].add(post)
				}
			}
		}
	}

	for(let board in result){
		result[board] = result[board].size
	}

	console.timeEnd("analyzeTokens")
	console.log("searched through",invertedPostIndex.size,"tokens")
	console.log("of those tokens",matchedTokens,"matched")
	return result
}

module.exports = {
	analyzeSingle,
	analyzeAll,
	findMentions,
	analyzeTokens
}