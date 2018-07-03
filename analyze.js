const axios = require("axios")

const fs = require('fs')
if (!fs.existsSync("db_analysis")){
	fs.mkdirSync("db_analysis")
}
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const extractedDataDB = low(new FileSync('db_analysis/extractedData.json'))
const resultDB = low(new FileSync('db_analysis/result.json'))
const experimentalDB = low(new FileSync('db_analysis/experimental.json'))

const Entities = require('html-entities').Html5Entities
const entities = new Entities()


const main = async () => {
	const analysis = {}
	const allBoards = require("./config.js").boards
  
	for(let board of allBoards){
		if(!fs.existsSync(`db_get/${board}.json`)) continue
		const db_threads = low(new FileSync(`db_get/${board}.json`)).value()
		
		analysis[board] = {
			threads: 0,
			repliesInThread: [],
			repliesWithText: [],
			images: [],
			charactersByPost: [],
			charactersByThread: [],
			threadAgeHours: [],
			uniqueIPs: [], // not 'actually' unique IPs, just the sum of the unique posters per thread
      
			repliesPerMinute: [],
			avgPostLengthByPost: [],
			avgPostLengthByThread: [],
			imageRatio: [],
			avgThreadAgeHours: [],
			postersPerThread: [],
			postsByPoster: [], // per thread
		}
		for(let threadNum in db_threads){
			//console.log(board,threadNum)
			const thread = db_threads[threadNum]
			const OP = thread.posts[0]
			if(OP.closed || OP.sticky || thread.posts.length == 1) continue // remove 
			const threadAge = thread.posts[thread.posts.length - 1].time - OP.time
			/*
			if(OP.sticky){
				threadAge = thread.posts[thread.posts.length - 1].time - thread.posts[1].time
      }
      */
      
			analysis[board].threads++
			analysis[board].repliesInThread.push(OP.replies)
			analysis[board].images.push(OP.images)

			// Check length of posts and differentiate between charsByPost and charsByThread 
			let newCharacters = 0
			let repliesWithText = 0
			for(let i = 1; i < thread.posts.length; i++){ // skip the OP post
				const post = thread.posts[i]
				if(!post.com) post.com = ""
				if(board == "p") post.com = post.com.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
				post.com = post.com.replace(/<a.*?<\/a>|<br>/gm," ") //replace post-links and linebreaks with a space
				post.com = post.com.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
				post.com = entities.decode(post.com) //convert html entities to actual characters: "&gt;" becomes ">"
				post.com = post.com.trim() //remove whitespace from start and end
				if(post.com){
					newCharacters += post.com.length
					repliesWithText++
				}
				//if(board == "p") console.log(post.com)
				analysis[board].charactersByPost.push(post.com.length)
			}
			analysis[board].charactersByThread.push(newCharacters / thread.posts.length)
			analysis[board].repliesWithText.push(repliesWithText)

			analysis[board].threadAgeHours.push(threadAge / 3600)
			analysis[board].repliesPerMinute.push(OP.replies / (threadAge / 60))
			analysis[board].postersPerThread.push(OP.unique_ips)
			analysis[board].postsByPoster.push((OP.replies + 1) / OP.unique_ips)
		}
		console.log(`/${board}/ extraction done`)
	}
	extractedDataDB.setState(analysis)
	extractedDataDB.write()

	const ss = require('simple-statistics')

	const result = {}

	console.log("Fetching 4stats board data . . .")
	const chanstatsData = (await axios.get("https://api.4stats.io/allBoardStats")).data
	console.log("Done")

	for(board in analysis){
		const boardData = analysis[board]

		result[board] = {
			avgPostsPerDay: chanstatsData[board].avgPostsPerDay,
			dailyTopPostsPerMinute: chanstatsData[board].topPPM,
			imageRatio: ss.sum(boardData.images) / ss.sum(boardData.repliesInThread),
			repliesWithTextRatio: ss.sum(boardData.repliesWithText) / ss.sum(boardData.repliesInThread),

			avgRepliesPerMinutePerThread: ss.mean(boardData.repliesPerMinute),
			repliesPerMinutePerThreadStandardDeviation: ss.standardDeviation(boardData.repliesPerMinute),
			repliesPerMinutePerThread33thPercentile: ss.quantile(boardData.repliesPerMinute,0.33),
			repliesPerMinutePerThread67thPercentile: ss.quantile(boardData.repliesPerMinute,0.67),

			avgPostLengthByPost: ss.mean(boardData.charactersByPost),
			postLengthByPostStandardDeviation: ss.standardDeviation(boardData.charactersByPost),
			postLengthByPost33thPercentile: ss.quantile(boardData.charactersByPost,0.33),
			postLengthByPost67thPercentile: ss.quantile(boardData.charactersByPost,0.67),

			avgPostLengthByThread: ss.mean(boardData.charactersByThread),
			postLengthByThreadStandardDeviation: ss.standardDeviation(boardData.charactersByThread),
			postLengthByThread33thPercentile: ss.quantile(boardData.charactersByThread,0.33),
			postLengthByThread67thPercentile: ss.quantile(boardData.charactersByThread,0.67),

			avgPostersPerThread: ss.mean(boardData.postersPerThread),
			postersPerThreadStandardDeviation: ss.standardDeviation(boardData.postersPerThread),
			postersPerThread33thPercentile: ss.quantile(boardData.postersPerThread,0.33),
			postersPerThread67thPercentile: ss.quantile(boardData.postersPerThread,0.67),

			avgPostsByPoster: ss.mean(boardData.postsByPoster),
			postsByPosterStandardDeviation: ss.standardDeviation(boardData.postsByPoster),
			postsByPoster33thPercentile: ss.quantile(boardData.postsByPoster,0.33),
			postsByPoster67thPercentile: ss.quantile(boardData.postsByPoster,0.67),

			avgThreadAgeHours: ss.mean(boardData.threadAgeHours),
			threadAgeHoursStandardDeviation: ss.standardDeviation(boardData.threadAgeHours),
			threadAgeHours33thPercentile: ss.quantile(boardData.threadAgeHours,0.33),
			threadAgeHours67thPercentile: ss.quantile(boardData.threadAgeHours,0.67),
		}
	}
	resultDB.setState(result)
	resultDB.write()

	const expResult = {}

	for(board in analysis){
		const boardData = analysis[board]

		expResult[board] = {
			imageRatio: ss.sum(boardData.images) / ss.sum(boardData.repliesInThread),
			postLengthByPost50thPercentile: ss.quantile(boardData.charactersByPost,0.50),
			postLengthByPost33thPercentile: ss.quantile(boardData.charactersByPost,0.33),
			postLengthByPost67thPercentile: ss.quantile(boardData.charactersByPost,0.67),
		}

		expResult[board].botErr = expResult[board].postLengthByPost50thPercentile - expResult[board].postLengthByPost33thPercentile
		expResult[board].topErr = expResult[board].postLengthByPost67thPercentile - expResult[board].postLengthByPost50thPercentile
	}

	experimentalDB.setState(expResult)
	experimentalDB.write()

	console.log(result)
}

main()