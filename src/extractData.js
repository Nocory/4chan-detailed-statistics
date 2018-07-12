const config = require("./config")
const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const {commentsDB,metaDataDB} = require("./db")

//const main = async (board,rawData,snapTime,duration,writeToDB = true) => {
const main = async (board,rawData,writeToDB = true) => {	
	//console.log(`⏳   /${board}/ extracting from rawData`)
	console.time("extract")
	const commentSaveCutOff = rawData.snapTime / 1000 - config.commentsSaveSeconds
	const commentOldButVisibleCutOff = rawData.snapTime / 1000 - config.commentsAnalyzeSeconds
	const metaData = {
		snapTime: rawData.snapTime,
		duration: rawData.duration, //default to 60 minutes in analysis
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
	const commentOps = []
	const allVisibleComments = []
	const oldButVisibleComments = []
	
	for(let threadNum in rawData.threads){
		//console.log(board,threadNum)
		const thread = rawData.threads[threadNum]
		const OP = thread.posts[0]
		if(OP.closed || OP.sticky) continue
		const threadAgeHours = (thread.snapTime / 1000 - OP.time) / (60 * 60)
		
		metaData.totalThreads++
		metaData.totalPosts += thread.posts.length
		metaData.totalReplies += OP.replies
		//metaData.totalRepliesWithText // in post loop
		metaData.totalRepliesWithImages += OP.images
		//totalOPLength // in post loop
		//totalThreadsWithTitles // in post loop
		//totalTextLength // in post loop
		metaData.totalThreadAgeHours += threadAgeHours
		metaData.oldestThreadAgeHours = Math.max(metaData.oldestThreadAgeHours,threadAgeHours)
		//console.log(metaData.oldestThreadAgeHours,threadAgeHours)
		metaData.totalPostersPerThread += OP.unique_ips
		
		for(let i = 0; i < thread.posts.length; i++){
			const post = thread.posts[i]
			if(post.sub) metaData.totalThreadsWithTitles++
			if(post.com){
				if(board == "p") post.com = post.com.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
				if(board == "sci") post.com = post.com.replace(/\[\/?math\]|\[\/?eqn\]/gms,"") //removes EXIF text from /p/ posts
				post.com = post.com.replace(/<span class="deadlink">.*?<\/span>/gm,"") //remove deadlinks
				post.com = post.com.replace(/<a.*?<\/a>/gm,"") //remove post-links
				post.com = post.com.replace(/<br>/gm," ") //replace linebreaks with a space
				post.com = post.com.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
				post.com = entities.decode(post.com) //convert html entities to actual characters: "&gt;" becomes ">"
				post.com = post.com.trim() //remove whitespace from start and end
				metaData.totalTextLength += post.com.length
				if (i == 0){
					metaData.totalOPLength += post.com.length
				}else if(post.com){
					metaData.totalRepliesWithText++
				}

				allVisibleComments.push(post.com)
				if(post.time > commentSaveCutOff) commentOps.push({type: 'put', key: [board,post.time,post.no], value: post.com})
				if(post.time < commentOldButVisibleCutOff) oldButVisibleComments.push(post.com)
			}
		}
	}

	try{
		//TODO: make async in the future
		//console.time("commentOps")
		if(writeToDB){
			await commentsDB.batch(commentOps)
			await metaDataDB.put([board,rawData.snapTime],metaData)
			console.log(`✅   /${board}/ rawData extraction done. Wrote metaData and ${commentOps.length} comments to DB`)
		}else{
			console.log(`✅   /${board}/ rawData extraction done. ***skipping DB write***`)
		}
		//console.timeEnd("commentOps")
	}catch(err){
		console.error(err)
	}
	
	//const metaDataDB = low(new FileSync(__dirname + `/../processedData/${board}_metadata_${now}.json`))
	//const commentDataDB = low(new FileSync(__dirname + `/../processedData/${board}_comments_${now}.json`))
	//metaDataDB.setState(metaData).write()
	//commentDataDB.setState(comments).write()
	//const recentComments = commentOps.map(item => item.value)
	console.timeEnd("extract")
	console.log(`✅   /${board}/ data extraction done`)

	//console.log("com visible on board",allVisibleComments.length)
	//console.log("com younger than a week",commentOps.length)
	//console.log("com older than a day",oldButVisibleComments.length)
	return {
		metaData,
		oldButVisibleComments
	}
}

module.exports = main