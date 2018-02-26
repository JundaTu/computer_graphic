//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// From 2013 book "WebGL Programming Guide"
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda AND
//	Lengyel 2013 book: "Mathematics for 3D Game Programming and Computer Graphics
// 										," 3rd Ed. Chapter 4 on quaternions,
// merged and modified to became:
//
// ControlQuaternion.js for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin

//		--demonstrate several different user I/O methods: 
//				--Webpage pushbuttons and 'innerHTML' for text display
//				--Mouse click & drag within our WebGL-hosting 'canvas'
//		--demonstrate use of quaternions for user-controlled rotation
//
//	2016.02.12--In-class Activity: add basic diffuse lighting to determine
//							each vertex color.
// -----PLAN:--------------
//   	a)--Add 'surface normal' attributes to each of the vertices created in the 
//	initVertexBufferobject() function.  (Be sure you adjust the rest of the code 
//	to work properly with these new vertices that have an additional attribute).
//		(test it--in the vertex shader program, what should happen if you add a fraction
//		  of the normal vector to the position attribute for each vertex?
//			ANSWER: each face should get displaced outwards, 'exploding' the shape...
//			Bugs?  set all normals to zero except one, add normals to position, see
//						 on-screen the direction for each individual face's normal vector )
//
// 		b)--Add a 'normal matrix' transform; be sure to do all needed setup in 
//	your JavaScript program and in your your GLSL shader programs. You will need 
//	to use those shaders to compute the dot-product of :
//      -- the unit-length surface normal vector N (unit-length? CAREFUL! if you 
//			transformed that normal vector you may have changed its maginitude).
//      --a lighting direction vector (or just use world-space '+Z' axis).
//
//		c)--In the shader(s), use the dot-product result as a weight for the 
// 	vertex color, yielding simple diffuse shading. CAREFUL! dot-products can have
//	negative results, but we need a result restricted to stay within 0 to +1. 
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +

  'attribute vec4 a_Position;\n' +
  'attribute vec3 a_Color;\n' +
  'attribute vec3 a_Normal;\n' +

  'varying vec4 v_Color;\n' +

  'void main() {\n' +
  'vec4 transVec = u_NormalMatrix * vec4(a_Normal, 0.0);\n' +
  'vec3 normVec = normalize(transVec.xyz);\n' +
  'vec3 lightVec = vec3(0.0, 0.0, -1.0);\n' +				
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  v_Color = vec4(0.3*a_Color + 0.7*dot(normVec,lightVec), 1.0);\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables for the spinning tetrahedron:
var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)
var floatsPerVertex = 10; 

var ANGLE_STEP = 45.0;  
var floatsPerVertex = 10; // # of Float32Array elements used for each vertex
var xNewPoint=0.0;
var yNewPoint=0.0;                          // (x,y,z)position + (r,g,b)color
var MOVE_STEP = 0.15;
var LOOK_STEP = 0.02;
var PHI_NOW = 0;
var THETA_NOW = 0;
var LAST_UPDATE = -1;
// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var Angle_sphere = 0.0;
var moon_angle = 0.0;
var leg_angle = 0.0;
var ANGLE_STEP1 = 45;
var ANGLE_STEP2 = 90;

var g_last = Date.now();
var g_last_sphere = Date.now();
var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();				// rotation matrix, made from latest qTot

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Initialize a Vertex Buffer in the graphics system to hold our vertices
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
	// Register the Mouse & Keyboard Event-handlers-------------------------------
	// If users press any keys on the keyboard or move, click or drag the mouse,
	// the operating system records them as 'events' (small text strings that 
	// can trigger calls to functions within running programs). JavaScript 
	// programs running within HTML webpages can respond to these 'events' if we:
	//		1) write an 'event handler' function (called when event happens) and
	//		2) 'register' that function--connect it to the desired HTML page event. //
	// Here's how to 'register' all mouse events found within our HTML-5 canvas:
  
  					// NOTE! 'onclick' event is SAME as on 'mouseup' event
  					// in Chrome Brower on MS Windows 7, and possibly other 
  					// operating systems; thus I use 'mouseup' instead.
  
	// END Mouse & Keyboard Event-Handlers-----------------------------------
	window.addEventListener("keydown", myKeyDown, false);
  // window.addEventListener("keyup", myKeyUp, false);
  // window.addEventListener("keypress", myKeyPress, false);
  // Specify the color for clearing <canvas>
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST); 
	
	// Create 'Uniform' vars to send to GPU----------------------------------
  // Get handle to graphics system's storage location for u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get GPU storage location for u_ModelMatrix');
    return;
  }
  // Create our JavaScript 'model' matrix (we send its values to GPU)
  var modelMatrix = new Matrix4();
  //------------------------------------------------------------------
	// Get handle to graphics systems' storage location for u_NormalMatrix
	var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
	if(!u_NormalMatrix) {
		console.log('Failed to get GPU storage location for u_NormalMatrix');
		return
	}
	// Create our JavaScript 'normal' matrix (we send its values to GPU
	var normalMatrix = new Matrix4();
	// (holds inverse-transpose of 'model' matrix.  Transform vertex positions
	// in VBO by 'model' matrix to convert to 'world' coordinates, and 
	// transform surface normal vectors by 'normal' matrix to convert to 'world').
	//------------------------------------------------------------------
	
  // Create, init current rotation angle value in JavaScript
  var currentAngle = 0.0;
  
//====================================
	// testQuaternions();		// test fcn at end of file
