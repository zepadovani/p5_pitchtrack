/**
 *  Pitch Detection using Auto Correlation.
 *
 *  Auto correlation multiplies each sample in a buffer by all
 *  of the other samples. This emphasizes the fundamental
 *  frequency.
 *
 *  Running the signal through a low pass filter prior to
 *  autocorrelation helps bring out the fundamental frequency.
 *
 *  The visualization is a correlogram, which plots
 *  the autocorrelations.
 *
 *  We calculate the pitch by counting the number of samples
 *  between peaks.
 *
 *  Example by Jason Sigal and Golan Levin.
 */

let source, fft, lowPass;

// center clip nullifies samples below a clip amount
var doCenterClip = false;
var centerClipThreshold = 0.0;

// normalize pre / post autocorrelation
var preNormalize = true;
var postNormalize = true;
var numnotes = 127;
var width;
var height;
var nota = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
var oct = [-1,0,1,2,3,4,5,6,7,8,9];
let pvals = [];
var ix = 0;
let lastix;
var padleft = 40;
var wpadleft;
let level,amplitude;
var levelthreshold = 0.02;

function setup() {
  var canvas = createCanvas(1280, 720);
  width = 1280;
  height = 720;
  canvas.parent('sketchdiv');
  wpadleft = width-padleft;


  for (let i = 0; i < wpadleft; i++) {
    pvals[i] = 0;
  }

  source = new p5.AudioIn();
  source.start();

  amplitude = new p5.Amplitude();
  amplitude.setInput(source);
  amplitude.smooth(1);

  lowPass = new p5.LowPass();
  lowPass.disconnect();
  source.connect(lowPass);

  fft = new p5.FFT();
  fft.setInput(lowPass);
}

function draw() {
  var timeDomain = fft.waveform(1024, 'float32');
  var corrBuff = autoCorrelate(timeDomain);
  var freq = findFrequency(corrBuff);
  var note = noteFromPitch(freq);
  let level = amplitude.getLevel();

  strokeWeight(1);
  ix = (ix+1)%wpadleft;
  background(255);
  stroke(200);
  var up=0;
  var noteheight = (height/numnotes);
  for (var i = 0 ; i < numnotes; i++){
    if((i%12==0)||(i%12==2)||(i%12==4)||(i%12==5)||(i%12==7)||(i%12==9)||(i%12==11)){
      fill(240);
    }
    else
    {fill(210);};
    stroke(200);
    rect(0,height - ((noteheight*(i+1))+up), width, noteheight);
    if(i%12==0){
      stroke(0);
      line(0,height - ((noteheight*(i))+up),width,height - ((noteheight*(i))+up));
    };
  }

  for (var i=0; i < numnotes; i++){
    var pc = i%12;
    var thistext = nota[pc] + str(floor(i/12)-1);
    var xpos;
    textSize((height/720)*5);
    fill(40);
    if((pc==0)||(pc==2)||(pc==4)||(pc==5)||(pc==7)||(pc==9)||(pc==11)){
      xpos = 10;

    }
    else
    {
    xpos = 20;
    };

    text(thistext,xpos,height - ((noteheight*i)+1));
    //text(thistext,10,height - ((noteheight*i)+1));
  }
  noFill();

  // array of values from -1 to 1

  if(level>levelthreshold){
  pvals[ix] = note;}
  else{pvals[ix] = 0};
  console.log(level);






  //stroke(0);
  //strokeWeight(2);
  // beginShape();
  // for (var i = 0; i < (width-padleft); i++) {
  //   var w = i+padleft;
  //   var h = map(pvals[i], 0, 127, height, 0);
  //   curveVertex(w, h);
  // }
  // endShape();

  var amp = map(level,0,0.5,100,0);
  stroke(amp);
  strokeWeight(1.5);
  for (var i = 0; i < wpadleft; i++) {
    var hval = pvals[i];
    var lval1 = pvals[(i-1)%wpadleft];
    var w = i+padleft;
    var h = map(pvals[i], 0, 127, height, 0);

    if((hval>0)&&((lval1==0)||(i==0))){
      beginShape();
    };

    if(hval>0){
      curveVertex(w, h);
    };

    if((hval==0)&&(lval1>0)){
      endShape();
    }

    if((hval>0)&&(i==(wpadleft-1))){
      endShape();
    }


    //point(w, h);
  }


  lastix = ix;

  //
  // fill(0);
  // text ('Center Clip: ' + centerClipThreshold, 20, 20);
  // //line (0, height/2, width, height/2);
  //
  //
  // text ('Fundamental Frequency: ' + freq.toFixed(2), 20, 50);
}



