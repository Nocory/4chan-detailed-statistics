const config = require("./src/config")
const {lowFinalResultsDB,commentsDB,metaDataDB} = require("./src/db")

const sub = require('subleveldown')
const db = require('level')("database_renewed", {
	keyEncoding: require("charwise"),
	valueEncoding: "json",
	cacheSize: 1024 * 1024 * 1024
})
const newCommentsDB = sub(db,"com",{
	keyEncoding: require("charwise"),
	valueEncoding: "utf8",
	cacheSize: 1024 * 1024 * 1024
})
const newMetaDataDB = sub(db,"metaData",{keyEncoding: require("charwise"),valueEncoding: "json"})

const renewComments = async board => {
	return new Promise((resolve,reject)=>{
		const to = lowFinalResultsDB.value()[board].metaAnalysis.created / 1000
		const from = to - config.commentsSaveSeconds
		//console.log(from,to)
    
		const ops = []
		totalCommentEntries = 0

		commentsDB.createReadStream({
			gt: [board,from,0],
			lte: [board,to,"~"]
		})
			.on('data', data => {
				totalCommentEntries++
				ops.push({type: "put", key: data.key, value: data.value})
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				console.log(`/${board}/ keeping ${ops.length} of ${totalCommentEntries} commentEntries`)
				newCommentsDB.batch(ops).then(resolve)
				//resolve()
			})
	})
}

const renewMeta = async board => {
	return new Promise((resolve,reject)=>{
		const to = lowFinalResultsDB.value()[board].metaAnalysis.created
		const from = to - 1000 * 60 * 60 * 24 * 1
		//console.log(from,to)
    
		const ops = []
		totalMetaEntries = 0

		metaDataDB.createReadStream({
			gt: [board,0],
			lte: [board,to]
		})
			.on('data', data => {
				totalMetaEntries++
				if(data.key[1] >= from) ops.push({type: "put", key: data.key, value: data.value})
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				console.log(`/${board}/ keeping ${ops.length} of ${totalMetaEntries} metaEntries`)
				newMetaDataDB.batch(ops).then(resolve)
				//resolve()
			})
	})
}

const main = async () => {
	for(let board of config.boards){
		//await renewComments(board)
		await renewMeta(board)
	}
}

main()