const fs = require('fs')
if (!fs.existsSync("analysis")) fs.mkdirSync("analysis")
if (!fs.existsSync("rawData")) fs.mkdirSync("rawData")

const extractData = require("./src/extractData.js")
const analyzeMeta = require("./src/analyzeMeta.js")
const analyzeText = require("./src/analyzeText")

const {io} = require("./src/server")

const OPTIONS = {
	"--task": null,
	"--board": null
}

const main = async (board = OPTIONS["--board"],task = OPTIONS["--task"]) => {
	if(task == "all") task = ""
	if(board == "all"){
		const allBoards = require("./src/config").boards
		for(board of allBoards){
			if(!task || task == "extractData") await extractData(board)
			if(!task || task == "analyzeText") await analyzeText(board)
			if(!task || task == "analyzeMeta") await analyzeMeta(board)
		}
	}else{
		let snapshotMetaAnalysis = null
		let snapshotTextAnalysis = null
		if(!task || task == "extractData") await extractData(board)
		if(!task || task == "analyzeText") snapshotTextAnalysis = await analyzeText(board)
		if(!task || task == "analyzeMeta") snapshotMetaAnalysis = await analyzeMeta(board)
		if(snapshotMetaAnalysis && snapshotTextAnalysis){
			io.emit("update",{
				board,
				snapshotTextAnalysis : snapshotTextAnalysis[board],
				snapshotMetaAnalysis : snapshotMetaAnalysis[board],
			})
		}
	}
}

if(require.main === module){
	for(let i = 2; i < process.argv.length; i+=2){
		OPTIONS[process.argv[i]] = process.argv[i+1]
	}
	main()
}

module.exports = main