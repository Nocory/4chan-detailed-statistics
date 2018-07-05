const pino = require("pino")({
	name: 'snapper',
	safe: true,
	//prettyPrint: process.env.NODE_ENV != "production",
	prettyPrint: true,
	level: process.env.PINO_LEVEL || (process.env.NODE_ENV == "production" ? "info" : "trace"),
	base: null
})

module.exports = pino