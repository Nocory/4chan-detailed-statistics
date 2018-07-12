const {commentsDB} = require("./db")

const commentCache = {}

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
				resolve(allComments)
			})
	})
}

const get = board => {
	return commentCache[board] ||[]
}

module.exports = {
	create,
	getSingle,
	commentCache
}