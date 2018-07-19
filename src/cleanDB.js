const {commentsDB} = require("./db")
const config = require("./config")

const argv = require('yargs')
	.default('board', "a")
	.default('dry-run', true)
	.default('clean-all', false)
	.argv

const main = async (board = argv.board,snapTime = Date.now(),dryRun = argv.dryRun) => {
	if(argv.cleanAll){
		console.log("CLEANING DATABASES FOR ALL BOARDS !!!")
		argv.cleanAll = false
		for(let board of config.boards){
			await main(board,false)
		}
	}

	const dbOps = []
	commentsDB.createKeyStream({
		gt: [board,0,0],
		lt: [board,snapTime / 1000 - config.commentsSaveSeconds,"~"]
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
				try{
					commentsDB.batch(dbOps)
				}catch(err){
					console.error("error while cleaning",board)
					console.error(err)
				}
			}
		})
}

if(require.main === module){
	main()
}

module.exports = main