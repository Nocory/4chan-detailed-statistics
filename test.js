const fs = require("fs")

const allBoards = require("./src/config.js").boards

let oldestBoard = "3"
let oldestTime = new Date()

for(let board of allBoards){
	const file = `rawData/${board}.json`
	if(!fs.existsSync(file)) continue
	const stats = fs.statSync(file)
	//console.log(stats)
	if(stats.mtime < oldestTime){
		oldestBoard = board
		oldestTime = stats.mtime
	}
}

console.log(oldestBoard)
console.log(oldestTime)