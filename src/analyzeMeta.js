const {metaDataDB} = require("./db")

const main = async (board,snapTime) => {
	console.time("analyzeMeta")

	const metaDataSum = {
		totalThreads: 0,
		totalPosts: 0,
		totalReplies: 0,
		totalRepliesWithText: 0,
		totalRepliesWithImages: 0,
		totalOPLength: 0,
		totalThreadsWithTitles: 0,
		totalTextLength: 0,
		totalThreadAgeHours: 0,
		oldestThreadAgeHours: 0,
		totalPostersPerThread: 0 // just the sum of unique per thread
	}

	let hoursLeft = 24

	return new Promise((resolve,reject)=>{
		//console.log("snapTime",snapTime)
		metaDataDB.createValueStream({
			gt: [board,snapTime - 1000 * 60 * 60 * 24],
			lte: [board,snapTime],
			reverse: true //TODO: instead of reverse query, reverse the result for better performance
		})
			.on('data', function (data) {
				//console.log("analyzeMeta onData")
				//console.log(data.duration,data.duration / (1000 * 60 * 60))
				if(hoursLeft <= 0){
					console.warn(`hoursLeft <= 0 while analyzeMeta for ${board}. THIS HSOULD NOT HAPPEN`)
					return
				}
				let hoursCovered = Math.min(hoursLeft,data.duration / (1000 * 60 * 60))
				hoursLeft -= hoursCovered
				//console.log(hoursCovered,hoursLeft)
				metaDataSum.totalThreads += data.totalThreads * hoursCovered
				metaDataSum.totalPosts += data.totalPosts * hoursCovered
				metaDataSum.totalReplies += data.totalReplies * hoursCovered
				metaDataSum.totalRepliesWithText += data.totalRepliesWithText * hoursCovered
				metaDataSum.totalRepliesWithImages += data.totalRepliesWithImages * hoursCovered
				metaDataSum.totalOPLength += data.totalOPLength * hoursCovered
				metaDataSum.totalThreadsWithTitles += data.totalThreadsWithTitles * hoursCovered
				metaDataSum.totalTextLength += data.totalTextLength * hoursCovered
				metaDataSum.totalThreadAgeHours += data.totalThreadAgeHours * hoursCovered
				metaDataSum.oldestThreadAgeHours = Math.max(metaDataSum.oldestThreadAgeHours,data.oldestThreadAgeHours) //TODO: conversion shouldn't take place here
				//console.log("analyze",metaDataSum.oldestThreadAgeHours,data.oldestThreadAgeHours)
				metaDataSum.totalPostersPerThread += data.totalPostersPerThread * hoursCovered
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				const metaAnalysisResult = {
					OPLength_mean: metaDataSum.totalOPLength / metaDataSum.totalThreads,
					repliesWithImages_ratio: metaDataSum.totalRepliesWithImages / metaDataSum.totalReplies,
					repliesWithText_ratio: metaDataSum.totalRepliesWithText / metaDataSum.totalReplies,
					repliesPerThread_mean: metaDataSum.totalReplies / metaDataSum.totalThreads,
					threadsWithTitles_ratio: metaDataSum.totalThreadsWithTitles / metaDataSum.totalThreads,
					postLength_mean: metaDataSum.totalTextLength / metaDataSum.totalPosts,
					postersPerThread_mean: metaDataSum.totalPostersPerThread / metaDataSum.totalThreads,
					postsPerPoster_mean: metaDataSum.totalPosts / metaDataSum.totalPostersPerThread,
					threadAgeHours_mean: metaDataSum.totalThreadAgeHours / metaDataSum.totalThreads,
					oldestThreadAgeHours: metaDataSum.oldestThreadAgeHours,
					created: snapTime
				}
				
				console.timeEnd("analyzeMeta")
				console.log(`✅   /${board}/ meta analysis done.`)
				//console.log(metaAnalysisResult)
				resolve(metaAnalysisResult)
			})
	})
}

module.exports = main