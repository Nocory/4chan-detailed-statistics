const fs = require('fs')
if (!fs.existsSync("analysis")) fs.mkdirSync("analysis")
if (!fs.existsSync("rawData")) fs.mkdirSync("rawData")

const extractData = require("./src/extractData.js")
const analyzeMeta = require("./src/analyzeMeta.js")
const analyzeText = require("./src/textAnalysis.js")

const OPTIONS = {
	"--only": ""
}

const main = async (only = OPTIONS["--only"]) => {
	if(!only || only == "extractData") await extractData()
	if(!only || only == "analyzeMeta") await analyzeMeta()
	if(!only || only == "analyzeText") await analyzeText()
}

if(require.main === module){
	for(let i = 2; i < process.argv.length; i+=2){
		OPTIONS[process.argv[i]] = process.argv[i+1]
	}
	main()
}

module.exports = main