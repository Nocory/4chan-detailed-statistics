const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const Sentiment = require("sentiment")
const sentiment = new Sentiment()
const ss = require("simple-statistics")

const textAnalysis = {}

const wordsToCheck = [
	"boomer",
	"fuck",
	"nigger",
	"jew"
]

const main = async () => {
	const commentDataDB = low(new FileSync(__dirname + '/../analysis/comments.json'))
	const textAnalysisDB = low(new FileSync(__dirname + '/../analysis/textAnalysis.json'))
	const commentData = commentDataDB.getState()

	for(let board in commentData){
		textAnalysis[board] = {}
		textAnalysis[board].sentiment = []
		textAnalysis[board].wordOccurence = {}
		textAnalysis[board].postsWithWord = {}
		textAnalysis[board].totalPosts = 0
		textAnalysis[board].totalCommentLength = 0
		
		for(let word of wordsToCheck){
			textAnalysis[board].wordOccurence[word] = 0
			textAnalysis[board].postsWithWord[word] = 0
		}
		for(let thread in commentData[board]){
			//console.log(thread)
			for(let comment of commentData[board][thread]){
				textAnalysis[board].totalPosts++
				textAnalysis[board].totalCommentLength += comment.length

				//console.log(comment)
				textAnalysis[board].sentiment.push(sentiment.analyze(comment).score)
				for(let word of wordsToCheck){
					const re = new RegExp(word,"gmi")
					const match = comment.match(re)
					if(match){
						textAnalysis[board].wordOccurence[word] += match.length
						textAnalysis[board].postsWithWord[word]++
					}
				}
			}
		}
		console.log(`/${board}/ text analysis done`)
	}
  
	const textAnalysisResult = {}
	for(let board in textAnalysis){
		textAnalysisResult[board] = {
			sentiment: 0,
			wordText_ratio: {},
			postsWithWord_ratio: {},
		}
		//console.log(sentimentAnalysis[board])
		textAnalysisResult[board].sentiment = ss.mean(textAnalysis[board].sentiment)
		for(let word of wordsToCheck){
			textAnalysisResult[board].wordText_ratio[word] = textAnalysis[board].wordOccurence[word] * word.length / textAnalysis[board].totalCommentLength
			textAnalysisResult[board].postsWithWord_ratio[word] = textAnalysis[board].postsWithWord[word] / textAnalysis[board].totalPosts
		}
	}
	/*
	const sentimentResultArr = Object.entries(sentimentResult).sort((x,y) => y[1] - x[1])
	for(let data of sentimentResultArr){
		console.log(data)
	}
	*/

	textAnalysisDB.setState(textAnalysisResult)
	textAnalysisDB.write()

	const fs = require("fs")
	const stringify = require('csv-stringify/lib/sync')
	console.log("Creating csv file from analysis result . . .")
	const csvArr = []
	csvArr.push(['Name','sentiment',...wordsToCheck.map(x => x+"Text_ratio"),...wordsToCheck.map(x => x+"InPost_ratio")])
	for(board in textAnalysisResult){
		csvArr.push([board,textAnalysisResult[board].sentiment,...Object.values(textAnalysisResult[board].wordText_ratio),...Object.values(textAnalysisResult[board].postsWithWord_ratio)])
	}
	fs.writeFileSync(__dirname + "/../analysis/textAnalysis.csv",stringify(csvArr))
	console.log("Finished creating csv file.")

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
}

module.exports = main