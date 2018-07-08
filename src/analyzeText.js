const config = require("./config")
//const low = require('lowdb')
//const FileSync = require('lowdb/adapters/FileSync')
const Sentiment = require("sentiment")
const sentiment = new Sentiment()
//const fs = require("fs")

//const {textAnalysisResultDB} = require("./db")
const {commentsDB} = require("./db")

const wordsToCheck = [
	"boomer",
	"reddit",
	"nigger",
	"jew",
	"trump",
	"cuck",
	"meme",
	"sjw",
	"kek"
]

const main = async (board,snapTime,oldComments) => {


	const textAnalysis = {
		sentimentScore : 0,
		sentimentComparative : 0,
		text_ratio_ : {},
		posts_ratio_ : {},
		totalComments : 0,
		totalCommentLength : 0
	}

	for(let word of wordsToCheck){
		textAnalysis.text_ratio_[word] = 0
		textAnalysis.posts_ratio_[word] = 0
	}

	const analyzeComment = comment => {
		//console.log(data)
		//const time = data.key[1]
		//const comment = data.value
		textAnalysis.totalComments++
		textAnalysis.totalCommentLength += comment.length
		const sentimentResult = sentiment.analyze(comment)
		textAnalysis.sentimentScore += sentimentResult.score
		textAnalysis.sentimentComparative += sentimentResult.comparative
		for(let word of wordsToCheck){
			const re = new RegExp(word,"gmi")
			const match = comment.match(re)
			if(match){
				textAnalysis.text_ratio_[word] += match.length
				textAnalysis.posts_ratio_[word]++
			}
		}
	}

	for(let comment of oldComments){
		analyzeComment(comment)
	}

	return new Promise((resolve,reject)=>{
		console.time("analyzeText")
		commentsDB.createReadStream({
			gt: [board,snapTime / 1000 - config.commentMaxAgeSeconds,0],
			lte: [board,snapTime,"~"]
		})
			.on('data', function (data) {
				analyzeComment(data.value)
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				const textAnalysisResult = {
					commentsAnalyzed: textAnalysis.totalComments,
					sentimentScore_mean: textAnalysis.sentimentScore / textAnalysis.totalComments,
					sentimentComparative_mean: textAnalysis.sentimentComparative / textAnalysis.totalComments,
					commentLength_mean: textAnalysis.totalCommentLength / textAnalysis.totalComments,
					text_ratio_: {},
					posts_ratio_: {},
				}
				//console.log(textAnalysis)
				for(let word of wordsToCheck){
					textAnalysisResult.text_ratio_[word] = textAnalysis.text_ratio_[word] * word.length / textAnalysis.totalCommentLength
					textAnalysisResult.posts_ratio_[word] = textAnalysis.posts_ratio_[word] / textAnalysis.totalComments
				}
				
				console.timeEnd("analyzeText")
				console.log(`✅   /${board}/ text analysis done. (${textAnalysis.totalComments}/${textAnalysis.totalComments - oldComments.length}/${oldComments.length} comments)`)
				resolve(textAnalysisResult)
			})
	})


  

	
	/*
	const sentimentResultArr = Object.entries(sentimentResult).sort((x,y) => y[1] - x[1])
	for(let data of sentimentResultArr){
		console.log(data)
	}
	*/
	/*
	const allTextResults = textAnalysisDB.value()
	const stringify = require('csv-stringify/lib/sync')
	console.log("⏳   Creating csv file from text analysis result")
	
	const csvLines = []
	const lineToAdd = ["Board","sentimentScore_mean","sentimentComparative_mean"]
	lineToAdd.push(...wordsToCheck.map(word => "text_ratio_" + word))
	lineToAdd.push(...wordsToCheck.map(word => "posts_ratio_" + word))
	csvLines.push(lineToAdd)
	for(let board of Object.keys(allTextResults).sort()){
		const lineToAdd = [board,allTextResults[board].sentimentScore_mean,allTextResults[board].sentimentComparative_mean]
		lineToAdd.push(...wordsToCheck.map(word => allTextResults[board].text_ratio_[word]))
		lineToAdd.push(...wordsToCheck.map(word => allTextResults[board].posts_ratio_[word]))
		csvLines.push(lineToAdd)
	}
	
	//console.log(csvLines)
	fs.writeFileSync(__dirname + "/../analysisResult/text.csv",stringify(csvLines))
	console.log("✅   Created csv file successfully")
	*/

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

	//return textAnalysisResult
}

module.exports = main