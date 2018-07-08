const fs = require('fs')
if (!fs.existsSync("db_analysis")){
	fs.mkdirSync("db_analysis")
}
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const resultDB = low(new FileSync('db_analysis/result.json'))

const resultData = resultDB.value()
const properties = {
	avgPostsPerDay: [],
	dailyPeakPostsPerMinute: [],
	imageRatio: [],
	repliesWithTextRatio: [],
	avgRepliesPerThread: [],
	avgRepliesPerMinutePerThread: [],
	avgPostLengthByPost: [],
	avgPostLengthByThread: [],
	avgPostersPerThread: [],
	avgPostsByPoster: [],
	avgThreadAgeHours: []
}

for(let board in resultData){
	if(board == "vip" || board == "sp") continue
	const boardData = resultData[board]
	for(let key in properties){
		if(boardData[key] == null) console.log(board,key)
		properties[key].push(boardData[key])
	}
}

//console.log(properties)

const ss = require('simple-statistics')
const correlation = {}

const checks = Object.keys(properties).length ** 2
let i = 0
for(let keyX in properties){
	for(let keyY in properties){
		i++
		//if(i > 1) break
		if(keyX == keyY || correlation[`${keyY}-${keyX}`]){
			console.log("skipping",`${keyY}-${keyX}`)
			continue
		}
		console.log(`checking ${keyY}-${keyX} ${i}/${checks}`)
		//console.log(properties[keyX])
		//console.log(properties[keyY])
		correlation[`${keyX}-${keyY}`] = ss.sampleCorrelation(properties[keyX],properties[keyY]).toFixed(2)
	}
}

//const correlationArr
const correlationArr = Object.entries(correlation).sort((x,y) => y[1] - x[1])
for(let data of correlationArr){
	console.log(data)
}