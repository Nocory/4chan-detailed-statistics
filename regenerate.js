const config = require("./src/config")

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const finalResultsDB = low(new FileSync("./finalResults/db.json"))

const extractData = require("./src/extractData.js")
const analyzeMeta = require("./src/analyzeMeta.js")
const analyzeText = require("./src/analyzeText")
const calcMetaAverage = require("./src/calcMetaAverage")
const createCSV = require("./src/createCSV")

const axios = require("axios")

const main = async () => {
	try{
		const chanstatsData = (await axios.get("https://api.4stats.io/allBoardStats")).data
		console.log("✅   Received 4stats board data")
		for(let board of config.boards){
			/* eslint-disable no-await-in-loop */
			const rawData = low(new FileSync(`rawData/${board}.json`)).value()
			rawThreadData = rawData.threads
			snapTime = rawData.snapTime
			duration = rawData.duration
	
			const extractedData = await extractData(board,rawThreadData,snapTime,duration,false)
	
			const textAnalysisLastDay = await analyzeText(board,snapTime,extractedData.oldButVisibleComments)
			const metaAnalysisLastSnapshot = await analyzeMeta(board,extractedData.metaData,snapTime,duration,chanstatsData[board])
			const metaAnalysisLastDayAverage = await calcMetaAverage(board,snapTime)
	
			textAnalysisLastDay.created = snapTime
			metaAnalysisLastSnapshot.created = snapTime
			metaAnalysisLastDayAverage.created = snapTime
		
			if(textAnalysisLastDay && metaAnalysisLastSnapshot && metaAnalysisLastDayAverage){
				finalResultsDB.set(board,{
					textAnalysisLastDay,
					metaAnalysisLastSnapshot,
					metaAnalysisLastDayAverage
				}).write()
			}
			console.log("---------------")
		}
		createCSV()
	}catch(err){
		console.error(err)
	}
}

if(require.main === module){
	main()
}

module.exports = main