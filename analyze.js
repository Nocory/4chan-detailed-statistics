const fs = require('fs')
if (!fs.existsSync("rawData")) fs.mkdirSync("rawData")
if (!fs.existsSync("finalResults")) fs.mkdirSync("finalResults")

const extractData = require("./src/extractData.js")
const analyzeMeta = require("./src/analyzeMeta.js")
const analyzeText = require("./src/analyzeText")
const calcMetaAverage = require("./src/calcMetaAverage")
const createCSV = require("./src/createCSV")
const cleanDB = require("./src/cleanDB")

const {io} = require("./src/server")

const OPTIONS = {
	"--board": null
}

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const finalResultsDB = low(new FileSync(`finalResults/db.json`))

const main = async (board = OPTIONS["--board"],rawThreadData = null,snapTime = null,duration = 1) => {
	console.log("⏳   Starting rawThreadData analysis")
	if(!rawThreadData){
		const rawData = low(new FileSync(`rawData/${board}.json`)).value()
		rawThreadData = rawData.threads
		snapTime = rawData.snapTime
		duration = rawData.duration
	}
	
	try{
		const extractedData = await extractData(board,rawThreadData,snapTime,duration)
		const textAnalysisLastDay = await analyzeText(board,snapTime,extractedData.oldButVisibleComments)
		const metaAnalysisLastSnapshot = await analyzeMeta(board,extractedData.metaData,snapTime,duration)
	
		//const textAnalysisAverage = generateAverage(board,"text",latestTextAnalysis,time)
		const metaAnalysisLastDayAverage = await calcMetaAverage(board,snapTime)
		
		textAnalysisLastDay.created = snapTime
		metaAnalysisLastSnapshot.created = snapTime
		metaAnalysisLastDayAverage.created = snapTime

		//console.log("textAnalysisLastDay",textAnalysisLastDay)
		//console.log("metaAnalysisLastSnapshot",metaAnalysisLastSnapshot)
		//console.log("metaAnalysisLastWeekAverage",metaAnalysisLastDayAverage)
	
		if(textAnalysisLastDay && metaAnalysisLastSnapshot && metaAnalysisLastDayAverage){
			finalResultsDB.set(board,{
				textAnalysisLastDay,
				metaAnalysisLastSnapshot,
				metaAnalysisLastDayAverage
			}).write()
			io.emit("update",{
				board,
				textAnalysisLastDay,
				metaAnalysisLastSnapshot,
				metaAnalysisLastDayAverage
			})
			createCSV()
			cleanDB(board,true)
		}
	}catch(err){
		console.error(err)
	}
}

if(require.main === module){
	for(let i = 2; i < process.argv.length; i+=2){
		OPTIONS[process.argv[i]] = process.argv[i+1]
	}
	main()
}

module.exports = main