const {metaDataDB} = require("./db")

const convert = oldMetaData => {
	/*
	for(let keyX in oldMetaData.metaData){
		console.log(keyX,typeof oldMetaData.metaData[keyX])
	}
	*/
  
	const metaOnly = oldMetaData.metaData

	const replacement = {
		snapTime: oldMetaData.snapTime,
		duration: oldMetaData.duration,
    
		totalThreads: metaOnly.threads,
		totalPosts: metaOnly.threads + metaOnly.repliesInThread.reduce((acc,val) => acc + val,0),
		totalReplies: metaOnly.repliesInThread.reduce((acc,val) => acc + val,0),
		totalRepliesWithText: metaOnly.repliesWithText.reduce((acc,val) => acc + val,0),
		totalRepliesWithImages: metaOnly.images.reduce((acc,val) => acc + val,0),
		totalOPLength: metaOnly.OPCharacters.reduce((acc,val) => acc + val,0),
		totalThreadsWithTitles: -999999,
		totalTextLength: metaOnly.charactersByPost.reduce((acc,val) => acc + val,0),
		totalThreadAgeHours: metaOnly.threadAgeHours.reduce((acc,val) => acc + val,0),
		oldestThreadAgeHours: -999999,
		totalPostersPerThread: metaOnly.postersPerThread.reduce((acc,val) => acc + val,0),
	}
	//console.log(replacement)
	return replacement
}

/*
totalThreads: 0,
totalPosts: 0,
totalReplies: 0,
totalRepliesWithText: 0,
totalRepliesWithImages: 0,
totalOPLength: 0,
totalThreadsWithTitles: 0,
totalTextLength: 0,
totalThreadAge: 0,
oldestThreadAge: 0,
totalPostersPerThread: 0 // just the sum of unique per thread
*/

const main = async (board,writeToDB = true) => {
	return new Promise((resolve,reject)=>{
		const batchOps = []
		let convertCounter = 0
		metaDataDB.createValueStream({
			gt: [board,0],
			lte: [board,Date.now()],
			//limit: 1,
			reverse: true
		})
			.on('data', function (data) {
				if(data.metaData){
					batchOps.push({
						type: "put",
						key: [board,data.snapTime],
						value: convert(data)
					})
					console.log(`--- /${board}/ converted ${++convertCounter} ---`)
				}
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				if(writeToDB){
					if(!batchOps.length) console.log(`--- /${board}/ nothing to convert ---`)
					metaDataDB.batch(batchOps, function (err) {
						if (err) console.log(err)
					})
				}
				resolve()
			})
	})
}

if(require.main === module){
	main()
}

module.exports = main