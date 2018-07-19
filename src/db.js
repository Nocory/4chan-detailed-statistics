const sub = require('subleveldown')
const db = require('level')(__dirname + "/../database", {
	keyEncoding: require("charwise"),
	valueEncoding: "json",
	cacheSize: 256 * 1024 * 1024
})
const commentsDB = sub(db,"com",{
	keyEncoding: require("charwise"),
	valueEncoding: "utf8",
	cacheSize: 256 * 1024 * 1024
})
const metaDataDB = sub(db,"metaData",{keyEncoding: require("charwise"),valueEncoding: "json"})

const fs = require('fs')
if (!fs.existsSync(__dirname + "/../finalResults")) fs.mkdirSync(__dirname + "/../finalResults")
if (!fs.existsSync(__dirname + "/../rawData")) fs.mkdirSync(__dirname + "/../rawData")

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const lowFinalResultsDB = low(new FileSync(__dirname + "/../finalResults/db.json"))
const low4statsMentionsDB = low(new FileSync(__dirname + "/../finalResults/4statsMentions.json"))
low4statsMentionsDB.defaults({ chronological: [], boards: {}}).write()
const getBoardDB = board => {
	return low(new FileSync(__dirname + `/../rawData/${board}.json`))
}

const visibleCache = {}
for(let board of require("./config").boards){
	visibleCache[board] = new Map()
}

var LRU = require("lru-cache")
const textAnalysisResultCache = LRU({
	max: 100
})

module.exports = {
	commentsDB,
	metaDataDB,
	lowFinalResultsDB,
	low4statsMentionsDB,
	getBoardDB,
	visibleCache,
	textAnalysisResultCache
}