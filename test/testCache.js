const expressApp = require('express')()
const server = require('http').Server(expressApp)
server.listen(9090)

const cw = require("charwise")

const myEncoder = {
	encode: x => "!com!" + cw.encode(x),
	decode: x => "!com!" + cw.decode(x.slice(5)),
	buffer: false
}

const level = require('level')
const sub = require('subleveldown')

const db = level("database", {
	keyEncoding: myEncoder,
	cacheSize: 10 * 1024 * 1024
})

const commentsDB = sub(db,"com",{
	keyEncoding: require("charwise")
})

let totalSize = 0
let i = 0

const main = async () => {
	//console.log("!com!" + cw.encode(["!",123,123]))
	//console.log(myEncoder.encode(["!",123,123]))
	commentsDB.createReadStream({
		fillCache: true
	})
		.on('data', data => {
			//console.log(data)
			i++
			totalSize += data.value.length
			if(i % 10000 == 0){
				console.log(i,data.key,totalSize)
			}
		})
		.on('error', console.error)
		.on('end', function () {
			console.log(i,totalSize)
			console.log("DONE")
		})
}

const getKeys = async () => {
	const keys = []

	return new Promise((resolve,reject) => {
		commentsDB.createKeyStream({
			fillCache: true,
			//limit: 20000
		})
			.on('data', data => {
				keys.push(data)
			})
			.on('error', console.error)
			.on('end', function () {
				console.log(i,totalSize)
				console.log("DONE")
				resolve(keys)
			})
	})
}

const main2 = async () => {
	//console.log("!com!" + cw.encode(["!",123,123]))
	//console.log(myEncoder.encode(["!",123,123]))
	const keys = await getKeys()
	console.log(keys.length)
	const keyLen = keys.length
	for(let i = 0; i < keyLen;){
		const allPromises = []
		//for(let j = 0; j < 10 && i < keyLen; j++) allPromises.push(commentsDB.get(keys[i++]))
		for(let j = 0; j < 1000 && i < keyLen; j++) allPromises.push(commentsDB.get(keys[i++],{fillCache: true}))
		await Promise.all(allPromises)
		console.log("got up to", i)
	}
}

main()