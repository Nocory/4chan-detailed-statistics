const axios = require("axios")
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require("fs")

const main = async (board = "") => {
	if(!fs.existsSync(__dirname + `/../analysis/${board}_metadata.json`)) return
	const metaDataDB = low(new FileSync(__dirname + `/../analysis/${board}_metadata.json`))
	const metaAnalysisDB = low(new FileSync(__dirname + '/../analysis/metaAnalysisResult.json'))
	
	const ss = require('simple-statistics')
	
	const coefficientOfVariation = arr => {
		return ss.standardDeviation(arr) / ss.mean(arr)
	}

	console.log("⏳   Fetching 4stats board data")
	const chanstatsData = (await axios.get(`https://api.4stats.io/board/${board}`)).data
	console.log("✅   Received 4stats board data")

	const metaData = metaDataDB.getState()
	const result = {
		postsPerDay_mean: chanstatsData.avgPostsPerDay,
		dailyPeakPostsPerMinute_mean: chanstatsData.topPPM,
		OPLength_mean: ss.mean(metaData.OPCharacters),
		repliesWithImages_ratio: ss.sum(metaData.images) / ss.sum(metaData.repliesInThread),
		repliesWithText_ratio: ss.sum(metaData.repliesWithText) / ss.sum(metaData.repliesInThread),

		repliesPerThread_mean: ss.mean(metaData.repliesInThread),
		repliesPerThread_standardDeviation: ss.standardDeviation(metaData.repliesInThread),
		repliesPerThread_cov: coefficientOfVariation(metaData.repliesInThread),
		/* repliesPerThread33thPercentile: ss.quantile(metaData.repliesInThread,0.33),
		repliesPerThread50thPercentile: ss.quantile(metaData.repliesInThread,0.50),
		repliesPerThread67thPercentile: ss.quantile(metaData.repliesInThread,0.67),
*/
		repliesPerMinutePerThread_mean: ss.mean(metaData.repliesPerMinute),
		repliesPerMinutePerThread_standardDeviation: ss.standardDeviation(metaData.repliesPerMinute),
		repliesPerMinutePerThread_cov: coefficientOfVariation(metaData.repliesPerMinute),
		/* repliesPerMinutePerThread33thPercentile: ss.quantile(metaData.repliesPerMinute,0.33),
		repliesPerMinutePerThread50thPercentile: ss.quantile(metaData.repliesPerMinute,0.50),
		repliesPerMinutePerThread67thPercentile: ss.quantile(metaData.repliesPerMinute,0.67),
*/
		postLengthByPost_mean: ss.mean(metaData.charactersByPost),
		postLengthByPost_standardDeviation: ss.standardDeviation(metaData.charactersByPost),
		postLengthByPost_cov: coefficientOfVariation(metaData.charactersByPost),
		/* postLengthByPost33thPercentile: ss.quantile(metaData.charactersByPost,0.33),
		postLengthByPost50thPercentile: ss.quantile(metaData.charactersByPost,0.50),
		postLengthByPost67thPercentile: ss.quantile(metaData.charactersByPost,0.67),
*/
		postLengthByThread_mean: ss.mean(metaData.charactersByThread),
		postLengthByThread_standardDeviation: ss.standardDeviation(metaData.charactersByThread),
		postLengthByThread_cov: coefficientOfVariation(metaData.charactersByThread),
		/* postLengthByThread33thPercentile: ss.quantile(metaData.charactersByThread,0.33),
		postLengthByThread50thPercentile: ss.quantile(metaData.charactersByThread,0.50),
		postLengthByThread67thPercentile: ss.quantile(metaData.charactersByThread,0.67),
*/
		postersPerThread_mean: ss.mean(metaData.postersPerThread),
		postersPerThread_standardDeviation: ss.standardDeviation(metaData.postersPerThread),
		postersPerThread_cov: coefficientOfVariation(metaData.postersPerThread),
		/* postersPerThread33thPercentile: ss.quantile(metaData.postersPerThread,0.33),
		postersPerThread50thPercentile: ss.quantile(metaData.postersPerThread,0.50),
		postersPerThread67thPercentile: ss.quantile(metaData.postersPerThread,0.67),
*/
		postsByPoster_mean: ss.mean(metaData.postsByPoster),
		postsByPoster_standardDeviation: ss.standardDeviation(metaData.postsByPoster),
		postsByPoster_cov: coefficientOfVariation(metaData.postsByPoster),
		/* postsByPoster33thPercentile: ss.quantile(metaData.postsByPoster,0.33),
		postsByPoster50thPercentile: ss.quantile(metaData.postsByPoster,0.50),
		postsByPoster67thPercentile: ss.quantile(metaData.postsByPoster,0.67),
*/
		threadAgeHours_mean: ss.mean(metaData.threadAgeHours),
		threadAgeHours_standardDeviation: ss.standardDeviation(metaData.threadAgeHours),
		threadAgeHours_cov: coefficientOfVariation(metaData.threadAgeHours),
		/* threadAgeHours33thPercentile: ss.quantile(metaData.threadAgeHours,0.33),
		threadAgeHours50thPercentile: ss.quantile(metaData.threadAgeHours,0.50),
		threadAgeHours67thPercentile: ss.quantile(metaData.threadAgeHours,0.67), */
	}
	
	metaAnalysisDB.set(board,result).write()
	console.log(`✅   /${board}/ meta analysis done`)

	/////////
	// CSV //
	/////////
	const allMetaAnalysisResults = metaAnalysisDB.getState()
	const stringify = require('csv-stringify/lib/sync')
	console.log("⏳   Creating csv file from meta analysis result")
	const boards = Object.keys(allMetaAnalysisResults).sort()
	const csvArr = []
	csvArr.push(['Name',...Object.keys(allMetaAnalysisResults[boards[0]])])
	for(board of boards){
		csvArr.push([board,...Object.values(allMetaAnalysisResults[board])])
	}
	fs.writeFileSync(__dirname + "/../analysis/metaAnalysisResult.csv",stringify(csvArr))
	console.log("✅   Created csv file successfully.")
	

	/*
	const expResult = {}

	for(board in metaData){
		const metaData = metaData[board]

		expResult[board] = {
			imageRatio: ss.sum(metaData.images) / ss.sum(metaData.repliesInThread),
			postLengthByPost33thPercentile: ss.quantile(metaData.charactersByPost,0.33),
			postLengthByPost50thPercentile: ss.quantile(metaData.charactersByPost,0.50),
			postLengthByPost67thPercentile: ss.quantile(metaData.charactersByPost,0.67),
		}

		expResult[board].botErr = expResult[board].postLengthByPost50thPercentile - expResult[board].postLengthByPost33thPercentile
		expResult[board].topErr = expResult[board].postLengthByPost67thPercentile - expResult[board].postLengthByPost50thPercentile
	}

	experimentalDB.setState(expResult)
	experimentalDB.write()

	//console.log(result)
	*/

	return allMetaAnalysisResults
}

module.exports = main