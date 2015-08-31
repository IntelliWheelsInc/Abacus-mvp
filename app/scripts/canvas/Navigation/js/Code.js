

var span = document.getElementById("nav_span"); //Div DOM Elment
span.style.visibility = "hidden";
var margin = 4;                                 // Margin Between Arrows
var customArrows = new Array();
var measureArrows = new Array();
var arrows = null;
var myScope;
var arrowFocus = null;
var focusedIndex = 0;   //TODO OBSOLETE
var mBtn;
var cBtn;
var pageType = "CUSTOMIZE"; //TODO OBSO
var tweenSpeed = 800;
var tweenType = createjs.Ease.getElasticInOut(2, 5);
var arrowWidth = 70;  //TODO OBSOLETE
var lastCustomArrow;  //TODO OBSO
var lastMeasureArrow; //TODO OBSO
var done_txt;          //complete percentage
var ratio = $(window).width() * 0.9 /1280;
var minRatio = 1185 * 0.9 / 1280;
if($(window).width() > 1185) {
  var ARROW_WIDTH = 90 * ratio;                           // "Arrows WIDTH"
  var spanShift = 150 * ratio;
  var measureShift = 320 * ratio;
  var customizeShift = 150 * ratio;
} else {
  var ARROW_WIDTH = 90 * minRatio;                           // "Arrows WIDTH"
  var spanShift = 150 * minRatio;
  var measureShift = 320 * minRatio;
  var customizeShift = 150 * minRatio;
}

//Arrow Object, Handles all arrow eventHandlers and graphic changes.
// Image : The image of the arrow
// Name : The name of the Arrow
// Page : The page
// Custom : Is it custom or Measure

window.onresize = function(event) {
  if($(window).width() > 1185){
  ratio = $(window).width() * 0.9 /1280;
  ARROW_WIDTH = 90 * ratio;                           // "Arrows WIDTH"
  spanShift = 150 * ratio;
  measureShift = 320 * ratio;
  customizeShift = 150 *ratio;}
}
var Arrow = function(image, name, page, custom){
	this.complete = false;
	this.page = page;
	this.index = page.index;
  var index = page.index;
	this.name = name;
	this.custom = custom;
	this.mc = new lib.Arrow();
	stage.addChild(this.mc);
	if(custom){
		this.mc.x = customArrows.length*(arrowWidth+margin)+155;
	}else{
		this.mc.x = 950;
	}
	this.mc.y = 1;
	this.image = image;
	var mc = this.mc;
	mc.addEventListener("click", pressed);
	mc.addEventListener("mouseover", hover_on);
	mc.addEventListener("rollout", hover_off);

	var image = this.image;
	var me = this;
	gotoAndStop(image);
	function pressed(m){

		if(custom){
			customChanged();
			lastCustomArrow = me;
		}else{
			lastMeasureArrow = me;
		}
		focusedIndex= index;

		myScope.pageSwitchJump(page);
    //TODO better completion detection
		me.complete = true;
		calcCompleteness();

		if(custom && arrowFocus){
			arrowFocus.gotoAndStop(1);
		}
		if(!custom){
			if(arrowFocus.page.visitstatus==="visited"){
				arrowFocus.gotoAndStop(1);
			}else{
				arrowFocus.gotoAndStop(2);
			}
		}
		arrowFocus = me;

		image = 3;
		mc.gotoAndStop(image);


	}
	this.pressed = pressed;
	function hover_on(m){

		span.style.visibility = "visible";
		if(image === 4){
			mc.gotoAndStop(5);
		}
		span.innerHTML = name;
		span.style.left = spanShift+index*(ARROW_WIDTH-15)+"px";
	}
	function hover_off(m){
		mc.gotoAndStop(image);
		span.style.visibility = "hidden";
	}

	function gotoAndStop(integer){
		image = integer;
		mc.gotoAndStop(integer);
	}
	this.gotoAndStop = gotoAndStop;

	function flash(){
		mc.flasher.gotoAndPlay(1);
	}
	this.flash = flash;
}


//Initializes all the DOM Elements/MovieClips
function initStuff(container){
	done_txt = container.done;
  myScope = angular.element(document.getElementById("NavigationBar")).scope();
  done_txt.text = myScope.completePercentage()+"%";

  initArrows();
	cBtn = new lib.cBtn;
	stage.addChild(cBtn);
	cBtn.x = -20;
	cBtn.y = 1;
	mBtn = new lib.mBtn;
	stage.addChild(mBtn);
	mBtn.x = 895;
	mBtn.addEventListener("click", switchToMeasurement);
	cBtn.addEventListener("click", switchToCustomize);
	document.getElementById("NavigationBar").addEventListener("mousemove", changeCursorPointer);
	document.getElementById("NavigationBar").addEventListener("mouseout", changeCursorDefault);
	fixFirefox();
  customChanged();
  measureChanged();
  }

