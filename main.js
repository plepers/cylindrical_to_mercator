var elFileInput  = document.getElementById('file-input'),
    elImg        = document.getElementById('preview'),
    elCvsWrapper = document.getElementById('cvs-wrapper');

var outputSize = 2048;



// -------------------------
// GL setup
// -------------------------

var cvs, gl,
    prg, inputTex,
    fsGeom = {};



var vert = `
attribute vec2 aPosition;
varying vec2 vUvs;
void main( void){
  gl_Position = vec4( aPosition, 1.0, 1.0 );
  vUvs = gl_Position.xy * .5 + .5;
}


`
var frag = `
precision highp float;
uniform sampler2D uTex;

varying vec2 vUvs;

#define PI 3.14159265358979
#define E 2.718281828459045

vec2 toMercator( vec2 uvs ){
  float v = uvs.y;
  v = v * PI - PI / 2.0;
  v = sin(v);
  //v = clamp( v, -.98, .98 );
  v = log( ( 1.0 + v ) / ( 1.0 - v ) ) / ( 4.0 * PI );
  v += 0.5;

  return vec2(
    uvs.x,
    v
  );
}

vec2 toCylindric( vec2 uvs ){
  float v = uvs.y;
  v -= 0.5;
  v *= ( 4.0 * PI );
  v = pow( E, v );
  v = (1.0-v)/(1.0+v);
  v = asin( v );
  v = -v / PI + .5;
  return vec2(
    uvs.x,
    v
  );
}

void main( void){
  gl_FragColor = texture2D( uTex, toCylindric( vUvs ) );
}
`




function initGL(){

  cvs = document.createElement( 'canvas' );
  cvs.width = outputSize
  cvs.height = outputSize

  elCvsWrapper.appendChild( cvs )

  gl = cvs.getContext( 'webgl' )

  setupProgram()
  setupGeom()

}

function createInputTexture( img ){
  var tex = gl.createTexture( gl.TEXTURE_2D );
  gl.bindTexture( gl.TEXTURE_2D, tex );
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

  gl.bindTexture( gl.TEXTURE_2D, null );

  return tex;
}


function setupProgram( ){
  prg = new Program( gl, [
    'aPosition',
    'uTex'
  ]);

  prg.compile( vert, frag )
}



function setupGeom() {
  var vertices = new Float32Array( [
    -1, -1,
    1,  -1,
    1,   1,
    -1,  1
  ] );

  var indices = new Uint16Array( [
    0, 1, 2,
    0, 2, 3
  ] );

  fsGeom.buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fsGeom.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);


  fsGeom.ibuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fsGeom.ibuffer );
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null );
}


function render() {

  prg.bind();


  gl.activeTexture( gl.TEXTURE0 );
  gl.bindTexture( gl.TEXTURE_2D, inputTex );
  gl.uniform1i( prg.uTex, 0 );


  gl.bindBuffer(gl.ARRAY_BUFFER, fsGeom.buffer );
  gl.enableVertexAttribArray( prg.aPosition );
  gl.vertexAttribPointer( prg.aPosition, 2, gl.FLOAT, false, 0, 0 );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fsGeom.ibuffer );
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null );
}

// -------------------------------------
// GL SETUP END
// -------------------------------------





function main(){
  initGL()
  elFileInput.addEventListener('change', openFile, false);
}


function openFile( e ){
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = onFileOpened;
  reader.readAsDataURL(file);
}

function onFileOpened( e ){
  var contents = e.target.result;
  elImg.onload = inputLoaded;
  elImg.src = e.target.result;
}


function inputLoaded( ){
  inputTex = createInputTexture( elImg )
  render()
}

main();
