const fs = require('fs')
if (!fs.existsSync("rawData")) fs.mkdirSync("rawData")
if (!fs.existsSync("finalResults")) fs.mkdirSync("finalResults")

const extractData = require("./src/extractData.js")
const analyzeMeta = require("./src/analyzeMeta.js")
//const analyzeText = require("./src/analyzeText")
//const calcMetaAverage = require("./src/calcMetaAverage")
const createCSV = require("./src/createCSV")
const cleanDB = require("./src/cleanDB")
const db = require("./src/db")
const {io} = require("./src/server")
const axios = require("axios")

const OPTIONS = {
	"--board": "a"
}

const lowFinalResultsDB = db.lowFinalResultsDB

let chanstatsData = null
let chanstatsDataTime = 0

//const main = async (board = OPTIONS["--board"],rawThreadData = null,snapTime = null,duration = 1) => {
const main = async (board = OPTIONS["--board"],boardDB,writeToDB = true) => {
	console.log(`⏳   /${board}/ starting full analysis`)
	try{
		const rawData = boardDB ? boardDB.value() : db.getBoardDB(board).value()
		const extractedData = await extractData(board,rawData,writeToDB)
		//console.log(extractedData.metaData)
		//await analyzeText.createCache(board,rawData.snapTime,extractedData.oldButVisibleComments)
		//const textAnalysisResult = await analyzeText.analyze(board,".*")
		if(chanstatsDataTime < Date.now() - 1000 * 60 * 5){
			chanstatsData = (await axios.get(`https://api.4stats.io/allBoardStats`)).data
			chanstatsDataTime = Date.now()
		}
		const metaAnalysis = await analyzeMeta(board,rawData.snapTime,chanstatsData[board])
		
		//textAnalysisResult.created = rawData.snapTime
		metaAnalysis.created = rawData.snapTime
	
		lowFinalResultsDB.set(board,{
			//textAnalysisResult,
			metaAnalysis
		}).write()
		io.emit("update",{
			board,
			//textAnalysisResult,
			metaAnalysis
		})
		//createCSV()
		if(writeToDB) cleanDB(board,true) //(board,dryRun)
	}catch(err){
		console.error(err)
	}
}

if(require.main === module){
	for(let i = 2; i < process.argv.length; i+=2){
		OPTIONS[process.argv[i]] = process.argv[i+1]
	}
	console.log(OPTIONS)
	main()
}

module.exports = main