//=====================================

  // ANIMATION: create 'tick' variable whose value is this function:
  //----------------- 
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    leg_angle = animate_for_leg(leg_angle);
    Angle_sphere = animate_for_sphere(Angle_sphere);
    moon_angle = animate_for_moon(moon_angle);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var nuCanvas = document.getElementById('webgl');  // get current canvas
    var nuGL = getWebGLContext(nuCanvas); 
    nuCanvas.width = innerWidth;
    nuCanvas.height = innerHeight*3/4; 
    gl.viewport(0, 0, nuCanvas.width/2, nuCanvas.height);
    modelMatrix.setPerspective(35.0, nuCanvas.width/2/nuCanvas.height, +1.0, +100.0); 
    modelMatrix.lookAt(g_EyeX, g_EyeY, 4 + g_EyeZ, //eye location 
               g_LookX, g_LookY, g_LookZ,//look-at point
               0.0, 1.0, 0.0);
    draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);   // Draw shapes


    gl.viewport(nuCanvas.width/2, 0, nuCanvas.width/2, nuCanvas.height);
    modelMatrix.setOrtho(-10.4*nuCanvas.width/2/nuCanvas.height, 10.4*nuCanvas.width/2/nuCanvas.height, 
                         -10, 10, 1, 100);
    modelMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ, //eye location 
               g_LookX, g_LookY, g_LookZ,//look-at point
               0.0, 1.0, 0.0);
    draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);   // Draw shapes

//    console.log('currentAngle=',currentAngle); // put text in console.
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
    									// (causes webpage to endlessly re-draw itself)
  };
  tick();							// start (and continue) animation: draw current image
	
}