// accepts a timeDomainBuffer and multiplies every value
function autoCorrelate(timeDomainBuffer) {

  var nSamples = timeDomainBuffer.length;

  // pre-normalize the input buffer
  if (preNormalize){
    timeDomainBuffer = normalize(timeDomainBuffer);
  }

  // zero out any values below the centerClipThreshold
  if (doCenterClip) {
    timeDomainBuffer = centerClip(timeDomainBuffer);
  }

  var autoCorrBuffer = [];
  for (var lag = 0; lag < nSamples; lag++){
    var sum = 0;
    for (var index = 0; index < nSamples-lag; index++){
      var indexLagged = index+lag;
      var sound1 = timeDomainBuffer[index];
      var sound2 = timeDomainBuffer[indexLagged];
      var product = sound1 * sound2;
      sum += product;
    }

    // average to a value between -1 and 1
    autoCorrBuffer[lag] = sum/nSamples;
  }

  // normalize the output buffer
  if (postNormalize){
    autoCorrBuffer = normalize(autoCorrBuffer);
  }

  return autoCorrBuffer;
}


// Find the biggest value in a buffer, set that value to 1.0,
// and scale every other value by the same amount.
function normalize(buffer) {
  var biggestVal = 0;
  var nSamples = buffer.length;
  for (var index = 0; index < nSamples; index++){
    if (abs(buffer[index]) > biggestVal){
      biggestVal = abs(buffer[index]);
    }
  }
  for (var index = 0; index < nSamples; index++){

    // divide each sample of the buffer by the biggest val
    buffer[index] /= biggestVal;
  }
  return buffer;
}

// Accepts a buffer of samples, and sets any samples whose
// amplitude is below the centerClipThreshold to zero.
// This factors them out of the autocorrelation.
function centerClip(buffer) {
  var nSamples = buffer.length;

  // center clip removes any samples whose abs is less than centerClipThreshold
  centerClipThreshold = map(mouseY, 0, height, 0,1);

  if (centerClipThreshold > 0.0) {
    for (var i = 0; i < nSamples; i++) {
      var val = buffer[i];
      buffer[i] = (Math.abs(val) > centerClipThreshold) ? val : 0;
    }
  }
  return buffer;
}

// Calculate the fundamental frequency of a buffer
// by finding the peaks, and counting the distance
// between peaks in samples, and converting that
// number of samples to a frequency value.
function findFrequency(autocorr) {

  var nSamples = autocorr.length;
  var valOfLargestPeakSoFar = 0;
  var indexOfLargestPeakSoFar = -1;

  for (var index = 1; index < nSamples; index++){
    var valL = autocorr[index-1];
    var valC = autocorr[index];
    var valR = autocorr[index+1];

    var bIsPeak = ((valL < valC) && (valR < valC));
    if (bIsPeak){
      if (valC > valOfLargestPeakSoFar){
        valOfLargestPeakSoFar = valC;
        indexOfLargestPeakSoFar = index;
      }
    }
  }

  var distanceToNextLargestPeak = indexOfLargestPeakSoFar - 0;

  // convert sample count to frequency
  var fundamentalFrequency = sampleRate() / distanceToNextLargestPeak;
  return fundamentalFrequency;
}

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	//return Math.round( noteNum ) + 69;
	return noteNum + 69;
}

function touchStarted() { getAudioContext().resume(); }
