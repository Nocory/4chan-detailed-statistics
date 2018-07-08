const db = require('level')('./db', {
	keyEncoding: require("charwise"),
	valueEncoding: "json",
	cacheSize: 256 * 1024 * 1024
})

const sub = require('subleveldown')

const db1 = sub(db,"threads")
const db2 = sub(db,"threads2")

//const data = "nd89s7gfzg!!8s7df*".repeat(1000)
const data = 123

const main = async () => {
	await db.put("ttt7",data)
	const res = await db.get("ttt7")
	console.log(typeof res)  
	console.log(res)
}

main()

/*
const bw = require("bytewise")
const cw = require("charwise")

console.log(bw.encode("test"))
console.log(bw.encode(123444))
console.log(cw.encode("test"))
console.log(cw.encode(123444))
*/