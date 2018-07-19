const sub = require('subleveldown')
const db = require('level')("database-backup", {
	keyEncoding: require("charwise"),
	valueEncoding: "json",
	cacheSize: 256 * 1024 * 1024
})
const commentsDB = sub(db,"com",{
	keyEncoding: require("charwise"),
	valueEncoding: "utf8",
	cacheSize: 256 * 1024 * 1024
})

let i = 0
let len = 0

commentsDB.createReadStream({
	gt: ["p",0,0],
	lte: ["p",Infinity,Infinity],
	fillCache: true,
	//limit: 10000
})
	.on('data', data => {
		console.log(data.key[1],data.value)
		i++
		len += data.value.length
	})
	.on('error', function (err) {
		reject(err)
	})
	.on('end', function () {
		console.log(i)
		console.log(len)
		console.log(len / i)
	})