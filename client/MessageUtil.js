module.exports.sendTo = function(ws, data, key){
	if(key){
		throw new Error("Key use is currently unimplemented!")
	}else{
		ws.send(JSON.stringify(data))
	}
}

module.exports.decodeFrom = function(data, key){
	if(key){
		throw new Error("Key use is currently unimplemented!")
	}else{
		let decodedObject
		try {
			decodedObject = JSON.parse(data)
		} catch (error) {
			console.error(error.stack)
			decodedObject = {type:"error"}
		}
		return decodedObject
	}
}