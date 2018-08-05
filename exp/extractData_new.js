const config = require("./config")
const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const {commentsDB,metaDataDB,textAnalysisResultCache,postIndex,invertedPostIndex} = require("./db")

const tokenize = str => {
	//(?:https?:\/\/)(?:www\.)?([\w-\.]+\.[a-z]+)(?:\/\S*)?
	//str = str.replace(/(?:https?:\/\/)(?:www\.)?([\w-\.]+\.[a-z]+)(?:\/\S*)?/g,"$1")
	str = str.replace(/(?:https?:\/\/)?(?:www\.)?([\w-\.]+\.[a-z]+)(?:\/\S*)?/g,"$1")
	const tokens = str.match(/[a-z0-9./\-:]{2,}\w/g) || []
	return Array.from(new Set(tokens)).map(x => Buffer.from(x).toString())
}

const processPost = (board,post) => {
	let str = post.com || ""

	if(board == "p") str = str.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
	if(board == "sci") str = str.replace(/\[\/?math\]|\[\/?eqn\]/gms,"") //removes special tags from /sci/
	str = str.replace(/<span class="deadlink">(?:&gt;)+(\/[a-z34]+\/)?\d+<\/span>/g,"$1") //remove deadlinks, keep board name
	str = str.replace(/<a href="(\/[a-z34]+\/)?.*?<\/a>/g,"$1") //remvoe link, keep board name
	str = str.replace(/<br>/gm," ") //replace linebreaks with a space
	str = str.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
	str = entities.decode(str) //convert html entities to actual characters: "&gt;" becomes ">"
	str = str.trim() //remove whitespace from start and end
	str = str.toLowerCase()
	
	//const postLen = str.length // get length here before shortening URLs
	
	const tokens = tokenize(str)
	const indexedTokens = []

	for(let token of tokens){
		//if(config.stopWords.has(token)) continue
		if(config.stopWords.has(token) || token.length > 50) continue
		//indexedTokens.push(token);
		/*
		const tokenBoardsMap = invertedPostIndex.get(token) || invertedPostIndex.set(token,new Map()).get(token)
		const tokenBoardsPostnumSet = tokenBoardsMap.get(board) || tokenBoardsMap.set(board,new Set()).get(board)
		tokenBoardsPostnumSet.add(post.no)
		*/
		//(invertedPostIndex.get(token) || invertedPostIndex.set(token,new Set()).get(token)).add(cacheData)

		const tokenBoardsMap = invertedPostIndex.get(token) || invertedPostIndex.set(token,new Map()).get(token)
		tokenBoardsMap.set(board,(tokenBoardsMap.get(board) || 0) + 1)
		indexedTokens.push(tokenBoardsMap)
	}
	
	return {
		str,
		indexedTokens
	}
	/*
	return {
		cacheData : {
			time: post.time,
			tokens: indexedTokens,
			length: postLen
		},
		str: post.com
	}
	*/
}

const extractFromRaw = async (board,rawData,writeToDB = true) => {
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

	let foundCounter = 0
	let notFoundCounter = 0
	let processed = 0
	const newCache = new Map()

	console.time("rawDataProcessing")
	for(let threadNum in rawData.threads){
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
			
			let cachedPost = postIndex[board].get(post.no)
			const postIsCached = cachedPost !== undefined
			
			if(!postIsCached){
				notFoundCounter++
				processed++

				const processResult = processPost(board,post)
				cachedPost = processResult.cacheData

				if(writeToDB && post.time > commentSaveCutOff){
					commentOps.push({type: 'put', key: [board,post.time,post.no], value: {
						com: processResult.str
					}})
				}
			}else{
				foundCounter++
			}
			
			if(i == 0) metaData.totalOPLength += cachedPost.length
			if(cachedPost.length && i > 0) metaData.totalRepliesWithText++
			metaData.totalTextLength += cachedPost.length
			
			//newCache.set(post.no,cachedPost)
			/*
			if(cachedPost.time > rawData.snapTime / 1000 - config.commentsAnalyzeSeconds || Math.random() >= 0.5){
				newCache.set(post.no,cachedPost)
			}
			*/
		}
	}
	console.timeEnd("rawDataProcessing")

	//console.log("metaData.totalPosts",metaData.totalPosts)
	//console.log("avgLen",metaData.totalTextLength / metaData.totalPosts)

	const oldTime = rawData.snapTime / 1000 - config.commentsAnalyzeSeconds
	let oldCacheSize = postIndex[board].size
	console.time("cacheTransfer")
	postIndex[board].forEach((val,key) => {
		if(val.time > oldTime){
			newCache.set(key,val)
			//console.log("young enough")
		}else{
			if(!newCache.has(key)){
				//console.log("newcache doesn't have",key)
				
				for(let tokenBoardsMap of val.tokens){
					if(token.length >= 3){
						const newVal = tokenBoardsMap.get(board) - 1
						if(newVal != 0){
							tokenBoardsMap.set(board,newVal)
						}else{
							tokenBoardsMap.delete(board)
						}
						

						//console.log("removing token",token,val.tokens)
						/*
						const tokenBoardsMap = invertedPostIndex.get(token)
						const tokenBoardsPostnumSet = tokenBoardsMap.get(board)
						tokenBoardsPostnumSet.delete(key) // delete post
						if(tokenBoardsPostnumSet.size == 0) tokenBoardsMap.delete(board) // if no more posts in board, delete board
						if(tokenBoardsMap.size == 0) invertedPostIndex.delete(token) // if no more boards in token, delete token
						*/
					}
				}
				
			}
			//console.log("too old")
		}
	})
	console.timeEnd("cacheTransfer")
	console.log("cacheSize old/new",oldCacheSize,newCache.size)
	postIndex[board] = newCache

	console.log("found/notfound:",foundCounter,notFoundCounter)
	//console.log("postCounter:",postCounter)
	console.log("processed:",processed)

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

module.exports = {
	extractFromRaw,
	processPost,
	tokenize
}