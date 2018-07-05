const axios = require("axios")
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const main = async () => {
	const metaDataDB = low(new FileSync(__dirname + '/../analysis/metadata.json'))
	//const commentDataDB = low(new FileSync(__dirname + '/../analysis/comments.json'))
	const resultDB = low(new FileSync(__dirname + '/../analysis/result.json'))
	//const experimentalDB = low(new FileSync(__dirname + '/../analysis/experimental.json'))

	const metaData = metaDataDB.getState()
	const result = {}

	const ss = require('simple-statistics')
	
	const coefficientOfVariation = arr => {
		return ss.standardDeviation(arr) / ss.mean(arr)
	}

	console.log("Fetching 4stats board data . . .")
	const chanstatsData = (await axios.get("https://api.4stats.io/allBoardStats")).data
	console.log("Done")

	for(board in metaData){
		const boardData = metaData[board]

		result[board] = {
			postsPerDay_mean: chanstatsData[board].avgPostsPerDay,
			dailyPeakPostsPerMinute_mean: chanstatsData[board].topPPM,
			OPLength_mean: ss.mean(boardData.OPCharacters),
			repliesWithImages_ratio: ss.sum(boardData.images) / ss.sum(boardData.repliesInThread),
			repliesWithText_ratio: ss.sum(boardData.repliesWithText) / ss.sum(boardData.repliesInThread),

			repliesPerThread_mean: ss.mean(boardData.repliesInThread),
			repliesPerThread_standardDeviation: ss.standardDeviation(boardData.repliesInThread),
			repliesPerThread_cov: coefficientOfVariation(boardData.repliesInThread),
			/* repliesPerThread33thPercentile: ss.quantile(boardData.repliesInThread,0.33),
			repliesPerThread50thPercentile: ss.quantile(boardData.repliesInThread,0.50),
			repliesPerThread67thPercentile: ss.quantile(boardData.repliesInThread,0.67),
 */
			repliesPerMinutePerThread_mean: ss.mean(boardData.repliesPerMinute),
			repliesPerMinutePerThread_standardDeviation: ss.standardDeviation(boardData.repliesPerMinute),
			repliesPerMinutePerThread_cov: coefficientOfVariation(boardData.repliesPerMinute),
			/* repliesPerMinutePerThread33thPercentile: ss.quantile(boardData.repliesPerMinute,0.33),
			repliesPerMinutePerThread50thPercentile: ss.quantile(boardData.repliesPerMinute,0.50),
			repliesPerMinutePerThread67thPercentile: ss.quantile(boardData.repliesPerMinute,0.67),
 */
			postLengthByPost_mean: ss.mean(boardData.charactersByPost),
			postLengthByPost_standardDeviation: ss.standardDeviation(boardData.charactersByPost),
			postLengthByPost_cov: coefficientOfVariation(boardData.charactersByPost),
			/* postLengthByPost33thPercentile: ss.quantile(boardData.charactersByPost,0.33),
			postLengthByPost50thPercentile: ss.quantile(boardData.charactersByPost,0.50),
			postLengthByPost67thPercentile: ss.quantile(boardData.charactersByPost,0.67),
 */
			postLengthByThread_mean: ss.mean(boardData.charactersByThread),
			postLengthByThread_standardDeviation: ss.standardDeviation(boardData.charactersByThread),
			postLengthByThread_cov: coefficientOfVariation(boardData.charactersByThread),
			/* postLengthByThread33thPercentile: ss.quantile(boardData.charactersByThread,0.33),
			postLengthByThread50thPercentile: ss.quantile(boardData.charactersByThread,0.50),
			postLengthByThread67thPercentile: ss.quantile(boardData.charactersByThread,0.67),
 */
			postersPerThread_mean: ss.mean(boardData.postersPerThread),
			postersPerThread_standardDeviation: ss.standardDeviation(boardData.postersPerThread),
			postersPerThread_cov: coefficientOfVariation(boardData.postersPerThread),
			/* postersPerThread33thPercentile: ss.quantile(boardData.postersPerThread,0.33),
			postersPerThread50thPercentile: ss.quantile(boardData.postersPerThread,0.50),
			postersPerThread67thPercentile: ss.quantile(boardData.postersPerThread,0.67),
 */
			postsByPoster_mean: ss.mean(boardData.postsByPoster),
			postsByPoster_standardDeviation: ss.standardDeviation(boardData.postsByPoster),
			postsByPoster_cov: coefficientOfVariation(boardData.postsByPoster),
			/* postsByPoster33thPercentile: ss.quantile(boardData.postsByPoster,0.33),
			postsByPoster50thPercentile: ss.quantile(boardData.postsByPoster,0.50),
			postsByPoster67thPercentile: ss.quantile(boardData.postsByPoster,0.67),
 */
			threadAgeHours_mean: ss.mean(boardData.threadAgeHours),
			threadAgeHours_standardDeviation: ss.standardDeviation(boardData.threadAgeHours),
			threadAgeHours_cov: coefficientOfVariation(boardData.threadAgeHours),
			/* threadAgeHours33thPercentile: ss.quantile(boardData.threadAgeHours,0.33),
			threadAgeHours50thPercentile: ss.quantile(boardData.threadAgeHours,0.50),
			threadAgeHours67thPercentile: ss.quantile(boardData.threadAgeHours,0.67), */
		}
		console.log(`/${board}/ meta data analysis done`)
	}
	resultDB.setState(result)
	resultDB.write()

	/////////
	// CSV //
	/////////
	
	const fs = require("fs")
	const stringify = require('csv-stringify/lib/sync')
	console.log("Creating csv file from analysis result . . .")
	const boards = Object.keys(result)
	const csvArr = []
	csvArr.push(['Name',...Object.keys(result[boards[0]])])
	for(board of boards){
		csvArr.push([board,...Object.values(result[board])])
	}
	fs.writeFileSync(__dirname + "/../analysis/result.csv",stringify(csvArr))
	console.log("Finished creating csv file.")

	/*
	const expResult = {}

	for(board in metaData){
		const boardData = metaData[board]

		expResult[board] = {
			imageRatio: ss.sum(boardData.images) / ss.sum(boardData.repliesInThread),
			postLengthByPost33thPercentile: ss.quantile(boardData.charactersByPost,0.33),
			postLengthByPost50thPercentile: ss.quantile(boardData.charactersByPost,0.50),
			postLengthByPost67thPercentile: ss.quantile(boardData.charactersByPost,0.67),
		}

		expResult[board].botErr = expResult[board].postLengthByPost50thPercentile - expResult[board].postLengthByPost33thPercentile
		expResult[board].topErr = expResult[board].postLengthByPost67thPercentile - expResult[board].postLengthByPost50thPercentile
	}

	experimentalDB.setState(expResult)
	experimentalDB.write()

	//console.log(result)
	*/
}

module.exports = main