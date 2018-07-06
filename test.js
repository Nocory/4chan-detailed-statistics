const pino = require("./src/pino")

const snapperAddr = "http://95.179.161.197:8080"

const snapperIO = require('socket.io-client')(snapperAddr,{
	transports: ['websocket']
})

let snapshotMetaAnalysis = {}
let snapshotTextAnalysis = {}

snapperIO.on("connect", () => {
	pino.info("✓✓✓ snapperIO connected to %s",snapperAddr)
})

snapperIO.on("disconnect", reason => {
	pino.error("snapperIO disconnected from %s - %s",snapperAddr,reason)
})

snapperIO.on("initialData", initialData => {
	pino.info("✓✓✓ snapperIO received initialData")
	snapshotMetaAnalysis = initialData.snapshotMetaAnalysis
	snapshotTextAnalysis = initialData.snapshotTextAnalysis
})

snapperIO.on("update", update => {
	pino.debug("snapperIO received update")
	snapshotMetaAnalysis[update.board] = update.snapshotMetaAnalysis
	snapshotTextAnalysis[update.board] = update.snapshotTextAnalysis
})

/*
app.get('/snapshotMetaAnalysis', (req, res) => {
	res.send(snapshotMetaAnalysis)
})

app.get('/snapshotMetaAnalysis/:board', (req, res) => {
	res.send(snapshotMetaAnalysis[req.params.board])
})

app.get('/snapshotTextAnalysis', (req, res) => {
	res.send(snapshotTextAnalysis)
})

app.get('/snapshotTextAnalysis/:board', (req, res) => {
	res.send(snapshotTextAnalysis[req.params.board])
})
*/