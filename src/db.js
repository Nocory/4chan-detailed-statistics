const config = require("./config")
// LEVEL
const sub = require('subleveldown')
const db = require('level')(__dirname + "/../database", {
	cacheSize: 1024 * 1024 * 256
})

// posts in postNum order
const postsDB = sub(db,"post",{
	keyEncoding: require("charwise"),
	valueEncoding: "json"
})

// threads in postNum order
const threadsDB = sub(db,"thread",{
	keyEncoding: require("charwise"),
	valueEncoding: "json"
})

// threads in postNum order
const imagesDB = require('level')(__dirname + "/../database_images", {
	keyEncoding: "utf8",
	valueEncoding: "utf8",
	cacheSize: 1024 * 1024 * 128
})

// board meta (visibleThreads, boardWeight)
const metaDB = sub(db,"META",{
	keyEncoding: "utf8",
	valueEncoding: "json"
})

// board meta (visibleThreads, boardWeight)
/*
const tokenDB = sub(db,"token",{
	keyEncoding: require("charwise"),
	valueEncoding: "json"
})
*/
const tokenDB = require('level')(__dirname + "/../database_tokens", {
	cacheSize: 1024 * 1024 * 8,
	keyEncoding: require("charwise"),
	valueEncoding: "json"
})

const boardStats = {}
for(let board of config.boards){
	boardStats[board] = {
		postCount: 0,
		OPCount: 0,

		repliesWithText: 0,
		repliesWithImages: 0,
		threadsWithTitles: 0,

		postLength: 0,
		OPLength: 0,
		threadReplies_sum: 0,
		uniqueIPs_sum: 0,
		timeOfDaySeconds_sum: 0
	}
}

const LRU = require("lru-cache")
const textAnalysisResultCache = LRU({
	max: 100
})

const invertedPostIndex = new Map()

module.exports = {
	postsDB,
	threadsDB,
	metaDB,
	tokenDB,
	textAnalysisResultCache,
	invertedPostIndex,
	imagesDB
}