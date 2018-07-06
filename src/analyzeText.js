const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const Sentiment = require("sentiment")
const sentiment = new Sentiment()
const ss = require("simple-statistics")
const fs = require("fs")



const wordsToCheck = [
	"boomer",
	"nigger",
	"jew",
	"trump",
	"cuck",
	"meme",
	"sjw"
]

const main = async (board = "") => {
	if(!fs.existsSync(__dirname + `/../analysis/${board}_comments.json`)) return
	const commentDataDB = low(new FileSync(__dirname + `/../analysis/${board}_comments.json`))
	const textAnalysisDB = low(new FileSync(__dirname + '/../analysis/textAnalysisResult.json'))
	const commentData = commentDataDB.getState()

	const textAnalysis = {
		sentiment : [],
		wordOccurence : {},
		postsWithWord : {},
		totalPosts : 0,
		totalCommentLength : 0
	}

	for(let word of wordsToCheck){
		textAnalysis.wordOccurence[word] = 0
		textAnalysis.postsWithWord[word] = 0
	}

	for(let thread in commentData){
		for(let comment of commentData[thread]){
			textAnalysis.totalPosts++
			textAnalysis.totalCommentLength += comment.length
			
			textAnalysis.sentiment.push(sentiment.analyze(comment).score)
			for(let word of wordsToCheck){
				const re = new RegExp(word,"gmi")
				const match = comment.match(re)
				if(match){
					textAnalysis.wordOccurence[word] += match.length
					textAnalysis.postsWithWord[word]++
				}
			}
		}
	}
  
	const textAnalysisResult = {
		sentiment: 0,
		wordText_ratio: {},
		postsWithWord_ratio: {},
	}

	textAnalysisResult.sentiment = ss.mean(textAnalysis.sentiment)
	for(let word of wordsToCheck){
		textAnalysisResult.wordText_ratio[word] = textAnalysis.wordOccurence[word] * word.length / textAnalysis.totalCommentLength
		textAnalysisResult.postsWithWord_ratio[word] = textAnalysis.postsWithWord[word] / textAnalysis.totalPosts
	}

	textAnalysisDB.set(board,textAnalysisResult).write()
	console.log(`✅   /${board}/ text analysis done`)
	
	/*
	const sentimentResultArr = Object.entries(sentimentResult).sort((x,y) => y[1] - x[1])
	for(let data of sentimentResultArr){
		console.log(data)
	}
	*/

	const allTextResults = textAnalysisDB.getState()
	const stringify = require('csv-stringify/lib/sync')
	console.log("⏳   Creating csv file from text analysis result")
	const csvArr = []
	csvArr.push(['Name','sentiment',...wordsToCheck.map(x => x+"Text_ratio"),...wordsToCheck.map(x => x+"InPost_ratio")])
	for(board of Object.keys(allTextResults).sort()){
		csvArr.push([board,allTextResults[board].sentiment,...Object.values(allTextResults[board].wordText_ratio),...Object.values(allTextResults[board].postsWithWord_ratio)])
	}
	fs.writeFileSync(__dirname + "/../analysis/textAnalysisResult.csv",stringify(csvArr))
	console.log("✅   Created csv file successfully")

	/*
	const boomerArr = []
	for(let board in textAnalysisResult){
		boomerArr.push([board,textAnalysisResult[board].postsWithWord_ratio.boomer])
	}
	boomerArr.sort((x,y) => y[1] - x[1])
	for(let data of boomerArr){
		console.log(`/${data[0]}/ ${(data[1]*100).toFixed(4)}%`)
	}
	*/

	return allTextResults
}

module.exports = main