function initVertexBuffer(gl) {
//==============================================================================
	var c30 = Math.sqrt(0.75);          // == cos(30deg) == sqrt(3) / 2
  var sq2 = Math.sqrt(2.0);            
  // for surface normals:
  var sq12 = Math.sqrt(1.0/2.0);
  var sq23 = Math.sqrt(2.0/3.0);
  var sq29 = Math.sqrt(2.0/9.0);
  var sq89 = Math.sqrt(8.0/9.0);
  var thrd = 1.0/3.0;            
  makeSphere();
  makeTorus();
  makeGroundGrid();
  var axe_box = new Float32Array([
    0.0,  0.0,  0.0, 1.0,    1.0, 0.0, 0.0,  3.00,-0.87,1.74,         //origion
    10.0,  0.0,  0.0, 1.0,    1.0, 0.0, 0.0, 3.00,-0.87,1.74,         //x

    0.0,  0.0,  0.0, 1.0,    0.0, 1.0, 2.0,  3.00,-0.87,1.74,         //origion
    0.0,  10.0,  0.0, 1.0,    0.0, 1.0, 2.0, 3.00,-0.87,1.74,         //y

    0.0,  0.0,  0.0, 1.0,    0.0, 0.0, 1.0,  3.00,-0.87,1.74,         //origion
    0.0,  0.0,  10.0, 1.0,    0.0, 0.0, 1.0, 3.00,-0.87,1.74,         //z

    ]);
  var box_tri = new Float32Array([
     // Node 0 (apex, +z axis;      color--blue,        surf normal (all verts):
          // Node 0 (apex, +z axis;       color--blue,        surf normal (all verts):
          0.0,   0.0, sq2, 1.0,     0.0,  0.0,  1.0,     sq23,  sq29, thrd,
     // Node 1 (base: lower rt; red)
          c30, -0.5, 0.0, 1.0,      1.0,  0.0,  0.0,    sq23, sq29, thrd,
     // Node 2 (base: +y axis;  grn)
          0.0,  1.0, 0.0, 1.0,      0.0,  1.0,  0.0,    sq23, sq29, thrd, 
// Face 1: (left side).   Unit Normal Vector: N1 = (-sq23, sq29, thrd)
     // Node 0 (apex, +z axis;  blue)
          0.0,   0.0, sq2, 1.0,     0.0,  0.0,  1.0,   -sq23, sq29, thrd,
     // Node 2 (base: +y axis;  grn)
          0.0,  1.0, 0.0, 1.0,      0.0,  1.0,  0.0,   -sq23, sq29, thrd,
     // Node 3 (base:lower lft; white)
          -c30, -0.5, 0.0, 1.0,     1.0,  1.0,  1.0,   -sq23, sq29, thrd,
// Face 2: (lower side)   Unit Normal Vector: N2 = (0.0, -sq89, thrd)
     // Node 0 (apex, +z axis;  blue) 
          0.0,   0.0, sq2, 1.0,     0.0,  0.0,  1.0,    0.0, -sq89, thrd,
    // Node 3 (base:lower lft; white)
          -c30, -0.5, 0.0, 1.0,     1.0,  1.0,  1.0,    0.0, -sq89, thrd,                                                       //0.0, 0.0, 0.0, // Normals debug
     // Node 1 (base: lower rt; red) 
          c30, -0.5, 0.0, 1.0,      1.0,  0.0,  0.0,    0.0, -sq89, thrd,
// Face 3: (base side)  Unit Normal Vector: N2 = (0.0, 0.0, -1.0)
    // Node 3 (base:lower lft; white)
          -c30, -0.5, 0.0, 1.0,     1.0,  1.0,  1.0,    0.0,  0.0, -1.0,
    // Node 2 (base: +y axis;  grn)
          0.0,  1.0, 0.0, 1.0,      0.0,  1.0,  0.0,    0.0,  0.0, -1.0,
    // Node 1 (base: lower rt; red)
          c30, -0.5, 0.0, 1.0,      1.0,  0.0,  0.0,    0.0,  0.0, -1.0,
     
      // Drawing Axes: Draw them using gl.LINES drawing primitive;
      //--------------------------------------------------------------
      // +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
      // (I added 'normal vectors' to stay compatible with tetrahedron verts)
// X axis line  (origin: gray -- endpoint: red.       Normal Vector: +y
     0.0,  0.0,  0.0, 1.0,      0.3,  0.3,  0.3,      0.0,  1.0,  0.0, 
     1.3,  0.0,  0.0, 1.0,      1.0,  0.3,  0.3,      0.0,  1.0,  0.0,
// Y axis line: (origin: gray -- endpoint: green      Normal Vector: +z)
     0.0,  0.0,  0.0, 1.0,      0.3,  0.3,  0.3,      0.0,  0.0,  1.0,
     0.0,  1.3,  0.0, 1.0,      0.3,  1.0,  0.3,      0.0,  0.0,  1.0,
// Z axis line: (origin: gray -- endpoint: blue       Normal Vector: +x)
     0.0,  0.0,  0.0, 1.0,      0.3,  0.3,  0.3,      1.0,  0.0,  0.0,
     0.0,  0.0,  1.3, 1.0,      0.3,  0.3,  1.0,      1.0,  0.0,  0.0,
     ]);
  var box = new Float32Array([
  // Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
  //    Apex on +z axis; equilateral triangle base at z=0


    // +x face: RED
     2.0,  0.0,  0.0, 1.0,    1.0, 0.0, 0.0,  1,0,0,// Node 3
     2.0,  2.0,  0.0, 1.0,    1.0, 0.0, 0.0,  1,0,0,// Node 2
     2.0,  2.0,  2.0, 1.0,    1.0, 0.0, 0.0,  1,0,0,// Node 4
     
     2.0,  2.0,  2.0, 1.0,    1.0, 0.0, 0.0,  1,0,0,// Node 4
     2.0,  0.0,  2.0, 1.0,    1.0, 0.0, 0.0,  1,0,0,// Node 7
     2.0,  0.0,  0.0, 1.0,    1.0, 0.0, 0.0,  1,0,0,// Node 3

    // +y face: GREEN
     0.0,  2.0,  0.0, 1.0,    0.0, 1.0, 0.0,  0,1,0,// Node 1
     0.0,  2.0,  2.0, 1.0,    0.0, 1.0, 0.0,  0,1,0,// Node 5
     2.0,  2.0,  2.0, 1.0,    0.0, 1.0, 0.0,  0,1,0,// Node 4

     2.0,  2.0,  2.0, 1.0,    0.0, 1.0, 0.0,  0,1,0,// Node 4
     2.0,  2.0,  0.0, 1.0,    0.0, 1.0, 0.0,  0,1,0,// Node 2 
     0.0,  2.0,  0.0, 1.0,    0.0, 1.0, 0.0,  0,1,0,// Node 1

    // +z face: BLUE
     0.0,  2.0,  2.0, 1.0,    0.0, 0.0, 1.0,  0,0,1,// Node 5
     0.0,  0.0,  2.0, 1.0,    0.0, 0.0, 1.0,  0,0,1,// Node 6
     2.0,  0.0,  2.0, 1.0,    0.0, 0.0, 1.0,  0,0,1,// Node 7

     2.0,  0.0,  2.0, 1.0,    0.0, 0.0, 1.0,  0,0,1,// Node 7
     2.0,  2.0,  2.0, 1.0,    0.0, 0.0, 1.0,  0,0,1,// Node 4
     0.0,  2.0,  2.0, 1.0,    0.0, 0.0, 1.0,  0,0,1,// Node 5

    // -x face: CYAN
     0.0,  0.0,  2.0, 1.0,    1.0, 0.0, 0.0,  -1.0,0.0,0.0,// Node 6 
     0.0,  2.0,  2.0, 1.0,    1.0, 0.0, 0.0,  -1.0,0.0,0.0,// Node 5 
     0.0,  2.0,  0.0, 1.0,    1.0, 0.0, 0.0,  -1.0,0.0,0.0,// Node 1
    
     0.0,  2.0,  0.0, 1.0,    1.0, 0.0, 0.0,  -1.0,0.0,0.0,// Node 1
     0.0,  0.0,  0.0, 1.0,    1.0, 0.0, 0.0,  -1.0,0.0,0.0,// Node 0  
     0.0,  0.0,  2.0, 1.0,    1.0, 0.0, 0.0,  -1.0,0.0,0.0,// Node 6  
    
    // -y face: MAGENTA
     2.0,  0.0,  0.0, 1.0,    0.0, 1.0, 0.0,  0.0,-1.0,0.0,// Node 3
     2.0,  0.0,  2.0, 1.0,    0.0, 1.0, 0.0,  0.0,-1.0,0.0,// Node 7
     0.0,  0.0,  2.0, 1.0,    0.0, 1.0, 0.0,  0.0,-1.0,0.0,// Node 6

     0.0,  0.0,  2.0, 1.0,    0.0, 1.0, 0.0,  0.0,-1.0,0.0,// Node 6
     0.0,  0.0,  0.0, 1.0,    0.0, 1.0, 0.0,  0.0,-1.0,0.0,// Node 0
     2.0,  0.0,  0.0, 1.0,    0.0, 1.0, 0.0,  0.0,-1.0,0.0,// Node 3

     // -z face: YELLOW
     2.0,  2.0,  0.0, 1.0,    0.0, 0.0, 1.0,  0.0,0.0,-1.0,// Node 2
     2.0,  0.0,  0.0, 1.0,    0.0, 0.0, 1.0,  0.0,0.0,-1.0,// Node 3
     0.0,  0.0,  0.0, 1.0,    0.0, 0.0, 1.0,  0.0,0.0,-1.0,// Node 0   

     0.0,  0.0,  0.0, 1.0,    0.0, 0.0, 1.0,  0.0,0.0,-1.0,// Node 0
     0.0,  2.0,  0.0, 1.0,    0.0, 0.0, 1.0,  0.0,0.0,-1.0,// Node 1
     2.0,  2.0,  0.0, 1.0,    0.0, 0.0, 1.0,  0.0,0.0,-1.0,// Node 2

     

 
  ]);
  

  var siz = box.length + sphVerts.length + box_tri.length 
          + gndVerts.length + axe_box.length + torVerts.length;
  var colorShapes = new Float32Array(siz);
  recStart = 0;
  for(i=0,j=0; j< box.length; i++,j++) {
    colorShapes[i] = box[j];
    }
  sphStart = i;
  for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
    colorShapes[i] = sphVerts[j];
    }
  triStart = i;
  for(j=0; j< box_tri.length; i++, j++) {// don't initialize i -- reuse it!
    colorShapes[i] = box_tri[j];
    }
    gndStart = i;
  for(j=0; j< gndVerts.length; i++, j++) {
    colorShapes[i] = gndVerts[j];
    }
    axeStart = i;
  for(j=0; j< axe_box.length; i++, j++) {
    colorShapes[i] = axe_box[j];
  }
    torusStart = i;
  for(j=0; j< torVerts.length; i++, j++){
    colorShapes[i] = torVerts[i];
  }
  var nn = siz/10;    // 12 tetrahedron vertices; 36 cube verts (6 per side*6 sides)
  
  console.log(colorShapes.length);
  //var nn = 18;		// 12 tetrahedron vertices, +  6 vertices for 'coord axes'.
  								// we can also draw any subset of verts we may want,
  								// such as the last 2 tetra faces.(onscreen at upper right)
	
  // Create a buffer object to hold these vertices inside the graphics system
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
  // gl.STATIC_DRAW?  a 'usage hint' for OpenGL/WebGL memory usage: says we 
  // won't change these stored buffer values, and use them solely for drawing.

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * 10, 	// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's normal-vec-input variable;
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Normal, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using x,y,z)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  	FSIZE * 7);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w,r,g,b
  									
  gl.enableVertexAttribArray(a_Normal);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}
