const cp = require('child_process')
const n = cp.fork(`${__dirname}/test_child.js`)

n.on('message', m => {
	console.log('PARENT got message:', m)
})

// Causes the child to print: CHILD got message: { hello: 'world' }
n.send([
	{ hello: 'world' },
	{ hello: 'moon' }
])