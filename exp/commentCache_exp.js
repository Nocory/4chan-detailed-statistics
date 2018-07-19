const config = require("./config")
const {commentsDB} = require("./db")

const commentCache = {}
const commentIndex = {}

const create = async (board,snapTime,oldComments) => {
	console.time("commentCache_create")
	const allComments = oldComments
	return new Promise((resolve,reject)=>{
		commentsDB.createValueStream({
			gt: [board,snapTime / 1000 - config.commentsAnalyzeSeconds,0],
			lte: [board,snapTime,"~"]
		})
			.on('data', function (data) {
				allComments.push(data)
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				commentCache[board] = allComments
				console.timeEnd("commentCache_create")
				//console.log("commentCache_stringy_length",JSON.stringify(commentCache).length)
				resolve(allComments)
			})
	})
}

var natural = require('natural')
var tokenizer = new natural.WordTokenizer()
const createIndex = async (board,snapTime,oldComments) => {
	console.time("commentCache_createIndex")

	const tokenMap = new Map()
	let charLength = 0
	//FIXME: need total number of posts for ratio calculation

	//let i = 0

	const tokenize = comment => {
		charLength += comment.length
		const tokens = tokenizer.tokenize(comment)
		for(let token of tokens){
			token = token.toLowerCase()
			if(token.length < 3) continue
			tokenMap.set(token,(tokenMap.get(token) || 0) + 1)
		}
	}
	
	const allComments = []

	return new Promise((resolve,reject)=>{
		commentsDB.createValueStream({
			gt: [board,snapTime / 1000 - config.commentsAnalyzeSeconds,0],
			//gt: [board,snapTime / 1000 - 60 * 60 * 24 * 7,0],
			lte: [board,snapTime,"~"]
		})
			.on('data', function (data) {
				allComments.push(data)
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				console.time("tokenize")
				for(let comment of allComments){
					tokenize(comment)
				}
				commentIndex[board] = {
					tokenMap,
					commentCount: allComments.length,
					charCount: charLength
				}
				console.timeEnd("tokenize")
				console.timeEnd("commentCache_createIndex")

				console.log("CCE -> allComments:",allComments.length)
				console.log("CCE -> tokenMap:",tokenMap.size,"charLength",charLength)
				//console.log(Object.keys(tokens)[0],Object.keys(tokens)[10],Object.keys(tokens)[20])
				//console.log(tokens[Object.keys(tokens)[0]],tokens[Object.keys(tokens)[10]],tokens[Object.keys(tokens)[20]])
				//console.log("commentCache_stringy_length",JSON.stringify(commentCache).length)

				// search
				let searchWord = "boomer"
				let mapResults = 0
				console.time("tokenMap_search")
				tokenMap.forEach((val,key) => {
					if(key.includes(searchWord)){
						console.log(key,val)
						mapResults += val
					}
				})
				console.timeEnd("tokenMap_search")
				console.log("CCE -> Map Search result",searchWord,mapResults)

				/*
				let straightResults = 0
				const re = new RegExp(searchWord,"g")
				console.time("straightUp_regex")
				for(let comment of allComments){
					const matches = comment.match(re)
					straightResults += matches ? matches.length : 0
				}
				console.timeEnd("straightUp_regex")
				console.log("CCE -> straightUp_regex Search result",searchWord,straightResults)
				*/

				let straightResults2 = 0
				console.time("straightUp_includes")
				for(let comment of allComments){
					if(comment.includes(searchWord)) straightResults2++
				}
				console.timeEnd("straightUp_includes")
				console.log("CCE -> straightUp_includes Search result",searchWord,straightResults2)

				let straightResults3 = 0
				console.time("tokenMap_includes")
				tokenMap.forEach((val,key) => {
					if(key.includes(searchWord)) straightResults3 += val
				})
				console.timeEnd("tokenMap_includes")
				console.log("CCE -> tokenMap_includes Search result",searchWord,straightResults3)
				
				/*
				const tokensResultArr = Object.entries(tokenObj).sort((x,y) => y[1] - x[1])
				let n = 0
				for(let data of tokensResultArr){
					console.log(++n,data)
					if(n >= 10) break
				}
				*/
				resolve()
			})
	})
}

module.exports = {
	create,
	createIndex,
	commentCache,
	commentIndex
}