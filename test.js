const fs = require("fs")

if (!fs.existsSync("db_get")){
	fs.mkdirSync("db_get")
}

const files = fs.readdirSync("db_get")

console.log(files)

const axios = require("axios")

const main = async () => {
	const allBoards = require("./config.js").boards
	console.log(allBoards)
}

main()