var g_EyeX = 0.0, g_EyeY = 0.0, g_EyeZ = 4.25; 
 // Eye position
var g_LookX =0.00, g_LookY = 0.00, g_LookZ = 0.00; // look at potin change
function draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
//==============================================================================
  //torus
  
  //swimming robot
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-60, 1, 1, 0);
    modelMatrix.rotate(currentAngle, 0, 1, 0);
    modelMatrix.scale(0.3, 0.3, 0.3);
    modelMatrix.translate(5, 0 ,0);
    // ViewMatrNix.rotate(Angle_sphere, 0, 0, 0);
                // Make it smaller:
    modelMatrix.rotate(0, 0, 0, 1);  // Spin on XY diagonal axis
    modelMatrix.translate(-1, -1, -1);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, modelMatrix.elements);
        // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
    gl.drawArrays(gl.TRIANGLES, recStart,36);

    pushMatrix(modelMatrix);
    /////////
      modelMatrix.translate(0.5, 0, 1);
      modelMatrix.rotate(180, 1, 0, 0);
      modelMatrix.rotate(currentAngle*0.15+20, 1, 0, 0);
      modelMatrix.scale(0.2, 1, 0.2);
      // modelMatrix.translate(-1, 0, -1);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
          // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
      gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
    //draw the first calf
    //the 
    //first
    ///calf
      modelMatrix.scale(5, 1, 5);
      modelMatrix.translate(0, 2, 0);
      modelMatrix.rotate(leg_angle*0.2, 1, 0, 0);
      // modelMatrix.translate(0.5, 0, 0.5);
      modelMatrix.scale(0.1, 1, 0.1);
      modelMatrix.translate(1, 0, 1);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      //     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
      gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);

      // draw
      // a
      // foot
      modelMatrix.scale(10, 1, 10);
      modelMatrix.translate(0, 2, 0);
      
      modelMatrix.rotate(10, 0, 1, 0);
      
      modelMatrix.scale(0.1, 0.1, 0.3);
      modelMatrix.translate(0.1, 0, 0.1);
      
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      //     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
      gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);

    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
      modelMatrix.translate(1.5, 0, 1);
      modelMatrix.rotate(180, 1, 0, 0);
      modelMatrix.rotate(-currentAngle*0.15+20, 1, 0, 0);
      modelMatrix.scale(0.2, 1, 0.2);
      // modelMatrix.translate(-1, 0, -1);
      normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
          // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
      gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
      //
      //another 
      //calf
      modelMatrix.scale(5, 1, 5);
      modelMatrix.translate(0, 2, 0);
      modelMatrix.rotate(-leg_angle*0.2, 1, 0, 0);
      // modelMatrix.translate(0.5, 0, 0.5);
      modelMatrix.scale(0.1, 1, 0.1);
      modelMatrix.translate(1, 0, 1);
      normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      //     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
      gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);

      //another
      //foot
      // modelMatrix = popMatrix();

      modelMatrix.scale(10, 1, 10);
      modelMatrix.translate(0, 2, 0);
      modelMatrix.rotate(10, 0, 1, 0);
      modelMatrix.scale(0.1, 0.1, 0.3);
      modelMatrix.translate(0.1, 0, 0.1);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      //     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
      gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
    modelMatrix = popMatrix();
  modelMatrix = popMatrix();

  //tri
