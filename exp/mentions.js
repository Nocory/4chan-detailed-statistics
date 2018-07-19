const {visibleCache} = require("./db")

const main = async word => {
	console.time("findMentions")
	const boards = config.boards
	
	const mentions = {}
	let mentionCounter = 0
	
	for(let board of boards){
		mentions[board] = {}

		visibleCache[board].forEach((val,key) => {
			if(mentionCounter < val.includes(word)){
				mentionCounter++
				mentions[board].push([new Date(post.time * 1000),`https://boards.4chan.org/${board}/thread/${threadNum}/#p${post.no}`,post.com])
			}
		})    
    
	}

	console.timeEnd("findMentions")
	return mentions
}

module.exports = main