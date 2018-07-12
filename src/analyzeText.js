const config = require("./config")
//const low = require('lowdb')
//const FileSync = require('lowdb/adapters/FileSync')
//const Sentiment = require("sentiment")
//const sentiment = new Sentiment()
//const fs = require("fs")

//const {textAnalysisResultDB} = require("./db")


const analyzeSingle = async (board,word) => {
	const _ = require("lodash")
	const allComments = commentCache[board] || []
	console.time("analyze")

	const wordLength = word.length
	const re = new RegExp(_.escapeRegExp(word),"gmi")

	const textAnalysis = {
		word,
		commentsAnalyzed : 0,
		totalCharacters: 0,
		matches: 0,
		postsWithWord: 0,
		text_ratio: 0,
		posts_ratio: 0
	}

	for(let comment of allComments){
		textAnalysis.commentsAnalyzed++
		textAnalysis.totalCharacters += comment.length
		const match = comment.match(re)
		if(match){
			textAnalysis.matches += match.length
			textAnalysis.postsWithWord++
		}
	}
	textAnalysis.text_ratio = textAnalysis.matches * wordLength / textAnalysis.totalCharacters
	textAnalysis.posts_ratio = textAnalysis.postsWithWord / textAnalysis.commentsAnalyzed
	console.timeEnd("analyze")
	//console.log(textAnalysis)
	return textAnalysis
}

const analyzeAll = async word => {
	console.time("analyzeAll")
	const boards = require("./config").boards
	
	const results = {}
	
	for(let board of boards){
		results[board] = await analyzeSingle(board,word)
	}

	console.timeEnd("analyzeAll")
	return results
}

module.exports = {
	createCache,
	analyzeSingle,
	analyzeAll
}