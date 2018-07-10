const {commentsDB} = require("./db")
const config = require("./config")

const main = async (board,dryRun = false) => {
	const dbOps = []
	commentsDB.createKeyStream({
		gt: [board,0,0],
		lte: [board,Date.now() / 1000 - config.commentsSaveSeconds,"~"]
	})
		.on('data', function (data) {
			dbOps.push({ type: 'del', key: data })
		})
		.on('error', function (err) {
			console.error(err)
		})
		.on('end', function () {
			if(dryRun){
				console.log(`/${board}/ comment DB cleanup *DRY RUN* would have removed ${dbOps.length} comments.`)
			}else{
				console.log(`/${board}/ comment DB cleanup. Removing ${dbOps.length} comments.`)
				commentsDB.batch(dbOps)
			}
		})
}

if(require.main === module){
	main()
}

module.exports = main