const sub = require('subleveldown')
const db = require('level')(__dirname + "/../database", {
	keyEncoding: require("charwise"),
	valueEncoding: "json",
	cacheSize: 256 * 1024 * 1024
})

const commentsDB = sub(db,"com",{keyEncoding: require("charwise"),valueEncoding: "utf8"})
const metaDataDB = sub(db,"metaData",{keyEncoding: require("charwise"),valueEncoding: "json"})
//const metaAnalysisResultDB = sub(db,"metaAnalysisResult",{keyEncoding: require("charwise"),valueEncoding: "json"})

const fs = require('fs')
if (!fs.existsSync(__dirname + "/../finalResults")) fs.mkdirSync(__dirname + "/../finalResults")
if (!fs.existsSync(__dirname + "/../rawData")) fs.mkdirSync(__dirname + "/../rawData")

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const lowFinalResultsDB = low(new FileSync(__dirname + "/../finalResults/db.json"))
const getBoardDB = board => {
	return low(new FileSync(__dirname + `/../rawData/${board}.json`))
}

module.exports = {
	commentsDB,
	metaDataDB,
	//metaAnalysisResultDB,
	lowFinalResultsDB,
	getBoardDB
}