const fs = require("fs")
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const main = async (board = "") => {
	if(!fs.existsSync(__dirname + `/../rawData/${board}.json`)) return

	const metaDataDB = low(new FileSync(__dirname + `/../analysis/${board}_metadata.json`))
	const commentDataDB = low(new FileSync(__dirname + `/../analysis/${board}_comments.json`))
	const rawDataDB = low(new FileSync(__dirname + `/../rawData/${board}.json`)).value()

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
	const comments = {}
  
	for(let threadNum in rawDataDB){
		//console.log(board,threadNum)
		const thread = rawDataDB[threadNum]
		const OP = thread.posts[0]
		if(OP.closed || OP.sticky) continue
		const threadAge = thread.posts[thread.posts.length - 1].time - OP.time
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
		comments[threadNum] = []
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
			comments[threadNum].push(post.com)
		}
		metaData.charactersByThread.push(newCharacters / thread.posts.length)
		metaData.repliesWithText.push(repliesWithText)

		metaData.threadAgeHours.push(threadAge / 3600)
		metaData.repliesPerMinute.push(OP.replies / (threadAge / 60))
		metaData.postersPerThread.push(OP.unique_ips)
		metaData.postsByPoster.push((OP.replies + 1) / OP.unique_ips)
	}
	console.log(`✅   /${board}/ data extraction done`)

	metaDataDB.setState(metaData).write()
	commentDataDB.setState(comments).write()
}

module.exports = main