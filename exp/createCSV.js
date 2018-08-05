const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require("fs")
const stringify = require('csv-stringify/lib/sync')

const {io} = require("./server")

const csvStrings = {}

const main = async () => {
	console.log("⏳   Creating csv files from final analysis results")
	const finalResults = low(new FileSync(__dirname + '/../finalResults/db.json')).value()

	const textAnalysisLastDay = {}
	const metaAnalysisLastSnapshot = {}
	const metaAnalysisLastDayAverage = {}

	for(let board in finalResults){
		textAnalysisLastDay[board] = finalResults[board].textAnalysisLastDay
		metaAnalysisLastSnapshot[board] = finalResults[board].metaAnalysisLastSnapshot
		metaAnalysisLastDayAverage[board] = finalResults[board].metaAnalysisLastDayAverage
	}

	const tasks = [
		["textAnalysisLastDay",textAnalysisLastDay],
		["metaAnalysisLastSnapshot",metaAnalysisLastSnapshot],
		["metaAnalysisLastDay",metaAnalysisLastDayAverage]
	]

	const populate = (source,line,useKey,prefix = "") => {
		for(let key in source){
			if(typeof source[key] == "object"){
				populate(source[key],line,useKey,prefix + key)
			}else{
				line.push(useKey ? prefix + key : source[key])
			}
		}
	}
	
	for(let task of tasks){
		const taskName = task[0]
		const taskData = task[1]
		const boards = Object.keys(taskData).sort()
		if(!boards.length) break
		const csvLines = []
		const newLine = ["Board"]
		populate(taskData[boards[0]],newLine,true)
		csvLines.push(newLine)
		for(let board of boards){
			const newLine = [board]
			populate(taskData[board],newLine,false)
			csvLines.push(newLine)
		}
		csvStrings[taskName] = stringify(csvLines)
	}

	io.emit("csvStrings",csvStrings)

	for(let key in csvStrings){
		fs.writeFileSync(__dirname + `/../finalResults/${key}.csv`,csvStrings[key])
	}
  
	console.log("✅   Finished creating csv files.")
}
/*
expressApp.get('/csv/:name', function (req, res) {
	res.set('Content-Type', 'text/csv')
	res.set('Content-Disposition', `attachment; filename=${req.params.name}.csv`)
	//res.set('filename', 'textAnalysisLastDay.csv')
	if(!csvStrings[req.params.name]){
		res.sendStatus(404)
	}else{
		res.send(csvStrings[req.params.name])
	}
})
*/
if(require.main === module){
	main()
}

module.exports = main