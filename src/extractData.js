//const low = require('lowdb')
//const FileSync = require('lowdb/adapters/FileSync')
const config = require("./config")
const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const {commentsDB,metaDataDB} = require("./db")

const main = async (board,rawData,snapTime,duration) => {
	console.time("extract")
	const commentTimeCutOff = snapTime / 1000 - config.commentMaxAgeSeconds
	const metaData = {
		threads: 0,
		repliesInThread: [],
		repliesWithText: [],
		images: [],
		OPCharacters: [],
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
	const commentOps = []
	const allVisibleComments = []
	const oldButVisibleComments = []
	
	for(let threadNum in rawData){
		//console.log(board,threadNum)
		const thread = rawData[threadNum]
		const OP = thread.posts[0]
		if(OP.closed || OP.sticky) continue
		const threadAge = thread.snapTime / 1000 - OP.time
		console.log("threadAge",threadAge)
		/*
		if(OP.sticky){
			threadAge = thread.posts[thread.posts.length - 1].time - thread.posts[1].time
		}
		*/
		
		metaData.threads++
		metaData.repliesInThread.push(OP.replies)
		metaData.images.push(OP.images)

		// Check length of posts and differentiate between charsByPost and charsByThread 
		let newCharacters = 0
		let repliesWithText = 0
		for(let i = 0; i < thread.posts.length; i++){ // skip the OP post
			const post = thread.posts[i]
			if(!post.com) post.com = ""
			if(board == "p") post.com = post.com.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
			post.com = post.com.replace(/<a.*?<\/a>|<br>/gm," ") //replace post-links and linebreaks with a space
			post.com = post.com.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
			post.com = entities.decode(post.com) //convert html entities to actual characters: "&gt;" becomes ">"
			post.com = post.com.trim() //remove whitespace from start and end
			if(post.com){
				newCharacters += post.com.length
				if (i == 0){
					metaData.OPCharacters.push(post.com.length)
				}else{
					repliesWithText++
				}
			}
			//if(board == "p") console.log(post.com)
			metaData.charactersByPost.push(post.com.length)

			allVisibleComments.push(post.com)
			if(post.time < commentTimeCutOff){
				oldButVisibleComments.push(post.com)
			}else{
				commentOps.push({type: 'put', key: [board,post.time,post.no], value: post.com})
			}
			
			//commentOps.push({type: 'put', key: [board,post.time,Math.random()], value: post.com})
			//commentOps.push({type: 'put', key: [board,post.time,Math.random()], value: post.com})
		}
		metaData.charactersByThread.push(newCharacters / thread.posts.length)
		metaData.repliesWithText.push(repliesWithText)

		metaData.threadAgeHours.push(threadAge / 3600)
		metaData.repliesPerMinute.push(OP.replies / (threadAge / 60))
		metaData.postersPerThread.push(OP.unique_ips)
		metaData.postsByPoster.push(thread.posts.length / OP.unique_ips)

		//if(isNaN(OP.replies / (threadAge / 60))) console.log(OP.replies,threadAge,OP.time)
	}	

	console.log("visible",allVisibleComments.length)
	console.log("recent",commentOps.length)
	console.log("old",oldButVisibleComments.length)

	try{
		//TODO: make async in the future
		//console.time("commentOps")
		await commentsDB.batch(commentOps)
		await metaDataDB.put([board,snapTime],{
			snapTime,
			duration,
			metaData
		})
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
	return {
		metaData,
		allVisibleComments,
		oldButVisibleComments
	}
}

module.exports = main