for(l = 0; l < 10; l++){
  pushMatrix(modelMatrix);
  //-------Create Spinning Tetrahedron-----------------------------------------
    // (Projection and View matrices, if you had them, would go here)
    modelMatrix.translate(-0.4+l,-0.4+l, 0.0);  // 'set' means DISCARD old matrix,			
    modelMatrix.scale(1,1,-1);							// convert to left-handed csys
    modelMatrix.scale(0.5, 0.5, 0.5);
    modelMatrix.rotate(currentAngle, 0, 1, 0);  // spin drawing axes on Y axis;
  	//Find inverse transpose of modelMatrix:
  	normalMatrix.setInverseOf(modelMatrix);
  	normalMatrix.transpose();
  	
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    		// Pass our current Normal matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_NormalMatrix, false, modelMatrix.elements);
    		// Draw triangles: start at vertex 0 and draw 12 vertices
    gl.drawArrays(gl.TRIANGLES, triStart/floatsPerVertex, 12);

  modelMatrix = popMatrix();
}
for(l = 1; l < 10; l++){
  pushMatrix(modelMatrix);
  //-------Create Spinning Tetrahedron-----------------------------------------
    // (Projection and View matrices, if you had them, would go here)
    modelMatrix.translate(-0.4-l,+0.4-l, 0.0);  // 'set' means DISCARD old matrix,      
    modelMatrix.scale(1,1,-1);              // convert to left-handed csys
    modelMatrix.scale(0.5, 0.5, 0.5);
    modelMatrix.rotate(currentAngle, 0, 1, 0);  // spin drawing axes on Y axis;
    //Find inverse transpose of modelMatrix:
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        // Pass our current Normal matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_NormalMatrix, false, modelMatrix.elements);
        // Draw triangles: start at vertex 0 and draw 12 vertices
    gl.drawArrays(gl.TRIANGLES, triStart/floatsPerVertex, 12);

  modelMatrix = popMatrix();
}



 
////grid ground
  pushMatrix(modelMatrix);
    modelMatrix.translate( 0.4, -0.4, 0.0); 
    modelMatrix.scale(0.1, 0.1, 0.1);       // shrink by 10X:
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES,                 // use this drawing primitive, and
                  gndStart/floatsPerVertex, // start at this vertex number, and
                  gndVerts.length/floatsPerVertex); // draw this many vertices.
  modelMatrix = popMatrix();

  // planet system
  pushMatrix(modelMatrix);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4 + xNewPoint, 0 + yNewPoint, 0);
    modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
    modelMatrix.scale(0.2, 0.2, 0.2);
                // Make it smaller:
    // modelMatrix.rotate(currentAngle, 1, 1, 1);
    modelMatrix.rotate(Angle_sphere, 0, 1, 0);  // Spin on XY diagonal axis
    // modelMatrix.translate(2, 0, 0);

    // Drawing:   
    // Pass our current matrix to the vertex shaders:
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        // Draw just the sphere's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  sphStart/floatsPerVertex, // start at this vertex number, and 
                  sphVerts.length/floatsPerVertex); // draw this many vertices.




  //============================
  //balls  BALL ONE
  //============================
  modelMatrix.scale(5, 5, 5);
  modelMatrix.translate(0, 0, 0.0); // 'set' means DISCARD old matrix,
                // (drawing axes centered in CVV), and then make new
                // drawing axes moved to the lower-left corner of CVV.
    modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                            // to match WebGL display canvas.
    modelMatrix.scale(0.1, 0.1, 0.1);
                // Make it smaller:
    modelMatrix.rotate(Angle_sphere, 1, 0, 0);  // Spin on XY diagonal axis
    modelMatrix.translate(6,0,0);
    // modelMatrix.rotate(currentAngle, 1, 0, 1);
    // Drawing:   
    // Pass our current matrix to the vertex shaders:
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        // Draw just the sphere's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  sphStart/floatsPerVertex, // start at this vertex number, and 
                  sphVerts.length/floatsPerVertex); // draw this many vertices.

    modelMatrix = popMatrix();

  //BALL Two
  ////////
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4 + xNewPoint, 0 + yNewPoint, 0);
    modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
    modelMatrix.scale(0.075, 0.075, 0.075);
                // Make it smaller:
    // modelMatrix.rotate(currentAngle, 1, 1, 1);
    modelMatrix.rotate(-Angle_sphere, 1, 0, 0);  // Spin on XY diagonal axis
    modelMatrix.translate(0, 5, 0);
    // modelMatrix.translate(2, 0, 0);

    // Drawing:   
    // Pass our current matrix to the vertex shaders:
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        // Draw just the sphere's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  sphStart/floatsPerVertex, // start at this vertex number, and 
                  sphVerts.length/floatsPerVertex); // draw this many vertices.

    modelMatrix = popMatrix();
  //==============================
  //
  //BALL THREE
  //==============================

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4 + xNewPoint, 0 + yNewPoint, 0);
    modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
    modelMatrix.scale(0.05, 0.05, 0.05);
                // Make it smaller:
    // modelMatrix.rotate(currentAngle, 1, 1, 1);
    modelMatrix.rotate(Angle_sphere, 1, 1, 0);  // Spin on XY diagonal axis
    modelMatrix.translate(0, 0, 6);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        // Draw just the sphere's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                  sphStart/floatsPerVertex, // start at this vertex number, and 
                  sphVerts.length/floatsPerVertex); // draw this many vertices.

    modelMatrix = popMatrix();
      //====================================
      //=========strip to support sphere======
      //====================================

      //
      //      BALL ONE
      //
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4 + xNewPoint, 0 + yNewPoint, 0);  
    modelMatrix.scale(1,1,-1); 
    modelMatrix.rotate(Angle_sphere, 0, 1, 0);
    modelMatrix.scale(0.3, 0.015, 0.015);
    modelMatrix.translate(0.8, 0 ,0);

    modelMatrix.rotate(0, 0, 0, 1);  // Spin on XY diagonal axis
    modelMatrix.translate(-1, -1, -1);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
    gl.drawArrays(gl.TRIANGLES, recStart,36);

    modelMatrix = popMatrix();
      //=======================================
      //
      //strip for ball two
      //
      //=======================================
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4 + xNewPoint, 0 + yNewPoint, 0);
    modelMatrix.scale(1,1,-1); 
    modelMatrix.rotate(Angle_sphere - 90, -1, 0, 0);
    modelMatrix.scale(0.01125, 0.01125, 0.2);
    modelMatrix.translate(0, 0 ,-0.6);
    modelMatrix.rotate(0, 0, 0, 1);  // Spin on XY diagonal axis
    modelMatrix.translate(-1, -1, -1); 
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);


        // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
    gl.drawArrays(gl.TRIANGLES, recStart,36);

    modelMatrix = popMatrix();

    //===================================
    //
    //
    //strip for ball three
    //
    //===================================
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4 + xNewPoint, 0 + yNewPoint, 0);  // 'set' means DISCARD old matrix,
                // (drawing axes centered in CVV), and then make new
                // drawing axes moved to the lower-left corner of CVV.
    modelMatrix.scale(1,1,-1); 
    modelMatrix.rotate(Angle_sphere, 1, 1, 0);
    modelMatrix.scale(0.0075, 0.0075, 0.15);
    // modelMatrix.scale(0.01125, 0.01125, 0.2);
    modelMatrix.translate(0, 0, 0.6);
    // modelMatrix.rotate(Angle_sphere, 0, 0, 0);
                // Make it smaller:
    modelMatrix.rotate(-Angle_sphere, 0, 0, 1);  // Spin on XY diagonal axis
    modelMatrix.translate(-1, -1, -1); 
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
    gl.drawArrays(gl.TRIANGLES, recStart,36);

    modelMatrix = popMatrix();
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
      pushMatrix(modelMatrix);
      modelMatrix.translate(0.0, 0.0, 0.0);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.drawArrays(gl.LINES,                 // use this drawing primitive, and
                  axeStart/floatsPerVertex, // start at this vertex number, and
                  6); // draw this many vertices.

    modelMatrix = popMatrix();

    /////////////////
    ////////////////
    ////////////////
    pushMatrix(modelMatrix);
    modelMatrix.translate(10.0, 10.0, 0.0);
    modelMatrix = popMatrix();

}

