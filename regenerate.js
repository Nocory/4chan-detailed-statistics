const config = require("./src/config")
const analyze = require("./analyze")

const main = async () => {
	for(let board of config.boards){
		await analyze(board,null,true)
	}
}

if(require.main === module){
	main()
}

module.exports = main