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
			card.find('.hoop-img-cover div').text('wifi_off')
			card.addClass("disconnected")
		}else{
			card.removeClass('disconnected')
			card.find('.hoop-img-cover div').text('hourglass_top')
		}

		if(hoopHouse.image){
			setImage(card, hoopHouse.image)
		}
		
	})
}

window.setTimeout(()=>{
	updatePreviewCards()
},30*1000)
updatePreviewCards()

function inflatePreviewCard(){
	let newCard = $(`<section class="hoophouse-card loading">
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
	$('.page.overview .card-preview-zone').append(newCard)
	newCard.on('click', previewCardClick)
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


var hideTimeout = -1

function setConnectionStatusDisplay(content, error){
	if(hideTimeout>=0){
		clearTimeout(hideTimeout)
	}
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

var watchedID = -1

function previewCardClick(){
	watchedID = $(this).index('.hoophouse-card')
	//tell the server we're watching
	sendMessage({type:"watching", index: watchedID})
	$('.page.details .hoop-img')[0].src = ''
	$('.page.details .hoop-img-cover').addClass('loading')
	updateWatch()
	toPageRight('.page.details')
}

function exitWatch(){
	sendMessage({type:"not watching"})
	watchedID = -1
	toPageLeft('.page.overview')
}

function updateWatch(){
	let house = houses[watchedID]
	$('.page.details .temp').text(house.temperature)
	$('.page.details .humid').text(house.humidity)

	$('.page.details h1').text(house.name)

	$('.door-button').removeClass('door-closed door-open')
	$('.door-button').addClass(house.doorOpen? 'door-open' : 'door-closed')
	$('.door-button').children().remove()
	$('.door-button').append(inflateChip("sensor_door", house.doorOpen? 'Open' : 'Closed').css('justify-content', 'center'))

	$('.auto-button').removeClass('door-auto door-manual')
	$('.auto-button').addClass(house.auto? 'door-auto' : 'door-manual')

	$('.auto-status').text(house.auto? "ON" : "OFF")

	$('.page.details .last-update-text').text("Last updated: " + produceLastUpdateString(new Date().getTime() - house.lastUpdate))

	$('.auto-button').add('.door-button').prop('disabled', !house.connected||(ws==null))

	if(house.image){
		setImageWatched(house.image)
	}

	if(!house.connected){
		$('.page.details .hoop-img-cover div').text('wifi_off')
		$('.page.details .hoop-img-cover').addClass("disconnected")
	}else{
		$('.page.details .hoop-img-cover div').text('hourglass_top')
		$('.page.details .hoop-img-cover').removeClass("disconnected")
	}
}


function openSettingsForCurrentWatch(){
	toPageRight('.page.detail-settings')
	$('#house-name').val(houses[watchedID].name)
	$('#house-target').val(houses[watchedID].config.targethumid)
	$('#house-min').val(houses[watchedID].config.mintemp)
	$('#house-max').val(houses[watchedID].config.maxtemp)
	$('.save-button').prop('disabled', false)
}
function closeAndSaveSettings(){
	okayStatus = "save"
	$('.save-button').prop('disabled', true)
	setConnectionStatusDisplay(inflateChip("cloud_sync","Saving..."), true)
	window.setTimeout(()=>{
		sendMessage({
			type: "save", 
			index: watchedID,
			targethumid: $('#house-target').val(),
			mintemp: $('#house-min').val(),
			maxtemp: $('#house-max').val(),
			name: $('#house-name').val()
		})
	},100)
	
}
function closeAndDiscardSettings(){
	toPageLeft('.page.details')
}

function toggleAutoForWatched(){
	if(watchedID > -1){
		sendMessage({type:"toggle auto", index: watchedID})
	}
}
function toggleDoorForWatched(){
	if(watchedID > -1){
		sendMessage({type:"toggle door", index: watchedID})
	}
}

//#region page stuff
function toPageRight(pageSelector){
	$('.page.current').addClass("off-left")
	window.setTimeout(()=>{
		$('.page.current').css('display','none').removeClass('current')
		$(pageSelector).css('display','').width()
		$(pageSelector).removeClass('off-right').addClass('current')
	},300)
}
function toPageLeft(pageSelector){
	$('.page.current').addClass("off-right")
	window.setTimeout(()=>{
		$('.page.current').css('display','none').removeClass('current')
		$(pageSelector).css('display','').width()
		$(pageSelector).removeClass('off-left').addClass('current')
	},300)
}


//#endregion



//#region the websocket code
var ws = null
var connectionFails = 0
var okayStatus = "connecting"


function tryConnect(){
	if(!navigator.onLine){
		setConnectionStatusDisplay(inflateChip("wifi_off","You're offline."), true)
		window.ononline = ()=>{
			setConnectionStatusDisplay($('<p>Reconnecting...</p>'))
			tryConnect()
			window.ononline = undefined
		}
		return
	}
	try {
		okayStatus = "connecting"
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
			setConnectionStatusDisplay(inflateChip("block","Server has rejected this client due to a protocol issue. Ensure you are on the latest version, or refer to manual.").css("white-space","initial"), true)
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
	$('.auto-button').add('.door-button').prop('disabled', true)
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
			sendMessage({type:"am client"})
		}
	}else if(message.type=="ok, go"){
		setConnectionStatusDisplay(inflateChip("sync","Syncing...").css("white-space","initial"),false)
		beginNormalCommunication()
	}else if(message.type=="error"){
		ws.close(4002,"Lol, what?")
	}
}

function beginNormalCommunication(){
	connectionFails = 0
	ws.onclose = handleClose
	ws.onmessage = handleMessage

	window.setTimeout(()=>{
		sendMessage({type:"list all"})
		if(watchedID>=0){
			sendMessage({type:"watching", index: watchedID})
		}
	},300)
}

function handleClose(){
	setConnectionStatusDisplay(inflateChip("cloud_off","Disconnected"), true)
	window.setTimeout(()=>{
		setConnectionStatusDisplay($('<p>Reconnecting...</p>'))
		tryConnect()
	},3000)
	ws = null
}

function handleMessage(event){
	let message = receiveMessage(event)
	console.log(message)
	switch (message.type) {

		case "house":
			houses[message.index] = message.hoop
			updatePreviewCards()
			if(message.index == watchedID) {
				updateWatch()
			}
			sendMessage({type: "get image", index: message.index}) //request image
			break;

		case "done":
			if(okayStatus=="connecting"){
				connectionStatusDone("Connected")
			}else if(okayStatus=="save"){
				connectionStatusDone("Saved")
				toPageLeft('.page.details')
			}
			break;
			
		case "please reload":
			ws.onclose = undefined
			ws.close()
			setConnectionStatusDisplay(inflateChip("refresh","Please refresh").css("white-space","initial"), true)
			break;

		case "image":
			houses[message.index].image = message.image
			updatePreviewCards()
			if(watchedID>=0){
				updateWatch()
			}
			break;
		default:
			break;
	}
}

function connectionStatusDone(text){
	if(!$('.connection-status').hasClass('hidden')){
		setConnectionStatusDisplay(inflateChip("done",text),false)
		hideTimeout = setTimeout(()=>{
			dismissConnectionStatusDisplay()
		},2000)
	}
}
//#endregion

function setImage(card, newImage){ //TODO ANIM STUFF
	let image = $(card.find('.hoop-img')[0])

	if($('.page.overview').hasClass('off-left')||$('.page.overview').hasClass('off-right')){
		//Skip the animation
		card.removeClass('loading')
		image[0].src = newImage
		return
	}
	//Otherwise, continute to do the animation
	let currentHeight = image.parent().height()
	image.parent().css('height', currentHeight)
	image[0].src = newImage
	window.setTimeout(()=>{ //let the image load
		image.parent().animate({height: image.height()},()=>{
			image.parent().css('height','')
		})
		card.removeClass('loading')
	}, 100)
}
function setImageWatched(newImage, doTry=true){ //TODO ANIM STUFF
	let image = $($('.page.details .hoop-img')[0])

	if($('.page.details').hasClass('off-left')||$('.page.details').hasClass('off-right')){
		//Skip the animation
		if(doTry){
			window.setTimeout(()=>{
				setImageWatched(newImage, false)
			},500)//Try again in a second
		}
		return
	}
	//Otherwise, continute to do the animation
	let currentHeight = image.parent().height()
	image.parent().css('height', currentHeight)
	image[0].src = newImage
	window.setTimeout(()=>{ //let the image load
		image.parent().animate({height: image.height()},()=>{
			image.parent().css('height','')
		})
		image.siblings().removeClass('loading')
	}, 100)
}

setConnectionStatusDisplay($('<p>Connecting...</p>'))
tryConnect()








var knockPattern = [0]
function knock() {
	let now = new Date().getTime()
	if(now - knockPattern[knockPattern.length-1] > 2000){
		knockPattern.length = 0
	}
	knockPattern.push(now)
	for (let i = 0; i < knockPattern.length-1; i++) {
		console.log(knockPattern[i+1] - knockPattern[i]);
	}
	if(knockPattern.length == 5){
		let first = knockPattern[1] - knockPattern[0]
		let second = knockPattern[2] - knockPattern[1]
		let third = knockPattern[3] - knockPattern[2]
		let fourth = knockPattern[4] - knockPattern[3]
		if(first>360&&second<200&&third>300&&fourth<200){

			$('.page.knock input[type="number"]').prop('max', houses.length-1)

			let list = $('#debug-list')
			list.children().remove()
			list.append(`<p>Houses</p><hr>`)
			houses.forEach((house)=>{
				list.append(`<p><b>${houses.indexOf(house)}</b>: ${house.name} <small>${house.id}</small></p>`)
			})
			list.append(`<hr>`)

			toPageRight('.page.knock')
		}else{
			knockPattern.length=0
		}
	}
	console.log(knockPattern)
	console.log(knockPattern)
}

function ADVsendSwap(){
	sendMessage({type:"adv swap houses", a:$('#adv-swap-a').val(),b:$('#adv-swap-b').val()})
}

function ADVsendUnregister(){
	sendMessage({type:"adv unregister", index:$('#adv-nuke').val()})
}