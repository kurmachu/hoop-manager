const SERVER_SOCKET_ADDRESS = "ws://localhost:3994"

var houses = []

function updatePreviewCards(){
	houses.forEach((hoopHouse, i)=>{
		let card
		if (i<$('.hoophouse-card').length){
			card = $($('.hoophouse-card')[i])
		}else{
			card = inflatePreviewCard()
		}

		card.find('h1').text(hoopHouse.name)
		card.find('.temp').text(hoopHouse.temperature)
		card.find('.humid').text(hoopHouse.humidity+"%")

		card.find('.last-update-text').text("Last updated: " + produceLastUpdateString(new Date().getTime() - hoopHouse.lastUpdate))

		let chips = card.find('.card-status-chips')
		chips.children().remove()

		chips.append(inflateChip("sensor_door",hoopHouse.doorOpen? "Open" : "Closed", hoopHouse.doorOpen? "door-open" : "door-closed"))
		chips.append(inflateChip(hoopHouse.auto? "settings_suggest" : "gamepad",hoopHouse.auto? "Auto" : "Manual", hoopHouse.auto? "door-auto" : "door-manual"))
		if(!hoopHouse.connected){
			chips.append(inflateChip("wifi_off","Disconnected", "chip-disconnected"))
			card.find('.hoop-img-cover div').text('wifi_off').fadeIn()
		}
		
	})
}

window.setTimeout(()=>{
	updatePreviewCards()
},30*1000)
updatePreviewCards()

function inflatePreviewCard(){
	let newCard = $(`<section class="hoophouse-card">
						<div class="hoop-img-container">
							<img class="hoop-img" src="" alt="">
							<div class="hoop-img-cover">
								<div class="material-icons">hourglass_top</div>
							</div>
						</div>
						<div class="card-info">
							<div class="split-panel mostly-left">
								<div class="left">
									<h1>...</h1>
								</div>
								<div class="right" style="text-align: end;">
									<div class="readouts">
										<div class="readout"><span class="material-icons">thermostat</span><span class="temp">..</span></div>
										<div class="readout"><span class="material-icons">water_drop</span><span class="humid">..</span></div>
									</div>
									
								</div>
							</div>
							<div class="card-status-chips">
								<p>...</p>
							</div>
							<p class="last-update-text">Updating...</p>
						</div>
					</section>`)
	$('.page.overview > .coltainer').append(newCard)
	return newCard
}

function inflateChip(icon, text, cssClass) {
	return $(`<span class="status-chip ${cssClass}"><span class="material-icons">${icon}</span><span>${text}</span></span>`)
}

function produceLastUpdateString(time){
	if (time < 10*1000){
		return "Just now"
	}else if (time < 60*1000){
		return "This minute"
	}else if (time < 2 * 60 * 1000) {
		return "A minute ago"
	}else if (time < 60 * 60 * 1000) {
		return `${Math.floor(time/(60*1000))} minutes ago`
	}else if (time < 2 * 60 * 60 * 1000){
		return `An hour ago`
	}else if (time < 24 * 60 * 60 * 1000){
		return `${Math.floor(time/(60 * 60 * 1000))} hours ago`
	}else if (time < 2 * 24 * 60 * 60 * 1000){
		return `A day ago`
	}else if (time < 7 * 24 * 60 * 60 * 1000){
		return `${Math.floor(time/(24 * 60 * 60 * 1000))} days ago`
	}else if (time < 2 * 7 * 24 * 60 * 60 * 1000){
		return `Over a week ago`
	}else{
		return `A long time ago`
	}
}

function setConnectionStatusDisplay(content, error){
	let chip = $('.connection-status')
	chip.stop()

	if(chip.hasClass('hidden')){

		chip.removeClass('error')
		chip.children().remove()
		chip.append(content)
		if(error){
			chip.addClass('error')
		}
		chip.removeClass('hidden')

	}else{
		chip.css('width',"")
		chip.css('height',"")
		let oldWidth = chip.innerWidth()
		let oldHeight = chip.innerHeight()
		let oldChildren = chip.children()
		chip.children().remove()
		chip.append(content)
		let newWidth = chip.innerWidth()
		let newHeight = chip.innerHeight()
		chip.children().remove()
		chip.append(oldChildren)
		chip.children().fadeOut(200,()=>{
			chip.css('width', oldWidth)
			chip.css('height', oldHeight)
			chip.animate({width: newWidth, height: newHeight},200,()=>{
				chip.css('width',"")
				chip.css('height',"")
			})
			chip.children().remove()
			chip.append(content)
			chip.children().css('display','none')
			chip.children().fadeIn(200)
			if(chip.hasClass('error')!=error){chip.toggleClass('error')}
		})
	}
}

function dismissConnectionStatusDisplay(){
	let chip = $('.connection-status')
	chip.addClass('hidden')
}



//#region the websocket code
var ws = null
var connectionFails = 0
function tryConnect(){
	try {
		ws = new WebSocket(SERVER_SOCKET_ADDRESS)
		// ws.onerror = handleInitialFail
		ws.onclose = handleInitialKick
		ws.onmessage = handleHandshake
		
	} catch (e){
		console.error(e.stack)
		setConnectionStatusDisplay(inflateChip("error_outline","Could not open WebSocket.<br>This is an unrecoverable error.<br>Check manual for more information.").css("white-space","initial"), true)
	}
}

function handleInitialKick(info){
	console.warn(info)
	if(info.code == 4002){
		if(info.reason == "Failed to identify"){
			setConnectionStatusDisplay(inflateChip("block","Server has rejected this client due to a protocal issue. Ensure you are on the latest version, or refer to manual.").css("white-space","initial"), true)
		}else if(info.reason == "Lol, what?"){
			setConnectionStatusDisplay(inflateChip("block","Failed to understand the server. Refer to manual.").css("white-space","initial"), true)
		}
	}else{
		handleInitialFail()
	}
}
function handleInitialFail(){
	connectionFails++
	setConnectionStatusDisplay(inflateChip("cloud_off","Connection failed"), true)
	window.setTimeout(()=>{
		if(connectionFails < 3){
			setConnectionStatusDisplay($('<p>Trying again...</p>'))
			tryConnect()
		}else{
			setConnectionStatusDisplay(inflateChip("cloud_off","Server unavailable. Try again later.").css("white-space","initial"), true)
		}
		
	},3000)
	ws = null
}

function receiveMessage(message){
	try {
		return JSON.parse(message.data)
	}catch (e){
		console.error(e.stack)
		return {type:"error"}
	}
}
function sendMessage(object){
	//TODO: key stuff
	if(ws != null){
		ws.send(JSON.stringify(object))
	}
}

function handleHandshake(event){ //TODO: key stuff
	let message = receiveMessage(event)
	if(message.type=="hello"){
		if(message.useIdentification){
			ws.onclose = null;
			
			setConnectionStatusDisplay(inflateChip("vpn_key_off","Server requires a feature this client does not support. Refer to manual.").css("white-space","initial"), true)
			ws = null
		}else{
			sendMessage({type:"am-client"})
		}
	}else if(message.type=="ok, go"){
		setConnectionStatusDisplay(inflateChip("sync","Syncing...").css("white-space","initial"),false)
	}else if(message.type=="error"){
		ws.close(4002,"Lol, what?")
	}
}
//#endregion

setConnectionStatusDisplay($('<p>Connecting...</p>'))
tryConnect()