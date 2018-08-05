const {extractFromRaw} = require("./src/extractData_exp.js")
const analyzeMeta = require("./src/analyzeMeta.js")
//const createCSV = require("./src/createCSV")
const cleanDB = require("./src/cleanDB")
const db = require("./src/db")
const {io} = require("./src/server")

const argv = require('yargs')
	.default('board', "a")
	.default('write', true)
	.argv

const main = async (board = argv.board,boardDB,writeToDB = argv.write) => {
	console.log("======================================")
	console.log(`⏳   /${board}/ starting full analysis`)
	try{
		const rawData = boardDB ? boardDB.value() : db.getBoardDB(board).value()
		await extractFromRaw(board,rawData,writeToDB)		
		const metaAnalysis = await analyzeMeta(board,rawData.snapTime)
	
		db.lowFinalResultsDB.set(board,{
			//textAnalysisResult,
			metaAnalysis
		}).write()
		
		if(writeToDB){
			io.emit("update",{
				board,
				//textAnalysisResult,
				metaAnalysis
			})
			//cleanDB(board,rawData.snapTime,false) //(board,dryRun)
			//createCSV()
		}
	}catch(err){
		console.error(err)
	}
}

if(require.main === module){
	console.log(argv)
	main()
}

module.exports = main