// Record the last time we called 'animate()':  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  if(newAngle > 180.0) newAngle = newAngle - 360.0;
  if(newAngle <-180.0) newAngle = newAngle + 360.0;
  return newAngle;
}
function animate_for_leg(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
 if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}
function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

  var xcount = 500;     // # of lines to draw in x,y to make the grid.
  var ycount = 500;   
  var xymax = 300.0;     // grid size; extends to cover +/-xymax in x and y.
  var xColr = new Float32Array([0.5, 3.0, 0.5]);  // bright yellow
  var yColr = new Float32Array([0.5, 3.0, 0.5]);  // bright green.
  
  // Create an (global) array to hold this ground-plane's vertices:
  gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = 2*xymax/(xcount-1);    // HALF-spacing between lines in x,y;
  var ygap = 2*xymax/(ycount-1);    // (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
    if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;  // x
      gndVerts[j+1] = -xymax;               // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    else {        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
      gndVerts[j+1] = xymax;                // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    gndVerts[j+4] = xColr[0];     // red
    gndVerts[j+5] = xColr[1];     // grn
    gndVerts[j+6] = xColr[2];     // blu
    gndVerts[j+7] = Math.sqrt(2)/2;
    gndVerts[j+8] = Math.sqrt(2)/2;
    gndVerts[j+9] = 0.0;
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
    if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;               // x
      gndVerts[j+1] = -xymax + (v  )*ygap;  // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    else {          // put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;                // x
      gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
      gndVerts[j+2] = 0.0;                  // z
      gndVerts[j+3] = 1.0;                  // w.
    }
    gndVerts[j+4] = yColr[0];     // red
    gndVerts[j+5] = yColr[1];     // grn
    gndVerts[j+6] = yColr[2];     // blu
    gndVerts[j+7] = Math.sqrt(2)/2;
    gndVerts[j+8] = Math.sqrt(2)/2;
    gndVerts[j+9] = 0.0;
  }
}
function makeTorus() {
//ral' along the length of the bent bar; successive rings of constant-theta, using the same design used for cylinder walls in 'makeCyl()' and for 'slices' in makeSphere().  Unlike the cylinder and sphere, we have no 'special case' for the first and last of these bar-encircling rings.
//
var rbend = 1.0;                    // Radius of circle formed by torus' bent bar
var rbar = 0.5;                     // radius of the bar we bent to form torus
var barSlices = 23;                 // # of bar-segments in the torus: >=3 req'd;
                                    // more segments for more-circular torus
var barSides = 13;                    // # of sides of the bar (and thus the 
                                    // number of vertices in its cross-section)
                                    // >=3 req'd;
                                    // more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//      --choose odd or prime#  for barSides, and
//      --choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

  // Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
//  Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;                   // begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;  // theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;   // half-phi angle between each side of bar
                                      // (WHY HALF? 2 vertices per step in phi)
  // s counts slices of the bar; v counts vertices within one slice; j counts
  // array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
  for(s=0,j=0; s<barSlices; s++) {    // for each 'slice' or 'ring' of the torus:
    for(v=0; v< 2*barSides; v++, j+=7) {    // for each vertex in this slice:
      if(v%2==0)  { // even #'d vertices at bottom of slice,
        torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
                                             Math.cos((s)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
                                             Math.sin((s)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
                //  z = -rbar  *   sin(phi)
        torVerts[j+3] = 1.0;    // w
      }
      else {        // odd #'d vertices at top of slice (s+1);
                    // at same phi used at bottom of slice (v-1)
        torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
                                             Math.cos((s+1)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
                                             Math.sin((s+1)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
                //  z = -rbar  *   sin(phi)
        torVerts[j+3] = 1.0;    // w
      }
      torVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      torVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      torVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
      torVerts[j+7] = 1.0;
      torVerts[j+8] = 0.0;
      torVerts[j+9] = 0.0;
    }
  }
  // Repeat the 1st 2 vertices of the triangle strip to complete the torus:
      torVerts[j  ] = rbend + rbar; // copy vertex zero;
              //  x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
      torVerts[j+1] = 0.0;
              //  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
      torVerts[j+2] = 0.0;
              //  z = -rbar  *   sin(phi==0)
      torVerts[j+3] = 1.0;    // w
      torVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      torVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      torVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
      torVerts[j+7] = 1.0;
      torVerts[j+8] = 0.0;
      torVerts[j+9] = 0.0;
      j+=7; // go to next vertex:
      torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
              //  x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
      torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
              //  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
      torVerts[j+2] = 0.0;
              //  z = -rbar  *   sin(phi==0)
      torVerts[j+3] = 1.0;    // w
      torVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      torVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      torVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
      torVerts[j+7] = 1.0;
      torVerts[j+8] = 0.0;
      torVerts[j+9] = 0.0;
}
function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);  // North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);  // Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        sphVerts[j+2] = cos0;   
        sphVerts[j+3] = 1.0;      
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        sphVerts[j+2] = cos1;                                       // z
        sphVerts[j+3] = 1.0;                                        // w.   
      }
      if(s==0) {  // finally, set some interesting colors for vertices:
        sphVerts[j+4]= 
        [0]; 
        sphVerts[j+5]=topColr[1]; 
        sphVerts[j+6]=topColr[2]; 
        }
      else if(s==slices-1) {
        sphVerts[j+4]=botColr[0]; 
        sphVerts[j+5]=botColr[1]; 
        sphVerts[j+6]=botColr[2]; 
      }
      else {
          sphVerts[j+4]=Math.random();// equColr[0]; 
          sphVerts[j+5]=Math.random();// equColr[1]; 
          sphVerts[j+6]=Math.random();// equColr[2];          
      }
      sphVerts[j+7] = sphVerts[j];
      sphVerts[j+8] = sphVerts[j+1];
      sphVerts[j+9] = sphVerts[j+2];
    }
  }
}
function drawResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

  var nuCanvas = document.getElementById('webgl');  // get current canvas
  var nuGL = getWebGLContext(nuCanvas);             // and context:

  //Report our current browser-window contents:

  console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);   
 console.log('Browser window: innerWidth,innerHeight=', 
                                innerWidth, innerHeight); // http://www.w3schools.com/jsref/obj_window.asp

  
  //Make canvas fill the top 3/4 of our browser window:
  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight*3/4;
  // IMPORTANT!  Need a fresh drawing in the re-sized viewports.
  // draw(nuGL);
  draw(nuGL, n, currentAngle, Angle_sphere,moon_angle, modelMatrix, u_ModelMatrix);       // draw in all viewports.
}
var MOVE_STEP = 0.15;
function myKeyDown(ev) {

  switch(ev.keyCode) {      // keycodes !=ASCII, but are very consistent for 
  //  nearly all non-alphanumeric keys for nearly all keyboards in all countries.
    case 32:
      runStop();
      console.log('press Space');
      break;
    case 37:    // left-arrow key
      { // left arrow - step left
        up = new Vector3();
        up[0] = 0;
        up[1] = 1;
        up[2] = 0;
        look = new Vector3();
        look = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookX, g_LookY, g_LookZ);

        tmpVec3 = new Vector3();
        tmpVec3 = vec3CrossProduct(up, look);

        //console.log(tmpVec3[0], tmpVec3[1], tmpVec3[2]);

        g_EyeX += MOVE_STEP * tmpVec3[0];
        g_EyeY += MOVE_STEP * tmpVec3[1];
        g_EyeZ += MOVE_STEP * tmpVec3[2];

        g_LookX += MOVE_STEP * tmpVec3[0];
        g_LookY += MOVE_STEP * tmpVec3[1];
        g_LookZ += MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookX, 'lookAtY=', g_LookY, 'lookAtZ=', g_LookZ);
    } 
      break;
    case 38:    // up-arrow key
      { // up arrow - step forward
        tmpVec3 = new Vector3();
        tmpVec3 = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookX, g_LookY, g_LookZ);
        
        g_EyeX += MOVE_STEP * tmpVec3[0];
        g_EyeY += MOVE_STEP * tmpVec3[1];
        g_EyeZ += MOVE_STEP * tmpVec3[2];

        g_LookX += MOVE_STEP * tmpVec3[0];
        g_LookY += MOVE_STEP * tmpVec3[1];
        g_LookZ += MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookX, 'lookAtY=', g_LookY, 'lookAtZ=', g_LookZ);

    } 
      break;
    case 39:    // right-arrow key
      up = new Vector3();
      up[0] = 0;
      up[1] = 1;
      up[2] = 0;
      look = new Vector3();
      look = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookX, g_LookY, g_LookZ);

      tmpVec3 = new Vector3();
      tmpVec3 = vec3CrossProduct(up, look);

      //console.log(tmpVec3[0], tmpVec3[1], tmpVec3[2]);

      g_EyeX -= MOVE_STEP * tmpVec3[0];
      g_EyeY -= MOVE_STEP * tmpVec3[1];
      g_EyeZ -= MOVE_STEP * tmpVec3[2];

      g_LookX -= MOVE_STEP * tmpVec3[0];
      g_LookY -= MOVE_STEP * tmpVec3[1];
      g_LookZ -= MOVE_STEP * tmpVec3[2];

      console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookX, 'lookAtY=', g_LookY, 'lookAtZ=', g_LookZ);
      break;
    case 40:    // down-arrow key
      { // down arrow - step backward
        tmpVec3 = new Vector3();
        tmpVec3 = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookX, g_LookY, g_LookZ);
        
        g_EyeX -= MOVE_STEP * tmpVec3[0];
        g_EyeY -= MOVE_STEP * tmpVec3[1];
        g_EyeZ -= MOVE_STEP * tmpVec3[2];

        g_LookX -= MOVE_STEP * tmpVec3[0];
        g_LookY -= MOVE_STEP * tmpVec3[1];
        g_LookZ -= MOVE_STEP * tmpVec3[2];

        console.log('eyeX=',g_EyeX, 'eyeY=', g_EyeY, 'eyeZ=', g_EyeZ, 'lookAtX=', g_LookX, 'lookAtY=', g_LookY, 'lookAtZ=', g_LookZ);
    }
      break;
    case 87: //w
      { //w - look up
        if (LAST_UPDATE==-1 || LAST_UPDATE==1)
        {  
          a = g_LookX - g_EyeX;
          b = g_LookY - g_EyeY;
          c = g_LookZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
          cos_theta = c / Math.sqrt(a*a + c*c);
          sin_theta = a / Math.sqrt(a*a + c*c);

          phi0 = Math.asin(b/l);

          PHI_NOW = phi0 + LOOK_STEP;
          LAST_UPDATE = 0;
        }
        else
        {
          PHI_NOW += LOOK_STEP;
        }

        g_LookY = l * Math.sin(PHI_NOW) + g_EyeY;
        g_LookX = l * Math.cos(PHI_NOW) * sin_theta + g_EyeX;
        g_LookZ = l * Math.cos(PHI_NOW) * cos_theta + g_EyeZ;
      }
      break;
    case 83://s
      { //s-look down
        if(LAST_UPDATE==-1 || LAST_UPDATE==1)
        { 
          a = g_LookX - g_EyeX;
          b = g_LookY - g_EyeY;
          c = g_LookZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
  
          cos_theta = c / Math.sqrt(a*a + c*c);
          sin_theta = a / Math.sqrt(a*a + c*c);

          phi0 = Math.asin(b/l);

          PHI_NOW = phi0 - LOOK_STEP;
          
          
          LAST_UPDATE = 0;
        }
        else
        {
          PHI_NOW -= LOOK_STEP;
        }

        g_LookY = l * Math.sin(PHI_NOW) + g_EyeY;
        g_LookX = l * Math.cos(PHI_NOW) * sin_theta + g_EyeX;
        g_LookZ = l * Math.cos(PHI_NOW) * cos_theta + g_EyeZ;
      }
      break;
    case 65: //a
      { // a - look left
      if(LAST_UPDATE==-1 || LAST_UPDATE==0)
        {
          a = g_LookX - g_EyeX;
          b = g_LookY - g_EyeY;
          c = g_LookZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
          
          lzx = Math.sqrt(a*a+c*c);
          sin_phi = lzx / l;

          theta0 = Math.PI -  Math.asin(a/lzx);

          THETA_NOW = theta0 + LOOK_STEP;
          
          LAST_UPDATE = 1;
        }
        else
        {
          THETA_NOW += LOOK_STEP;
        }

        g_LookY = b + g_EyeY;
        g_LookX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
        g_LookZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
    }
      break;
    case 68: //d
      {//d - look right
        if (LAST_UPDATE==-1 || LAST_UPDATE==0)
        {
          a = g_LookX - g_EyeX;
          b = g_LookY - g_EyeY;
          c = g_LookZ - g_EyeZ;
          l = Math.sqrt(a*a + b*b + c*c);
          lzx = Math.sqrt(a*a+c*c);
          sin_phi = lzx / l;

          theta0 = Math.PI -  Math.asin(a/lzx);

          THETA_NOW = theta0 - LOOK_STEP;
          
          LAST_UPDATE = 1;
        }
        else
        {
          THETA_NOW -= LOOK_STEP;
        }

        g_LookY = b + g_EyeY;
        g_LookX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
        g_LookZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
      }

      break;
    default:
      // console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
      // document.getElementById('Result').innerHTML =
      //   'myKeyDown()--keyCode='+ev.keyCode;
      break;
  }
}
function vec3FromEye2LookAt(eyeX, eyeY, eyeZ, lookAtX, lookAtY, lookAtZ)
{
  result = new Vector3();
  
  dx = lookAtX - eyeX;
  dy = lookAtY - eyeY;
  dz = lookAtZ - eyeZ;
  amp = Math.sqrt(dx*dx + dy*dy + dz*dz);

  result[0] = dx/amp;
  result[1] = dy/amp;
  result[2] = dz/amp;

  return result;
}

function vec3CrossProduct(up, look) //UpVec x LookVec --> Left Vec
{
  r = new Vector3();

  r[0] = up[1]*look[2] - up[2]*look[1];
  console.log('up1', up[1]);
  r[1] = up[2]*look[0] - up[0]*look[2];
  r[2] = up[0]*look[1] - up[1]*look[0];

  amp = Math.sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]) + 0.000001;

  r[0] /= amp;
  r[1] /= amp;
  r[2] /= amp;

  return r;
}
function animate_for_sphere(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last_sphere;
  g_last_sphere = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
 // if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 // if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP1 * elapsed) / 1000.0;
  return newAngle %= 360;
}
function animate_for_moon(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last_sphere;
  g_last_sphere = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
 // if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 // if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP2 * elapsed) / 1000.0;
  return newAngle %= 360;
}