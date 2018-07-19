const config = require("./config")
const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const {commentsDB,metaDataDB,low4statsMentionsDB,visibleCache,textAnalysisResultCache} = require("./db")

let postCounter = 0

//const main = async (board,rawData,snapTime,duration,writeToDB = true) => {
const main = async (board,rawData,writeToDB = true) => {	
	//console.log(`⏳   /${board}/ extracting from rawData`)
	console.time("extract")
	const commentSaveCutOff = rawData.snapTime / 1000 - config.commentsSaveSeconds
	
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
	
	const mentions = [] //FIXME: obvious

	let foundCounter = 0
	let notFoundCounter = 0
	let processed = 0
	const newCache = new Map()

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
			//postCounter++
			const post = thread.posts[i]
			if(post.sub) metaData.totalThreadsWithTitles++
			post.com = post.com || ""
			//if(cacheSet[board].has() && post.com){
			const cachedPost = visibleCache[board].get(post.no)
			if(cachedPost !== undefined){
				foundCounter++
			}else{
				notFoundCounter++
			}
			post.com = cachedPost !== undefined ? cachedPost[1] : post.com || ""
			if(cachedPost === undefined && post.com){
			//if(!cachedPost && post.com){
				processed++
				//if(processed == 1) console.log(post.com,post.com.length,post.no)
				if(board == "p") post.com = post.com.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
				if(board == "sci") post.com = post.com.replace(/\[\/?math\]|\[\/?eqn\]/gms,"") //removes special tags from /sci/
				//post.com = post.com.replace(/<span class="deadlink">.*?<\/span>/gm,"") //remove deadlinks
				//post.com = post.com.replace(/<a.*?<\/a>/gm,"") //remove post-links
				post.com = post.com.replace(/<span class="deadlink">(?:&gt;)+(\/[a-z34]+\/)?\d+<\/span>/g,"$1") //remove deadlinks
				post.com = post.com.replace(/<a href="(\/[a-z34]+\/)?.*?<\/a>/g,"$1")
				post.com = post.com.replace(/<br>/gm," ") //replace linebreaks with a space
				post.com = post.com.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
				post.com = entities.decode(post.com) //convert html entities to actual characters: "&gt;" becomes ">"
				post.com = post.com.trim() //remove whitespace from start and end
				post.com = post.com.toLowerCase()
				//FIXME: obvious
				/*
					if(post.com.includes("4stats")){
						mentions.push([new Date(post.time * 1000),`https://boards.4chan.org/${board}/thread/${threadNum}/#p${post.no}`,post.com])
					}
					*/
			}
			
			if(post.com){
				if (i == 0){
					metaData.totalOPLength += post.com.length
				}else{
					metaData.totalRepliesWithText++
				}
				metaData.totalTextLength += post.com.length
			}
			//console.log(post.com)
			newCache.set(post.no,[post.time,post.com])
			if(cachedPost === undefined && post.time > commentSaveCutOff) commentOps.push({type: 'put', key: [board,post.time,post.no], value: post.com})
		}
	}

	console.log("metaData.totalPosts",metaData.totalPosts)
	console.log("avgLen",metaData.totalTextLength / metaData.totalPosts)

	const oldTime = rawData.snapTime / 1000 - config.commentsAnalyzeSeconds
	let oldCacheSize = 0
	console.time("cacheTransfer")
	visibleCache[board].forEach((val,key) => {
		oldCacheSize++
		if(val[0] > oldTime){
			newCache.set(key,val)
			//console.log("young enough")
		}else{
			//console.log("too old")
		}
	})
	console.timeEnd("cacheTransfer")
	let newCacheSize = 0
	newCache.forEach(() => newCacheSize++)
	console.log("cacheSize old/new",oldCacheSize,newCacheSize)
	visibleCache[board] = newCache

	console.log("found/notfound:",foundCounter,notFoundCounter)
	//console.log("postCounter:",postCounter)
	console.log("processed:",processed)

	/*
	low4statsMentionsDB.set(`boards.${board}`,mentions).value()
	const chronologicalMentions = []
	const mentionsAllBoards = low4statsMentionsDB.get("boards").value()
	for(let board in mentionsAllBoards){
		for(let mention of mentionsAllBoards[board]){
			chronologicalMentions.push(mention)
		}
	}
	chronologicalMentions.sort((a,b) => b[0] - a[0])
	low4statsMentionsDB.set("chronological",chronologicalMentions).write()
	*/

	try{
		//TODO: make async in the future
		if(writeToDB){
			await Promise.all([
				commentsDB.batch(commentOps),
				metaDataDB.put([board,rawData.snapTime],metaData)
			])
			console.log(`✅   /${board}/ rawData extraction done. Wrote metaData and ${commentOps.length} comments to DB`)
		}else{
			console.log(`✅   /${board}/ rawData extraction done. ***skipping DB write***`)
		}
	}catch(err){
		console.error(err)
	}

	// clear the cache of recent text results specifically for the current board so it will be analyzed again
	for(let val of textAnalysisResultCache.values()){
		val[board] = null
	}
	
	console.timeEnd("extract")
}

module.exports = main