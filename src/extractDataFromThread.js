const pino = require("./pino")

const extractDataFromPost = require("./extractDataFromPost")
const db = require("./db")

const main = (board,thread,existingThread) => {
	const OP = thread.posts[0]

	const lastCheckPostNums = existingThread ? new Set(existingThread["__postNums"]) : new Set()
	const deletedPostNums = existingThread ? new Set(existingThread["__deletedPostNums"]) : new Set()

	OP["__postNums"] = []
	OP["__deletedPostNums"] = []
	//OP["__lastModified"] = 0
	//OP["__lastModified"] = thread.posts[thread.posts.length - 1].time
	const postBatchOps = []

	for(let post of thread.posts){
		OP["__postNums"].push(post.no)
		//OP["__lastModified"] = Math.max(OP["__lastModified"],post.time)
		if(!lastCheckPostNums.has(post.no)){
			const postData = extractDataFromPost.extract(board,post)
			postBatchOps.push({
				type: "put",
				key: [board,post.no],
				value: postData
			})
		}else{
			lastCheckPostNums.delete(post.no)
		}
	}
	OP["__postNums"].push(...lastCheckPostNums)
	OP["__deletedPostNums"].push(...lastCheckPostNums)
	pino.debug(`/${board}/ batching ${postBatchOps.length} new posts to DB`)
	if(lastCheckPostNums.size != deletedPostNums.size) pino.debug(`/${board}/ #${OP.no} ${lastCheckPostNums.size - deletedPostNums.size} deleted`)
	db.postsDB.batch(postBatchOps).catch(console.error)
	//db.threadsDB.put([board,OP.no],OP).catch(console.error)

	return OP
}

module.exports = main