function initArrows(){
	var customizePages = myScope.getCustomizePages();
	var measurementPages = myScope.getMeasurePages();
	//Initialize customPages
	for(var i=0; i<customizePages.length; i++){
		if(i===0){
			var arrow = new Arrow(3, myScope.getProgressBarSegmentTooltipText(customizePages[i]),  customizePages[i], true);
			arrowFocus = arrow;
			customArrows.push(arrow);
		}else{
      var optionIndexC = myScope.curEditWheelchair.getOptionIDForPart(customizePages[i].partID);

      if (optionIndexC !== -1){
        var arrow = new Arrow(1, myScope.getProgressBarSegmentTooltipText(customizePages[i]),  customizePages[i], true);
        customArrows.push(arrow);
      }else {
        var arrow = new Arrow(2, myScope.getProgressBarSegmentTooltipText(customizePages[i]), customizePages[i], true);
        customArrows.push(arrow);
      }
		}
	}

	//Initialize measurementPages
	for(var i=0; i<measurementPages.length; i++){
		if(i===0){
			var arrow = new Arrow(3, "Rear Seat Width",  measurementPages[i], false);
			measureArrows.push(arrow);
		}else{
      var optionIndexM = myScope.curEditWheelchair.getOptionIndexForMeasure(measurementPages[i].measureID);
      if(optionIndexM !== -1){
        var arrow = new Arrow(1, myScope.getMeasurementTooltipText(measurementPages[i]), measurementPages[i], false);
        measureArrows.push(arrow);
      } else {
        var arrow = new Arrow(2, myScope.getMeasurementTooltipText(measurementPages[i]), measurementPages[i], false);
        measureArrows.push(arrow);
      }
		}
	}
	arrows = customArrows;
	lastCustomArrow = customArrows[0];
	lastMeasureArrow = measureArrows[0];
}



function changeCursorPointer(m){
	document.body.style.cursor = "pointer";
}


function changeCursorDefault(m){
	document.body.style.cursor = "default";
}

function switchToMeasurement(m){
	spanShift = measureShift;
	if(pageType === "CUSTOMIZE"){
		for(var i=0; i<customArrows.length; i++){
			createjs.Tween.get(customArrows[i].mc)
			.to({
				x: 50
			}, tweenSpeed, tweenType);
		}

		for(var i=0; i<measureArrows.length; i++){
			createjs.Tween.get(measureArrows[i].mc)
			.to({
				x: 325+i*(arrowWidth+margin)
			}, tweenSpeed, tweenType);
		}

		createjs.Tween.get(mBtn)
		.to({
			x: mBtn.x-740
		}, tweenSpeed, tweenType);
		pageType = "MEASUREMENT";
	}
	arrowFocus = measureArrows[0];
	myScope.setCurPageType(myScope.pageType.MEASURE);
	lastMeasureArrow.pressed();
	arrows = measureArrows;
}

function switchToCustomize(m){
	spanShift = customizeShift;
	if(pageType === "MEASUREMENT"){
		for(var i=0; i<customArrows.length; i++){
			createjs.Tween.get(customArrows[i].mc)
			.to({
				x: i*(arrowWidth+margin)+155
			}, tweenSpeed, tweenType);
		}

		for(var i=0; i<measureArrows.length; i++){
			createjs.Tween.get(measureArrows[i].mc)
			.to({
				x: 950
			}, tweenSpeed, tweenType);
		}

		createjs.Tween.get(mBtn)
		.to({
			x: 895
		}, tweenSpeed, tweenType);
		pageType = "CUSTOMIZE";
	}
	myScope.setCurPageType(myScope.pageType.CUSTOMIZE);
	lastCustomArrow.pressed();
	arrows = customArrows;
}



function navigateArrows(dir){
	focusedIndex += dir;
	if( focusedIndex === arrows.length ){
		switchToMeasurement(null);
		focusedIndex = 0;
	}
	if(focusedIndex === -1){
		switchToCustomize(null);
		focusedIndex=customArrows.length-1;
	}
	arrows[focusedIndex].pressed();
}



function calcCompleteness(){

	done_txt.text = myScope.completePercentage()+"%";
}




function fixFirefox(){
	var canvy = document.getElementById("NavigationBar");
	var ctx = canvy.getContext("2d");
	ctx.textBaseline = "alphabetic";
}


function highlightUnfilledArrows(){
	switchToMeasurement();
	var unFinPages = myScope.completedCheck();
	for(var i=0; i<unFinPages.length; i++){
		if(i===0){
			arrows[unFinPages[0].index].pressed();
		}
		measureArrows[unFinPages[i].index].flash();
	}
	return unFinPages.length === 0;
}


function measureChanged(){
	var unFinPages = myScope.completed();
	if(!unFinPages){
		mBtn.gotoAndStop(1);
	}
}

function customChanged(){
	var unFinPages = myScope.completedC();
	if(!unFinPages){
		cBtn.gotoAndStop(1);
	}


}
