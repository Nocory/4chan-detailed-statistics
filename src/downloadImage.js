const pino = require("./pino")
const db = require("./db")
const axios = require("axios").create({
	timeout: 2000,
	responseType:'stream',
	validateStatus: function(status) {
		return status === 200
	}
})
const fs = require("fs")

const queue = []
const queueLimit = 1000
const inProgress = new Set()
const inProgressLimit = 5

const checkDBHasHash = md5 => {
	return new Promise((resolve,reject) => {
		db.imagesDB.get(md5)
			.then(() => {
				resolve(true)
			})
			.catch(err => {
				if(err.notFound){
					resolve(false)
				}else{
					reject(err)
				}
			})
	})
}

const download = (board,md5,tim,ext) => {
	return new Promise((resolve,reject) => {
		axios.get(`https://i.4cdn.org/${board}/${tim}s.jpg`)
			.then(res => {
				const filename = md5.replace(/\//g,"-")
				res.data.pipe(
					fs.createWriteStream(__dirname + `/../images/${filename}_thumb.jpg`)
						.on("close",() => {
							db.imagesDB.put(md5,"").catch(pino.error)
							resolve()
						})
				)
			})
			.catch(reject)
	})
}

const processQueue = async () => {
	/*
	if(!queue.length){
		clearInterval(intervalTimer)
		intervalTimer = null
		return
	}
	*/

	
	if(inProgress.size >= inProgressLimit){
		pino.warn("processQueue called, but already at the limit!")
		return
	}
	if(!queue.length){
		pino.warn("processQueue called, but there is no item available!")
		return
	}
	const queueItem = queue.shift()
	const md5 = queueItem[1]
	inProgress.add(md5)
	pino.debug(`Image DL -> Queue: ${queue.length} inProgress: ${inProgress.size}`)
	try{
		const hashIsInDB = await checkDBHasHash(md5)
		if(!hashIsInDB) await download(...queueItem)
	}catch(err){
		pino.error(err.message)
	}finally{
		inProgress.delete(md5)
		if(queue.length && inProgress.size < inProgressLimit) processQueue()
	}
}

const main = (board,md5,tim,ext) => {
	if(queue.length < queueLimit){
		queue.push([board,md5,tim,ext])
	}else{
		pino.error("Image queue is at limit !!!")
	}
	if(queue.length && inProgress.size < inProgressLimit) processQueue()
	/*
	if(!intervalTimer){
		intervalTimer = setInterval(processQueue,2)
	}
	*/
}

module.exports = main