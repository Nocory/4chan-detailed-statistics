const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require("fs")
const stringify = require('csv-stringify/lib/sync')

const main = async () => {
	console.log("Creating csv file from analysis result . . .")
	const resultDB = low(new FileSync('analysis/result.json'))
	const results = resultDB.getState()
	const boards = Object.keys(results)
	const properties = Object.keys(results[boards[0]])
  
	const csvArr = []
	csvArr.push(['Name',...properties])
	for(board of boards){
		csvArr.push([board,...Object.values(results[board])])
	}
  
	fs.writeFileSync("analysis/result.csv",stringify(csvArr))
  
	console.log("Finished creating csv file.")
}

module.exports = main