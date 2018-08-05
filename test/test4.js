const leveldown = require("leveldown")
const db = leveldown("database")
db.open(() => {
	db.compactRange("","~",console.log)
})

